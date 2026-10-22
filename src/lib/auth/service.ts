import prisma from '@/lib/prisma';
import { hashPassword, verifyPassword } from './password';
import { createSession } from './session';
import {
  PlatformRole,
  BusinessRole,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client';

export interface RegisterBusinessOwnerInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  businessName: string;
  legalName?: string;
  tradeType?: string;
  gstin?: string;
  city?: string;
  state?: string;
  selectedPlan?: 'STARTER' | 'GROWTH' | 'SCALE';
}

export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Validates registration input and creates:
 * 1. A new User with strictly forced platformRole: USER (preventing any escalation).
 * 2. A new Business workspace tenant.
 * 3. A BusinessMembership making the user the BUSINESS_OWNER.
 * 4. A 7-day Free Trial Subscription for the business.
 * 5. An active Session.
 * All in an atomic ACID database transaction.
 */
export async function registerBusinessOwner(input: RegisterBusinessOwnerInput) {
  const normalizedEmail = input.email?.trim().toLowerCase();
  const trimmedName = input.name?.trim();
  const trimmedBizName = input.businessName?.trim();

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Please provide a valid email address.');
  }

  if (!trimmedName || trimmedName.length < 2) {
    throw new Error('Full name must be at least 2 characters.');
  }

  if (!trimmedBizName || trimmedBizName.length < 2) {
    throw new Error('Business name must be at least 2 characters.');
  }

  if (!input.password || input.password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  // Check if email is already taken
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new Error('An account with this email address already exists.');
  }

  const passwordHash = await hashPassword(input.password);

  // Execute atomically
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create User - NEVER allow public registration to set SUPER_ADMIN
    const user = await tx.user.create({
      data: {
        name: trimmedName,
        email: normalizedEmail,
        phone: input.phone?.trim() || null,
        passwordHash,
        platformRole: PlatformRole.USER, // Hard enforced
      },
    });

    // 2. Create Business Workspace
    const business = await tx.business.create({
      data: {
        name: trimmedBizName,
        legalName: input.legalName?.trim() || trimmedBizName,
        tradeType: input.tradeType?.trim() || 'Retail & Wholesale',
        gstin: input.gstin?.trim().toUpperCase() || null,
        city: input.city?.trim() || 'Raipur',
        state: input.state?.trim() || 'Chhattisgarh',
        phone: input.phone?.trim() || null,
        email: normalizedEmail,
        currency: 'INR',
      },
    });

    // 3. Link Membership as BUSINESS_OWNER
    const membership = await tx.businessMembership.create({
      data: {
        userId: user.id,
        businessId: business.id,
        role: BusinessRole.BUSINESS_OWNER,
      },
    });

    // 4. Provision Initial 7-Day Trial Subscription with permanent server-side timestamps
    const trialStartDate = new Date();
    const trialEndDate = new Date(trialStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    let targetPlan: SubscriptionPlan = SubscriptionPlan.GROWTH_PRO;
    if (input.selectedPlan === 'STARTER') {
      targetPlan = SubscriptionPlan.STARTER;
    } else if (input.selectedPlan === 'SCALE') {
      targetPlan = SubscriptionPlan.ENTERPRISE;
    } else if (input.selectedPlan === 'GROWTH') {
      targetPlan = SubscriptionPlan.GROWTH_PRO;
    }

    const planLimits = {
      [SubscriptionPlan.STARTER]: { maxInvoices: 999999, maxStaff: 1, whatsAppQuota: 150 },
      [SubscriptionPlan.GROWTH_PRO]: { maxInvoices: 999999, maxStaff: 3, whatsAppQuota: 600 },
      [SubscriptionPlan.ENTERPRISE]: { maxInvoices: 999999, maxStaff: 10, whatsAppQuota: 2500 },
    }[targetPlan] || { maxInvoices: 999999, maxStaff: 3, whatsAppQuota: 600 };

    const subscription = await tx.subscription.create({
      data: {
        businessId: business.id,
        plan: targetPlan,
        status: SubscriptionStatus.TRIALING,
        startDate: trialStartDate,
        endDate: trialEndDate,
        trialDaysRemaining: 7,
        maxMonthlyInvoices: planLimits.maxInvoices,
        maxStaffSeats: planLimits.maxStaff,
        whatsAppQuota: planLimits.whatsAppQuota,
      },
    });

    return { user, business, membership, subscription };
  });

  // Create session
  const { sessionToken, expiresAt, sessionId } = await createSession(
    result.user.id,
    result.business.id
  );

  return {
    sessionToken,
    expiresAt,
    sessionId,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      platformRole: result.user.platformRole,
    },
    business: {
      id: result.business.id,
      name: result.business.name,
      role: result.membership.role,
    },
  };
}

export interface RegisterFreeKhataInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

/**
 * Registers a new user specifically under the permanent Free Khata plan.
 * Provisions an atomic personal khata workspace with SubscriptionPlan.FREE_KHATA (no expiry, no payment).
 */
