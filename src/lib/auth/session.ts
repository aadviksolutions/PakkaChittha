import { cookies, headers } from 'next/headers';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import {
  PlatformRole,
  BusinessRole,
  SubscriptionPlan,
  SubscriptionStatus,
  AccessScopeType,
} from '@prisma/client';
import { calculateSubscriptionTrialInfo } from '@/lib/subscription/trial';
import {
  ErpRole,
  PermissionCode,
  normalizeErpRole,
  resolveEffectivePermissions,
} from '@/lib/rbac/roles';

export const SESSION_COOKIE_NAME = 'lenden_session_token';
const SESSION_TTL_DAYS = 7;

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  platformRole: PlatformRole;
  isDemo?: boolean;
  preferredLanguage?: string;
  createdAt: Date;
}

export interface ActiveBranchSummary {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
  state: string | null;
}

export interface ActiveFinancialYearSummary {
  id: string;
  code: string;
  label: string;
  isClosed: boolean;
}

export interface ActiveAccountantScope {
  branchScope: AccessScopeType;
  branchIds: string[];
  fyScope: AccessScopeType;
  financialYears: string[];
  canApproveSensitive: boolean;
  canFileGst: boolean;
  grantedByUserId: string;
}

export interface ActiveBusinessWorkspace {
  id: string;
  name: string;
  legalName: string | null;
  tradeType: string | null;
  gstin: string | null;
  city: string | null;
  state: string | null;
  currency: string;
  role: BusinessRole;
  erpRole: ErpRole;
  permissions: PermissionCode[];
  activeBranchId: string | null;
  branches: ActiveBranchSummary[];
  financialYears: ActiveFinancialYearSummary[];
  accountantAccess: ActiveAccountantScope | null;
  logoUrl: string | null;
  isDemo?: boolean;
  subscription: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    trialDaysRemaining: number;
    isTrial?: boolean;
    isExpired?: boolean;
    displayText?: string;
    endDate?: Date | string | null;
  } | null;
}

export interface SessionMembershipSummary {
  businessId: string;
  businessName: string;
  role: BusinessRole;
  erpRole: ErpRole;
  plan?: SubscriptionPlan | null;
  branchScope?: AccessScopeType;
  fyScope?: AccessScopeType;
}

export interface CurrentAuthSession {
  sessionId: string;
  user: AuthenticatedUser;
  activeBusiness: ActiveBusinessWorkspace | null;
  memberships: SessionMembershipSummary[];
}

/**
 * Generates a cryptographically secure random 64-character hex token.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Creates a server-managed session in PostgreSQL and returns the token and expiry.
 */
export async function createSession(
  userId: string,
  businessId?: string | null
): Promise<{ sessionToken: string; expiresAt: Date; sessionId: string }> {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  const session = await prisma.session.create({
    data: {
      sessionToken,
      userId,
      businessId: businessId || null,
      expiresAt,
    },
  });

  return { sessionToken, expiresAt, sessionId: session.id };
}

