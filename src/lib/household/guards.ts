import prisma from '@/lib/prisma';
import { requireAuth, AuthError } from '@/lib/auth/guards';
import { HouseholdRole, PlatformRole } from '@prisma/client';

export class HouseholdAccessError extends AuthError {
  constructor(message = 'Access Denied: You do not have permission for this household') {
    super(message, 403);
    this.name = 'HouseholdAccessError';
  }
}

export interface HouseholdAuthContext {
  userId: string;
  userName: string;
  userEmail: string;
  householdId: string;
  householdName: string;
  currency: string;
  role: HouseholdRole;
  isPlatformAdmin: boolean;
}

/**
 * Server-side authorization guard for PakkaChittha Ghar Kharcha.
 * Strictly verifies on the server that the authenticated user is an active member
 * of the requested household with required role permissions.
 */
export async function requireHouseholdAccess(
  requestedHouseholdId?: string | null,
  allowedRoles?: HouseholdRole[]
): Promise<HouseholdAuthContext> {
  const session = await requireAuth();
  const userId = session.user.id;
  const isPlatformAdmin = session.user.platformRole === PlatformRole.SUPER_ADMIN;

  let targetHouseholdId = requestedHouseholdId?.trim();

  // If no explicit household ID was passed, find user's first active household membership
  if (!targetHouseholdId) {
    const firstMembership = await prisma.householdMember.findFirst({
      where: { userId },
      include: { household: true },
      orderBy: { createdAt: 'asc' },
    });

    if (firstMembership && !firstMembership.household.isArchived) {
      targetHouseholdId = firstMembership.householdId;
    }
  }

  if (!targetHouseholdId) {
    throw new HouseholdAccessError('No active household found for user. Please create or join a household.');
  }

  // Look up membership record in the database
  const membership = await prisma.householdMember.findUnique({
    where: {
      userId_householdId: {
        userId,
        householdId: targetHouseholdId,
      },
    },
    include: {
      household: true,
    },
  });

  // If not a member and not platform super admin, reject access immediately
  if (!membership && !isPlatformAdmin) {
    throw new HouseholdAccessError('Access Denied: Cross-household access prohibited.');
  }

  // If household is archived, reject unless owner
  if (membership?.household.isArchived && membership.role !== HouseholdRole.OWNER && !isPlatformAdmin) {
    throw new HouseholdAccessError('This household has been archived.');
  }

  const role = membership ? membership.role : HouseholdRole.OWNER;
  const household = membership ? membership.household : await prisma.household.findUnique({ where: { id: targetHouseholdId } });

  if (!household) {
    throw new HouseholdAccessError('Household not found.');
  }

  // Enforce specific role restrictions if specified
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role) && !isPlatformAdmin) {
    throw new HouseholdAccessError(`Insufficient permissions. Required role: ${allowedRoles.join(' or ')}.`);
  }

  return {
    userId,
    userName: session.user.name,
    userEmail: session.user.email,
    householdId: household.id,
    householdName: household.name,
    currency: household.currency || 'INR',
    role,
    isPlatformAdmin,
  };
}