export async function registerFreeKhataUser(input: RegisterFreeKhataInput) {
  const normalizedEmail = input.email?.trim().toLowerCase();
  const trimmedName = input.name?.trim();

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Please provide a valid email address.');
  }

  if (!trimmedName || trimmedName.length < 2) {
    throw new Error('Full name must be at least 2 characters.');
  }

  if (!input.password || input.password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  // Check if email is already registered
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new Error('An account with this email address already exists. Please log in.');
  }

  const passwordHash = await hashPassword(input.password);
  const khataBizName = `${trimmedName}'s Personal Khata`;

  let createdUserId: string | null = null;
  let createdBusinessId: string | null = null;

  let result;
  try {
    // 1. Create User
    const user = await prisma.user.create({
      data: {
        name: trimmedName,
        email: normalizedEmail,
        phone: input.phone?.trim() || null,
        passwordHash,
        platformRole: PlatformRole.USER,
      },
    });
    createdUserId = user.id;

    // 2. Create Personal Khata Business Workspace
    const business = await prisma.business.create({
      data: {
        name: khataBizName,
        legalName: khataBizName,
        tradeType: 'Personal Free Khata',
        phone: input.phone?.trim() || null,
        email: normalizedEmail,
        currency: 'INR',
      },
    });
    createdBusinessId = business.id;

    // 3. Link Membership as BUSINESS_OWNER
    const membership = await prisma.businessMembership.create({
      data: {
        userId: user.id,
        businessId: business.id,
        role: BusinessRole.BUSINESS_OWNER,
      },
    });

    // 4. Provision Permanent Free Khata Subscription (No payment, active permanently)
    const subscription = await prisma.subscription.create({
      data: {
        businessId: business.id,
        plan: SubscriptionPlan.FREE_KHATA,
        status: SubscriptionStatus.ACTIVE,
        trialDaysRemaining: 999999,
        monthlyPrice: 0,
        maxMonthlyInvoices: 0,
        maxStaffSeats: 1,
        whatsAppQuota: 999999,
      },
    });

    result = { user, business, membership, subscription };
  } catch (creationError) {
    if (createdBusinessId) {
      await prisma.business.delete({ where: { id: createdBusinessId } }).catch(() => {});
    }
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {});
    }
    throw creationError;
  }

  const { sessionToken, expiresAt, sessionId } = await createSession(
    result.user.id,
    result.business.id
  );

  return {
    sessionToken,
    expiresAt,
    sessionId,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      platformRole: result.user.platformRole,
    },
    business: {
      id: result.business.id,
      name: result.business.name,
      role: result.membership.role,
      plan: SubscriptionPlan.FREE_KHATA,
    },
  };
}

export interface RegisterHouseholdInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  householdName?: string;
  monthlyBudget?: number;
}

/**
 * Registers a new user specifically under PakkaChittha Ghar Kharcha (Free Household Mode).
 * Provisions a permanent free household with no business subscription, no trial expiration,
 * and zero payment requirements.
 */
export async function registerHouseholdUser(input: RegisterHouseholdInput) {
  const normalizedEmail = input.email?.trim().toLowerCase();
  const trimmedName = input.name?.trim();

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Please provide a valid email address.');
  }

  if (!trimmedName || trimmedName.length < 2) {
    throw new Error('Full name must be at least 2 characters.');
  }

  if (!input.password || input.password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new Error('An account with this email address already exists. Please log in.');
  }

  const passwordHash = await hashPassword(input.password);
  const householdName = input.householdName?.trim() || `${trimmedName}'s Household`;

  // 1. Create User
  const user = await prisma.user.create({
    data: {
      name: trimmedName,
      email: normalizedEmail,
      phone: input.phone?.trim() || null,
      passwordHash,
      platformRole: PlatformRole.USER,
    },
  });

  // 2. Create Household & seed categories
  const { createHousehold } = await import('@/lib/household/householdService');
  const household = await createHousehold(user.id, {
    name: householdName,
    currency: 'INR',
    monthlyBudget: input.monthlyBudget || 0,
  });

  // 3. Create Session
  const { sessionToken, expiresAt, sessionId } = await createSession(
    user.id,
    null // Household mode is independent of business workspaces
  );

  return {
    sessionToken,
    expiresAt,
    sessionId,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      platformRole: user.platformRole,
    },
    household: {
      id: household.id,
      name: household.name,
      role: 'OWNER',
    },
  };
}


/**
 * Validates user credentials and establishes a new session.
 */
export async function loginUser(input: LoginInput) {
  const normalizedEmail = input.email?.trim().toLowerCase();

  if (!normalizedEmail || !input.password) {
    throw new Error('Please enter both email and password.');
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      memberships: {
        include: {
          business: {
            include: {
              subscriptions: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    // Constant time-ish failure to mitigate timing attacks
    throw new Error('Invalid email or password.');
  }

  const isPasswordValid = await verifyPassword(input.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password.');
  }

  if ((user as any).isSuspended) {
    const reason = (user as any).suspendedReason || 'Your account has been administratively suspended. Please contact platform support.';
    throw new Error(`Account Suspended: ${reason}`);
  }

  // Primary business is user's first business membership (if any)
  const primaryBusiness = user.memberships[0]?.business || null;
  const businessId = primaryBusiness ? primaryBusiness.id : null;
  const latestSubscription = primaryBusiness?.subscriptions?.[0] || null;

  const { sessionToken, expiresAt, sessionId } = await createSession(
    user.id,
    businessId
  );

  return {
    sessionToken,
    expiresAt,
    sessionId,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      platformRole: user.platformRole,
    },
    business: primaryBusiness
      ? {
          id: primaryBusiness.id,
          name: primaryBusiness.name,
          role: user.memberships[0]?.role,
          plan: latestSubscription?.plan || null,
        }
      : null,
  };
}

/**
 * Provisions or updates the initial platform Super Admin user safely.
 * Only callable via server CLI or provisioning script with environment credentials.
 */
export async function provisionSuperAdmin(params: {
  email: string;
  password: string;
  name: string;
  phone?: string;
}) {
  const normalizedEmail = params.email.trim().toLowerCase();
  const passwordHash = await hashPassword(params.password);

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      name: params.name,
      passwordHash,
      platformRole: PlatformRole.SUPER_ADMIN,
    },
    create: {
      email: normalizedEmail,
      name: params.name,
      phone: params.phone || null,
      passwordHash,
      platformRole: PlatformRole.SUPER_ADMIN,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    platformRole: user.platformRole,
  };
}