export function buildActiveWorkspacePayload(params: {
  business: {
    id: string;
    name: string;
    legalName: string | null;
    tradeType: string | null;
    gstin: string | null;
    city: string | null;
    state: string | null;
    currency: string;
    logoUrl: string | null;
    isDemo?: boolean;
    subscriptions: Array<{
      id: string;
      plan: SubscriptionPlan;
      status: SubscriptionStatus;
      startDate: Date;
      endDate: Date | null;
      trialDaysRemaining: number | null;
      createdAt: Date;
    }>;
    branches?: Array<{
      id: string;
      name: string;
      code: string;
      isDefault: boolean;
      state: string | null;
      isActive: boolean;
    }>;
    financialYears?: Array<{
      id: string;
      code: string;
      label: string;
      isClosed: boolean;
      isActive: boolean;
    }>;
  };
  membership: {
    role: BusinessRole;
    permissions?: string[];
    branchIds?: string[];
    financialYears?: string[];
  };
  accountantAccess?: {
    branchScope: AccessScopeType;
    branchIds: string[];
    fyScope: AccessScopeType;
    financialYears: string[];
    permissions: string[];
    canApproveSensitive: boolean;
    canFileGst: boolean;
    grantedByUserId: string;
    isActive: boolean;
  } | null;
  sessionBranchId?: string | null;
}): ActiveBusinessWorkspace {
  const { business: biz, membership, accountantAccess, sessionBranchId } = params;
  const latestSub = biz.subscriptions[0] || null;
  let subInfo: ActiveBusinessWorkspace['subscription'] = null;

  if (latestSub) {
    const trial = calculateSubscriptionTrialInfo(
      latestSub as Parameters<typeof calculateSubscriptionTrialInfo>[0]
    );
    subInfo = {
      plan: latestSub.plan,
      status: trial.status,
      trialDaysRemaining: trial.trialDaysRemaining,
      isTrial: trial.isTrial,
      isExpired: trial.isExpired,
      displayText: trial.displayText,
      endDate: trial.endDate,
    };

    if (trial.isExpired && latestSub.status === SubscriptionStatus.TRIALING) {
      prisma.subscription
        .update({
          where: { id: latestSub.id },
          data: { status: SubscriptionStatus.EXPIRED, trialDaysRemaining: 0 },
        })
        .catch(() => null);
    }
  }

  const erpRole = normalizeErpRole(membership.role);
  const activeAccAccess =
    accountantAccess && accountantAccess.isActive ? accountantAccess : null;

  const allBranches = (biz.branches ?? []).filter((b) => b.isActive);
  const scopedBranches =
    erpRole === 'ACCOUNTANT' &&
    activeAccAccess?.branchScope === AccessScopeType.SELECTED
      ? allBranches.filter((b) => activeAccAccess.branchIds.includes(b.id))
      : allBranches;

  const branches: ActiveBranchSummary[] = scopedBranches.map((b) => ({
    id: b.id,
    name: b.name,
    code: b.code,
    isDefault: b.isDefault,
    state: b.state,
  }));

  const allFys = (biz.financialYears ?? []).filter((fy) => fy.isActive);
  const scopedFys =
    erpRole === 'ACCOUNTANT' && activeAccAccess?.fyScope === AccessScopeType.SELECTED
      ? allFys.filter((fy) => activeAccAccess.financialYears.includes(fy.code))
      : allFys;

  const financialYears: ActiveFinancialYearSummary[] = scopedFys.map((fy) => ({
    id: fy.id,
    code: fy.code,
    label: fy.label,
    isClosed: fy.isClosed,
  }));

  const activeBranchId =
    sessionBranchId && branches.some((b) => b.id === sessionBranchId)
      ? sessionBranchId
      : (branches.find((b) => b.isDefault)?.id ?? branches[0]?.id ?? null);

  const permissions = resolveEffectivePermissions(
    membership.role,
    membership.permissions,
    activeAccAccess
  );

  return {
    id: biz.id,
    name: biz.name,
    legalName: biz.legalName,
    tradeType: biz.tradeType,
    gstin: biz.gstin,
    city: biz.city,
    state: biz.state,
    currency: biz.currency,
    role: membership.role,
    erpRole,
    permissions,
    activeBranchId,
    branches,
    financialYears,
    accountantAccess: activeAccAccess
      ? {
          branchScope: activeAccAccess.branchScope,
          branchIds: activeAccAccess.branchIds,
          fyScope: activeAccAccess.fyScope,
          financialYears: activeAccAccess.financialYears,
          canApproveSensitive: activeAccAccess.canApproveSensitive,
          canFileGst: activeAccAccess.canFileGst,
          grantedByUserId: activeAccAccess.grantedByUserId,
        }
      : null,
    logoUrl: biz.logoUrl || null,
    isDemo: Boolean((biz as typeof biz & { isDemo?: boolean }).isDemo || biz.id.startsWith('demo_')),
    subscription: subInfo,
  };
}

/**
 * Resolves a specific business workspace for a user (used when requestedBusinessId differs
 * from the pinned session workspace, e.g., cross-business API calls with tenant checks).
 */
export async function resolveBusinessWorkspaceForUser(
  userId: string,
  businessId: string,
  sessionBranchId?: string | null
): Promise<ActiveBusinessWorkspace | null> {
  const membership = await prisma.businessMembership.findUnique({
    where: {
      userId_businessId: {
        userId,
        businessId,
      },
    },
    include: {
      business: {
        include: {
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          branches: {
            where: { isActive: true },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          },
          financialYears: {
            where: { isActive: true },
            orderBy: { startDate: 'desc' },
          },
        },
      },
    },
  });

  if (!membership || !membership.isActive) {
    return null;
  }

  const accAccess = await prisma.accountantBusinessAccess.findUnique({
    where: {
      userId_businessId: {
        userId,
        businessId,
      },
    },
  });

  if (normalizeErpRole(membership.role) === 'ACCOUNTANT' && accAccess && !accAccess.isActive) {
    return null;
  }

  return buildActiveWorkspacePayload({
    business: membership.business,
    membership,
    accountantAccess: accAccess,
    sessionBranchId,
  });
}

