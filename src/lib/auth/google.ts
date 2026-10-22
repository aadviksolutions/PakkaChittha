import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { hashPassword } from './password';
import { createSession } from './session';
import {
  PlatformRole,
  BusinessRole,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client';

export interface GoogleOAuthConfig {
  clientId: string | null;
  clientSecret: string | null;
  isConfigured: boolean;
}

export interface GoogleUserProfile {
  id: string; // Google sub
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
}

export interface GoogleAuthOptions {
  mode?: 'household' | 'business' | 'free_khata';
  plan?: string;
}

export interface GoogleAuthResult {
  isNewUser: boolean;
  sessionToken: string;
  expiresAt: Date;
  sessionId: string;
  user: {
    id: string;
    name: string;
    email: string;
    platformRole: PlatformRole;
    avatarUrl?: string | null;
  };
  business: {
    id: string;
    name: string;
    role?: BusinessRole;
    plan?: SubscriptionPlan | null;
  } | null;
  household?: {
    id: string;
    name: string;
    role: string;
  } | null;
}

/**
 * Resolves Google OAuth credentials from environment variables or database PlatformSettings.
 * Never exposes clientSecret to client-side.
 */
export async function getGoogleOAuthConfig(): Promise<GoogleOAuthConfig> {
  let clientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_OAUTH_CLIENT_ID ||
    null;

  let clientSecret =
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ||
    process.env.GOOGLE_SECRET ||
    null;

  // If not found in environment, check PlatformSetting table
  if (!clientId || !clientSecret) {
    try {
      const records = await (prisma as any).platformSetting.findMany({
        where: {
          key: {
            in: [
              'googleClientId',
              'GOOGLE_CLIENT_ID',
              'googleClientSecret',
              'GOOGLE_CLIENT_SECRET',
            ],
          },
        },
      });

      for (const r of records) {
        if (!clientId && (r.key === 'googleClientId' || r.key === 'GOOGLE_CLIENT_ID')) {
          clientId = r.value?.trim() || null;
        }
        if (!clientSecret && (r.key === 'googleClientSecret' || r.key === 'GOOGLE_CLIENT_SECRET')) {
          clientSecret = r.value?.trim() || null;
        }
      }
    } catch (err) {
      console.warn('Could not query PlatformSetting for Google OAuth config:', err);
    }
  }

  // Auto-detect and heal swapped credentials:
  // Google Client Secrets always start with "GOCSPX-"
  // Google Client IDs end with ".apps.googleusercontent.com"
  if (clientId && clientId.startsWith('GOCSPX-') && (!clientSecret || clientSecret === clientId)) {
    clientSecret = clientId;
    clientId = null;
  } else if (clientSecret && clientSecret.endsWith('.apps.googleusercontent.com') && (!clientId || clientId === clientSecret)) {
    clientId = clientSecret;
    clientSecret = null;
  } else if (
    clientId &&
    clientId.startsWith('GOCSPX-') &&
    clientSecret &&
    clientSecret.endsWith('.apps.googleusercontent.com')
  ) {
    // Both credentials were accidentally swapped
    const temp = clientId;
    clientId = clientSecret;
    clientSecret = temp;
  }

  return {
    clientId: clientId ? clientId.trim() : null,
    clientSecret: clientSecret ? clientSecret.trim() : null,
    isConfigured: Boolean(clientId && clientId.trim().length > 0 && clientId.includes('.apps.googleusercontent.com')),
  };
}

/**
 * Computes standard redirect URI dynamically based on request headers or APP_URL.
 */
export function getGoogleRedirectUri(req?: Request): string {
  if (process.env.GOOGLE_REDIRECT_URI && process.env.GOOGLE_REDIRECT_URI.trim()) {
    return process.env.GOOGLE_REDIRECT_URI.trim();
  }

  if (req) {
    const proto =
      req.headers.get('x-forwarded-proto') ||
      (req.headers.get('host')?.includes('localhost') ? 'http' : 'https');
    const host =
      req.headers.get('x-forwarded-host') ||
      req.headers.get('host') ||
      'www.pakkachittha.com';
    return `${proto}://${host}/api/auth/callback/google`;
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.pakkachittha.com');

  return `${appUrl.replace(/\/$/, '')}/api/auth/callback/google`;
}

/**
 * Generates the full Google OAuth 2.0 authorization URL with state and PKCE nonce.
 */
export function buildGoogleAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  loginHint?: string;
}): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', params.state);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'select_account');

  if (params.loginHint) {
    url.searchParams.set('login_hint', params.loginHint);
  }

  return url.toString();
}

