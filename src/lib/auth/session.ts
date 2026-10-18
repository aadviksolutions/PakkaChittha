import { cookies, headers } from 'next/headers';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { PlatformRole, BusinessRole, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { calculateSubscriptionTrialInfo } from '@/lib/subscription/trial';

export const SESSION_COOKIE_NAME = 'lenden_session_token';
const SESSION_TTL_DAYS = 7;

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  platformRole: PlatformRole;
  isDemo?: boolean;
  createdAt: Date;
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

export interface CurrentAuthSession {
  sessionId: string;
  user: AuthenticatedUser;
  activeBusiness: ActiveBusinessWorkspace | null;
  memberships: {
    businessId: string;
    businessName: string;
    role: BusinessRole;
  }[];
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

  // Check if user has been suspended
  if ((session.user as any).isSuspended) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => null);
    return null;
  }

  const user: AuthenticatedUser = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    phone: session.user.phone,
    platformRole: session.user.platformRole,
    isDemo: Boolean((session.user as any).isDemo || session.user.id.startsWith('demo_')),
    createdAt: session.user.createdAt,
  };

  const memberships = session.user.memberships.map((m) => ({
    businessId: m.business.id,
    businessName: m.business.name,
    role: m.role,
  }));

  // Resolve active business workspace:
  // 1. Session's pinned businessId if valid membership exists
  // 2. Otherwise default to user's first membership if any
  let targetMembership = session.user.memberships.find(
    (m) => m.businessId === session.businessId
  );

  if (!targetMembership && session.user.memberships.length > 0) {
    targetMembership = session.user.memberships[0];
  }

  let activeBusiness: ActiveBusinessWorkspace | null = null;
  if (targetMembership) {
    const biz = targetMembership.business;
    const latestSub = biz.subscriptions[0] || null;
    let subInfo: ActiveBusinessWorkspace['subscription'] = null;
    if (latestSub) {
      const trial = calculateSubscriptionTrialInfo(latestSub);
      subInfo = {
        plan: latestSub.plan,
        status: trial.status,
        trialDaysRemaining: trial.trialDaysRemaining,
        isTrial: trial.isTrial,
        isExpired: trial.isExpired,
        displayText: trial.displayText,
        endDate: trial.endDate,
      };

      // If trial has just expired in calendar time, update DB status asynchronously
      if (trial.isExpired && latestSub.status === SubscriptionStatus.TRIALING) {
        prisma.subscription
          .update({
            where: { id: latestSub.id },
            data: { status: SubscriptionStatus.EXPIRED, trialDaysRemaining: 0 },
          })
          .catch(() => null);
      }
    }

    activeBusiness = {
      id: biz.id,
      name: biz.name,
      legalName: biz.legalName,
      tradeType: biz.tradeType,
      gstin: biz.gstin,
      city: biz.city,
      state: biz.state,
      currency: biz.currency,
      role: targetMembership.role,
      logoUrl: biz.logoUrl || null,
      isDemo: Boolean((biz as any).isDemo || biz.id.startsWith('demo_')),
      subscription: subInfo,
    };
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