/**
 * Validates a session token, checks expiration, and retrieves authenticated details.
 */
export async function validateSessionToken(
  sessionToken: string
): Promise<CurrentAuthSession | null> {
  if (!sessionToken || typeof sessionToken !== 'string') {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: {
      user: {
        include: {
          accountantAccesses: true,
          memberships: {
            where: { isActive: true },
            include: {
              business: {
                include: {
                  subscriptions: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                  },
                  branches: {
                    where: { isActive: true },
                    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
                  },
                  financialYears: {
                    where: { isActive: true },
                    orderBy: { startDate: 'desc' },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  // Check if session has expired
  if (session.expiresAt < new Date()) {
    // Delete expired session asynchronously
    await prisma.session.delete({ where: { id: session.id } }).catch(() => null);
    return null;
  }

  const sessionUserFlags = session.user as typeof session.user & {
    isSuspended?: boolean;
    isDemo?: boolean;
    preferredLanguage?: string | null;
  };

  // Check if user has been suspended
  if (sessionUserFlags.isSuspended) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => null);
    return null;
  }

  const user: AuthenticatedUser = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    phone: session.user.phone,
    platformRole: session.user.platformRole,
    isDemo: Boolean(sessionUserFlags.isDemo || session.user.id.startsWith('demo_')),
    preferredLanguage: sessionUserFlags.preferredLanguage || 'en',
    createdAt: session.user.createdAt,
  };

  const accessByBusinessId = new Map(
    session.user.accountantAccesses.map((a) => [a.businessId, a])
  );

  // Exclude any Accountant membership whose explicit AccountantBusinessAccess has been revoked
  const validMemberships = session.user.memberships.filter((m) => {
    if (!m.isActive) return false;
    const acc = accessByBusinessId.get(m.businessId);
    if (normalizeErpRole(m.role) === 'ACCOUNTANT' && acc && !acc.isActive) {
      return false;
    }
    return true;
  });

  const memberships: SessionMembershipSummary[] = validMemberships.map((m) => {
    const acc = accessByBusinessId.get(m.business.id);
    return {
      businessId: m.business.id,
      businessName: m.business.name,
      role: m.role,
      erpRole: normalizeErpRole(m.role),
      plan: m.business.subscriptions[0]?.plan ?? null,
      branchScope: acc?.branchScope ?? AccessScopeType.ALL,
      fyScope: acc?.fyScope ?? AccessScopeType.ALL,
    };
  });

  // Resolve active business workspace:
  // 1. Session's pinned businessId if valid active membership exists
  // 2. Otherwise default to user's first active membership if any
  let targetMembership = validMemberships.find(
    (m) => m.businessId === session.businessId
  );

  if (!targetMembership && validMemberships.length > 0) {
    targetMembership = validMemberships[0];
  }

  let activeBusiness: ActiveBusinessWorkspace | null = null;
  if (targetMembership) {
    const accAccess = accessByBusinessId.get(targetMembership.business.id) ?? null;
    activeBusiness = buildActiveWorkspacePayload({
      business: targetMembership.business,
      membership: targetMembership,
      accountantAccess: accAccess,
      sessionBranchId: session.branchId,
    });
  }

  return {
    sessionId: session.id,
    user,
    activeBusiness,
    memberships,
  };
}

/**
 * Retrieves the current session using incoming HTTP cookies or Authorization Bearer header.
 */
export async function getCurrentSession(): Promise<CurrentAuthSession | null> {
  let token: string | undefined;

  try {
    const cookieStore = await cookies();
    token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  } catch {
    // cookies() can throw outside request contexts
  }

  if (!token) {
    try {
      const headerList = await headers();
      const authHeader = headerList.get('authorization') || headerList.get('x-session-token');
      if (authHeader) {
        token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
      }
    } catch {
      // headers() can throw outside request contexts
    }
  }

  if (!token) return null;

  return validateSessionToken(token);
}

/**
 * Invalidates and removes a session from PostgreSQL.
 */
export async function destroySession(sessionToken: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { sessionToken },
  });
}

/**
 * Sets the secure HTTP-only cookie on outgoing response.
 */
export async function setSessionCookie(
  sessionToken: string,
  expiresAt: Date
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

/**
 * Clears the session cookie on logout.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