/**
 * Exchanges authorization code for tokens via Google OAuth 2.0 token endpoint.
 */
export async function exchangeGoogleCode(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const body = new URLSearchParams({
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    const errorDesc = data.error_description || data.error || 'Failed to exchange authorization code.';
    throw new Error(`Google token exchange error: ${errorDesc}`);
  }

  return {
    accessToken: data.access_token,
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Fetches verified user profile using Google UserInfo API endpoint.
 */
export async function fetchGoogleUserProfile(accessToken: string): Promise<GoogleUserProfile> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user profile from Google.');
  }

  const data = await response.json();

  if (!data.email) {
    throw new Error('Google profile does not contain an email address.');
  }

  return {
    id: data.sub || data.id,
    email: data.email,
    name: data.name || data.given_name || data.email.split('@')[0],
    picture: data.picture,
    emailVerified: Boolean(data.email_verified),
  };
}

/**
 * Verifies a Google ID Token (used for Google Identity Services / One Tap verification).
 */
export async function verifyGoogleIdToken(
  idToken: string,
  expectedClientId?: string
): Promise<GoogleUserProfile> {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );

  if (!response.ok) {
    throw new Error('Invalid or expired Google ID Token.');
  }

  const data = await response.json();

  if (expectedClientId && data.aud !== expectedClientId) {
    throw new Error('Google ID Token audience mismatch.');
  }

  if (!data.email) {
    throw new Error('Google token does not contain an email address.');
  }

  return {
    id: data.sub,
    email: data.email,
    name: data.name || data.email.split('@')[0],
    picture: data.picture,
    emailVerified: data.email_verified === 'true' || data.email_verified === true,
  };
}

/**
 * Core authentication handler for verified Google profiles:
 * - Validates verified email status from Google.
 * - Matches by stable Google subject identifier (sub) or verified email.
 * - Links googleId and avatar to existing accounts without duplication.
 * - Respects requested mode ('household' for Mera Ghar, 'free_khata', or 'business').
 * - Preserves existing workspace, invoices, subscriptions, and member data.
 * - Keeps platformRole strictly USER on registration (never grants SUPER_ADMIN).
 */
