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
  };
  business: {
    id: string;
    name: string;
    role?: BusinessRole;
    plan?: SubscriptionPlan | null;
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

  return {
    clientId: clientId ? clientId.trim() : null,
    clientSecret: clientSecret ? clientSecret.trim() : null,
    isConfigured: Boolean(clientId && clientId.trim().length > 0),
  };
}

/**
 * Computes standard redirect URI dynamically based on request headers or APP_URL.
 */
export function getGoogleRedirectUri(req?: Request): string {
  if (req) {
    const proto =
      req.headers.get('x-forwarded-proto') ||
      (req.headers.get('host')?.includes('localhost') ? 'http' : 'https');
    const host =
      req.headers.get('x-forwarded-host') ||
      req.headers.get('host') ||
      'lenden-pi.vercel.app';
    return `${proto}://${host}/api/auth/callback/google`;
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://lenden-pi.vercel.app');

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
 * - If user exists: Securely creates session for existing account, keeping workspace,
 *   invoices, customers, subscriptions, and free-trial dates completely preserved.
 * - If user is new: Automatically executes registration transaction, provisions business
 *   workspace, establishes business ownership, and grants standard 14-day Free Trial.
 */
export async function authenticateGoogleUser(
  profile: GoogleUserProfile
): Promise<GoogleAuthResult> {
  const normalizedEmail = profile.email.trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Invalid email address provided by Google.');
  }

  // Find existing user by verified email
  const existingUser = await prisma.user.findUnique({
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

  if (existingUser) {
    // Check suspension
    if ((existingUser as any).isSuspended) {
      const reason =
        (existingUser as any).suspendedReason ||
        'Your account has been administratively suspended. Please contact platform support.';
      throw new Error(`Account Suspended: ${reason}`);
    }

    const primaryMembership = existingUser.memberships[0] || null;
    const primaryBusiness = primaryMembership?.business || null;
    const latestSubscription = primaryBusiness?.subscriptions?.[0] || null;

    // Create a new session in PostgreSQL for the existing account
    const { sessionToken, expiresAt, sessionId } = await createSession(
      existingUser.id,
      primaryBusiness ? primaryBusiness.id : null
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
      },
      business: primaryBusiness
        ? {
            id: primaryBusiness.id,
            name: primaryBusiness.name,
            role: primaryMembership?.role,
            plan: latestSubscription?.plan || null,
          }
        : null,
    };
  }

  // NEW USER REGISTRATION FLOW
  // Generate random dummy password to satisfy the non-null passwordHash constraint
  const randomDummyPassword = crypto.randomBytes(32).toString('hex');
  const dummyPasswordHash = await hashPassword(randomDummyPassword);

  const cleanName = profile.name.trim() || normalizedEmail.split('@')[0];
  const defaultBizName = `${cleanName}'s Business`;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create User
    const user = await tx.user.create({
      data: {
        name: cleanName,
        email: normalizedEmail,
        passwordHash: dummyPasswordHash,
        platformRole: PlatformRole.USER,
      },
    });

    // 2. Create Business Workspace Tenant
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

    // 3. Link Membership as BUSINESS_OWNER
    const membership = await tx.businessMembership.create({
      data: {
        userId: user.id,
        businessId: business.id,
        role: BusinessRole.BUSINESS_OWNER,
      },
    });

    // 4. Provision Initial Trial Subscription (14 days)
    const trialStartDate = new Date();
    const trialEndDate = new Date(trialStartDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    const subscription = await tx.subscription.create({
      data: {
        businessId: business.id,
        plan: SubscriptionPlan.FREE_TRIAL,
        status: SubscriptionStatus.TRIALING,
        startDate: trialStartDate,
        endDate: trialEndDate,
        trialDaysRemaining: 14,
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
    },
    business: {
      id: result.business.id,
      name: result.business.name,
      role: result.membership.role,
      plan: result.subscription.plan,
    },
  };
}