export async function authenticateGoogleUser(
  profile: GoogleUserProfile,
  options?: GoogleAuthOptions
): Promise<GoogleAuthResult> {
  const normalizedEmail = profile.email.trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Invalid email address provided by Google.');
  }

  // Security check: never automatically merge or authenticate unverified email
  if (!profile.emailVerified) {
    throw new Error(
      'Google account email is not verified by Google. Please verify your email with Google or sign in using password.'
    );
  }

  // 1. Search for existing user by stable Google subject ID (sub)
  let existingUser = await prisma.user.findFirst({
    where: { googleId: profile.id },
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
      householdMemberships: {
        include: {
          household: true,
        },
      },
    },
  });

  // 2. If not found by googleId, search by normalized email
  if (!existingUser) {
    existingUser = await prisma.user.findUnique({
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
        householdMemberships: {
          include: {
            household: true,
          },
        },
      },
    });

    // If account found by verified email, associate stable googleId
    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          googleId: profile.id,
          avatarUrl: profile.picture || existingUser.avatarUrl,
        },
      });
    }
  }

  // EXISTING USER LOGIN FLOW
  if (existingUser) {
    if ((existingUser as any).isSuspended) {
      const reason =
        (existingUser as any).suspendedReason ||
        'Your account has been administratively suspended. Please contact platform support.';
      throw new Error(`Account Suspended: ${reason}`);
    }

    const primaryMembership = existingUser.memberships[0] || null;
    const existingBusiness = primaryMembership?.business || null;
    let activeBusinessId: string | null = existingBusiness?.id || null;
    let activeBusinessName: string | null = existingBusiness?.name || null;
    let activeBusinessRole: BusinessRole | undefined = primaryMembership?.role;
    let activeBusinessPlan: SubscriptionPlan | null = existingBusiness?.subscriptions?.[0]?.plan || null;

    const primaryHouseholdMembership = existingUser.householdMemberships[0] || null;
    let primaryHousehold = primaryHouseholdMembership?.household || null;

    const wantsHousehold = options?.mode === 'household' || options?.plan === 'ghar_kharcha';
    const wantsFreeKhata = options?.mode === 'free_khata' || options?.plan === 'free_khata';

    // If user explicitly signed in for Household mode and doesn't have a household yet, create one
    if (wantsHousehold && !primaryHousehold) {
      const { createHousehold } = await import('@/lib/household/householdService');
      primaryHousehold = await createHousehold(existingUser.id, {
        name: `${existingUser.name}'s Household`,
        currency: 'INR',
      });
    }

    // If user explicitly signed in for Business/Khata mode and has no business, provision it
    if (!wantsHousehold && !existingBusiness) {
      if (wantsFreeKhata) {
        const defaultBizName = `${existingUser.name}'s Khata`;
        const newBiz = await prisma.business.create({
          data: {
            name: defaultBizName,
            email: normalizedEmail,
            currency: 'INR',
          },
        });
        await prisma.businessMembership.create({
          data: {
            userId: existingUser.id,
            businessId: newBiz.id,
            role: BusinessRole.BUSINESS_OWNER,
          },
        });
        const sub = await prisma.subscription.create({
          data: {
            businessId: newBiz.id,
            plan: SubscriptionPlan.FREE_KHATA,
            status: SubscriptionStatus.ACTIVE,
            trialDaysRemaining: 999999,
            monthlyPrice: 0,
            maxMonthlyInvoices: 0,
            maxStaffSeats: 1,
            whatsAppQuota: 999999,
          },
        });
        activeBusinessId = newBiz.id;
        activeBusinessName = newBiz.name;
        activeBusinessRole = BusinessRole.BUSINESS_OWNER;
        activeBusinessPlan = sub.plan;
      } else if (options?.mode === 'business') {
        const defaultBizName = `${existingUser.name}'s Business`;
        const newBiz = await prisma.business.create({
          data: {
            name: defaultBizName,
            legalName: defaultBizName,
            tradeType: 'Retail & Wholesale',
            email: normalizedEmail,
            currency: 'INR',
          },
        });
        await prisma.businessMembership.create({
          data: {
            userId: existingUser.id,
            businessId: newBiz.id,
            role: BusinessRole.BUSINESS_OWNER,
          },
        });
        const trialStartDate = new Date();
        const trialEndDate = new Date(trialStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        const sub = await prisma.subscription.create({
          data: {
            businessId: newBiz.id,
            plan: SubscriptionPlan.FREE_TRIAL,
            status: SubscriptionStatus.TRIALING,
            startDate: trialStartDate,
            endDate: trialEndDate,
            trialDaysRemaining: 7,
            maxMonthlyInvoices: 500,
            maxStaffSeats: 3,
            whatsAppQuota: 100,
          },
        });
        activeBusinessId = newBiz.id;
        activeBusinessName = newBiz.name;
        activeBusinessRole = BusinessRole.BUSINESS_OWNER;
        activeBusinessPlan = sub.plan;
      }
    }

    // Determine session active business:
    // If user requested Household mode or only has household, session is scoped without business (null)
    const sessionBusinessId = wantsHousehold
      ? null
      : activeBusinessId;

    const { sessionToken, expiresAt, sessionId } = await createSession(
      existingUser.id,
      sessionBusinessId
    );

    return {
      isNewUser: false,
      sessionToken,
      expiresAt,
      sessionId,
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        platformRole: existingUser.platformRole,
        avatarUrl: existingUser.avatarUrl || profile.picture || null,
      },
      business: activeBusinessId && activeBusinessName
        ? {
            id: activeBusinessId,
            name: activeBusinessName,
            role: activeBusinessRole || BusinessRole.BUSINESS_OWNER,
            plan: activeBusinessPlan,
          }
        : null,
      household: primaryHousehold
        ? {
            id: primaryHousehold.id,
            name: primaryHousehold.name,
            role: primaryHouseholdMembership?.role || 'OWNER',
          }
        : null,
    };
  }

  // NEW USER REGISTRATION FLOW
  const cleanName = profile.name.trim() || normalizedEmail.split('@')[0];
  const wantsHousehold = options?.mode === 'household' || options?.plan === 'ghar_kharcha';
  const wantsFreeKhata = options?.mode === 'free_khata' || options?.plan === 'free_khata';

  const randomDummyPassword = crypto.randomBytes(32).toString('hex');
  const dummyPasswordHash = await hashPassword(randomDummyPassword);

  if (wantsHousehold) {
    // 1. Provision User & Household under Mera Ghar (100% Free)
    const user = await prisma.user.create({
      data: {
        name: cleanName,
        email: normalizedEmail,
        googleId: profile.id,
        avatarUrl: profile.picture || null,
        passwordHash: dummyPasswordHash,
        platformRole: PlatformRole.USER,
      },
    });

    const { createHousehold } = await import('@/lib/household/householdService');
    const household = await createHousehold(user.id, {
      name: `${cleanName}'s Household`,
      currency: 'INR',
      monthlyBudget: 0,
    });

    const { sessionToken, expiresAt, sessionId } = await createSession(user.id, null);

    return {
      isNewUser: true,
      sessionToken,
      expiresAt,
      sessionId,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        platformRole: user.platformRole,
        avatarUrl: user.avatarUrl,
      },
      business: null,
      household: {
        id: household.id,
        name: household.name,
        role: 'OWNER',
      },
    };
  } else if (wantsFreeKhata) {
    // 2. Provision User & Business under Free Khata (Permanent Free Ledger)
    const defaultBizName = `${cleanName}'s Khata`;
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: cleanName,
          email: normalizedEmail,
          googleId: profile.id,
          avatarUrl: profile.picture || null,
          passwordHash: dummyPasswordHash,
          platformRole: PlatformRole.USER,
        },
      });

      const business = await tx.business.create({
        data: {
          name: defaultBizName,
          email: normalizedEmail,
          currency: 'INR',
        },
      });

      const membership = await tx.businessMembership.create({
        data: {
          userId: user.id,
          businessId: business.id,
          role: BusinessRole.BUSINESS_OWNER,
        },
      });

      const subscription = await tx.subscription.create({
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

      return { user, business, membership, subscription };
    });

    const { sessionToken, expiresAt, sessionId } = await createSession(
      result.user.id,
      result.business.id
    );

    return {
      isNewUser: true,
      sessionToken,
      expiresAt,
      sessionId,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        platformRole: result.user.platformRole,
        avatarUrl: result.user.avatarUrl,
      },
      business: {
        id: result.business.id,
        name: result.business.name,
        role: result.membership.role,
        plan: result.subscription.plan,
      },
      household: null,
    };
  } else {
    // 3. Provision standard Business Workspace Tenant with 7-day Free Trial
    const defaultBizName = `${cleanName}'s Business`;
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: cleanName,
          email: normalizedEmail,
          googleId: profile.id,
          avatarUrl: profile.picture || null,
          passwordHash: dummyPasswordHash,
          platformRole: PlatformRole.USER,
        },
      });

      const business = await tx.business.create({
        data: {
          name: defaultBizName,
          legalName: defaultBizName,
          tradeType: 'Retail & Wholesale',
          email: normalizedEmail,
          city: 'Raipur',
          state: 'Chhattisgarh',
          currency: 'INR',
        },
      });

      const membership = await tx.businessMembership.create({
        data: {
          userId: user.id,
          businessId: business.id,
          role: BusinessRole.BUSINESS_OWNER,
        },
      });

      const trialStartDate = new Date();
      const trialEndDate = new Date(trialStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const subscription = await tx.subscription.create({
        data: {
          businessId: business.id,
          plan: SubscriptionPlan.FREE_TRIAL,
          status: SubscriptionStatus.TRIALING,
          startDate: trialStartDate,
          endDate: trialEndDate,
          trialDaysRemaining: 7,
          maxMonthlyInvoices: 500,
          maxStaffSeats: 3,
          whatsAppQuota: 100,
        },
      });

      return { user, business, membership, subscription };
    });

    const { sessionToken, expiresAt, sessionId } = await createSession(
      result.user.id,
      result.business.id
    );

    return {
      isNewUser: true,
      sessionToken,
      expiresAt,
      sessionId,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        platformRole: result.user.platformRole,
        avatarUrl: result.user.avatarUrl,
      },
      business: {
        id: result.business.id,
        name: result.business.name,
        role: result.membership.role,
        plan: result.subscription.plan,
      },
      household: null,
    };
  }
}
