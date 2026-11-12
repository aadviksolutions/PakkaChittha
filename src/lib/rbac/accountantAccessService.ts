import crypto from 'crypto';
import {
  AccessScopeType,
  AccountantInvitationStatus,
  BusinessRole,
} from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  DEFAULT_ACCOUNTANT_PERMISSIONS,
  OWNER_ONLY_PERMISSIONS,
  ALL_PERMISSIONS,
  normalizeErpRole,
} from './roles';
import { recordAuditEvent } from './auditService';
import { getDefaultIndianFyList } from './fiscalYear';

export function hashInviteToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

export function generateInviteToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(24).toString('hex');
  return { rawToken, tokenHash: hashInviteToken(rawToken) };
}

export function sanitizeAccountantPermissions(permissions?: string[] | null): string[] {
  if (!permissions || permissions.length === 0) {
    return [...DEFAULT_ACCOUNTANT_PERMISSIONS];
  }
  const ownerOnlySet = new Set<string>(OWNER_ONLY_PERMISSIONS);
  const validSet = new Set<string>(ALL_PERMISSIONS);
  const filtered = permissions.filter((p) => validSet.has(p) && !ownerOnlySet.has(p));
  return filtered.length > 0 ? Array.from(new Set(filtered)) : [...DEFAULT_ACCOUNTANT_PERMISSIONS];
}

/**
 * Ensures a Scale business has at least a default Main Branch and current Indian Financial Years.
 * Safe and idempotent on repeated calls.
 */
export async function ensureBusinessWorkspaceDefaults(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, gstin: true, state: true, city: true, address: true },
  });
  if (!business) return { branches: [], financialYears: [] };

  const existingBranches = await prisma.branch.findMany({
    where: { businessId, isActive: true },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });

  let branches = existingBranches;
  if (existingBranches.length === 0) {
    const createdBranch = await prisma.branch.upsert({
      where: {
        businessId_code: {
          businessId,
          code: 'MAIN',
        },
      },
      update: { isActive: true, isDefault: true },
      create: {
        businessId,
        name: 'Main Branch',
        code: 'MAIN',
        gstin: business.gstin,
        state: business.state,
        city: business.city,
        address: business.address,
        isDefault: true,
        isActive: true,
      },
    });
    branches = [createdBranch];
  }

  const defaultFys = getDefaultIndianFyList();
  for (const fy of defaultFys) {
    await prisma.financialYear.upsert({
      where: {
        businessId_code: {
          businessId,
          code: fy.code,
        },
      },
      update: {},
      create: {
        businessId,
        code: fy.code,
        label: fy.label,
        startDate: fy.startDate,
        endDate: fy.endDate,
        isActive: true,
        isClosed: false,
      },
    });
  }

  const financialYears = await prisma.financialYear.findMany({
    where: { businessId, isActive: true },
    orderBy: { startDate: 'desc' },
  });

  return { branches, financialYears };
}

export interface CreateAccountantInvitationInput {
  businessId: string;
  invitedEmail: string;
  invitedName?: string | null;
  invitedByUserId: string;
  invitedByEmail?: string | null;
  invitedByName?: string | null;
  branchScope?: AccessScopeType;
  branchIds?: string[];
  fyScope?: AccessScopeType;
  financialYears?: string[];
  permissions?: string[];
  canApproveSensitive?: boolean;
  canFileGst?: boolean;
  maxStaffSeats: number;
}

export async function createAccountantInvitation(input: CreateAccountantInvitationInput) {
  const normalizedEmail = input.invitedEmail.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Please enter a valid accountant email address.');
  }

  await ensureBusinessWorkspaceDefaults(input.businessId);

  // Check if user is already an active member with a different role (e.g., Owner)
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, name: true, email: true },
  });

  if (existingUser) {
    const existingMembership = await prisma.businessMembership.findUnique({
      where: {
        userId_businessId: {
          userId: existingUser.id,
          businessId: input.businessId,
        },
      },
    });

    if (existingMembership?.isActive && normalizeErpRole(existingMembership.role) === 'OWNER') {
      throw new Error('This email is already the Business Owner of this workspace.');
    }
  }

  // Enforce plan seat limit before issuing a fresh invitation
  const activeSeatCount = await prisma.businessMembership.count({
    where: { businessId: input.businessId, isActive: true },
  });
  const alreadyMember = existingUser
    ? await prisma.businessMembership.findFirst({
        where: {
          userId: existingUser.id,
          businessId: input.businessId,
          isActive: true,
        },
      })
    : null;

  if (!alreadyMember && activeSeatCount >= input.maxStaffSeats) {
    throw new Error(
      `Seat limit reached (${activeSeatCount}/${input.maxStaffSeats}). Revoke an inactive staff or accountant seat before inviting another.`
    );
  }

  const branchScope = input.branchScope ?? AccessScopeType.ALL;
  const branchIds =
    branchScope === AccessScopeType.SELECTED ? Array.from(new Set(input.branchIds ?? [])) : [];
  const fyScope = input.fyScope ?? AccessScopeType.ALL;
  const financialYears =
    fyScope === AccessScopeType.SELECTED ? Array.from(new Set(input.financialYears ?? [])) : [];
  const permissions = sanitizeAccountantPermissions(input.permissions);

  const { rawToken, tokenHash } = generateInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await prisma.$transaction(async (tx) => {
    // Supersede any older pending invite for the same business + email
    await tx.accountantInvitation.updateMany({
      where: {
        businessId: input.businessId,
        invitedEmail: normalizedEmail,
        status: AccountantInvitationStatus.PENDING,
      },
      data: {
        status: AccountantInvitationStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    const created = await tx.accountantInvitation.create({
      data: {
        businessId: input.businessId,
        invitedEmail: normalizedEmail,
        invitedName: input.invitedName?.trim() || null,
        invitedByUserId: input.invitedByUserId,
        tokenHash,
        branchScope,
        branchIds,
        fyScope,
        financialYears,
        permissions,
        canApproveSensitive: Boolean(input.canApproveSensitive),
        canFileGst: Boolean(input.canFileGst),
        status: AccountantInvitationStatus.PENDING,
        expiresAt,
      },
    });

    await recordAuditEvent(
      {
        businessId: input.businessId,
        actorUserId: input.invitedByUserId,
        actorEmail: input.invitedByEmail,
        actorName: input.invitedByName,
        actorRole: 'OWNER',
        action: 'ACCOUNTANT_INVITATION_SENT',
        entityType: 'AccountantInvitation',
        entityId: created.id,
        newValue: {
          invitedEmail: normalizedEmail,
          branchScope,
          branchIds,
          fyScope,
          financialYears,
          permissionsCount: permissions.length,
          canApproveSensitive: created.canApproveSensitive,
          canFileGst: created.canFileGst,
        },
      },
      tx
    );

    return created;
  });

  return { invitation, rawToken };
}

export interface AcceptAccountantInvitationInput {
  rawToken?: string;
  invitationId?: string;
  acceptingUserId: string;
  acceptingUserEmail: string;
  acceptingUserName?: string | null;
  maxStaffSeatsResolver: (businessId: string) => Promise<number>;
}

export async function acceptAccountantInvitation(input: AcceptAccountantInvitationInput) {
  const normalizedUserEmail = input.acceptingUserEmail.trim().toLowerCase();

  const invitation = input.rawToken
    ? await prisma.accountantInvitation.findUnique({
        where: { tokenHash: hashInviteToken(input.rawToken) },
        include: { business: { select: { id: true, name: true } } },
      })
    : input.invitationId
      ? await prisma.accountantInvitation.findUnique({
          where: { id: input.invitationId },
          include: { business: { select: { id: true, name: true } } },
        })
      : null;

  if (!invitation) {
    throw new Error('Accountant invitation was not found or token is invalid.');
  }

  if (invitation.status !== AccountantInvitationStatus.PENDING) {
    throw new Error(`This invitation has already been ${invitation.status.toLowerCase()}.`);
  }

  if (invitation.expiresAt.getTime() < Date.now()) {
    await prisma.accountantInvitation.update({
      where: { id: invitation.id },
      data: { status: AccountantInvitationStatus.EXPIRED },
    });
    throw new Error('This accountant invitation has expired. Ask the business owner for a new invite.');
  }

  if (invitation.invitedEmail.trim().toLowerCase() !== normalizedUserEmail) {
    throw new Error(
      `This invitation was issued for ${invitation.invitedEmail}. Please sign in with that exact email to accept it.`
    );
  }

  const maxStaffSeats = await input.maxStaffSeatsResolver(invitation.businessId);
  const existingMembership = await prisma.businessMembership.findUnique({
    where: {
      userId_businessId: {
        userId: input.acceptingUserId,
        businessId: invitation.businessId,
      },
    },
  });

  if (existingMembership?.isActive && normalizeErpRole(existingMembership.role) === 'OWNER') {
    throw new Error('Business Owner already holds full ownership access to this workspace.');
  }

  if (!existingMembership?.isActive) {
    const activeCount = await prisma.businessMembership.count({
      where: { businessId: invitation.businessId, isActive: true },
    });
    if (activeCount >= maxStaffSeats) {
      throw new Error(
        `This business has reached its active seat limit (${activeCount}/${maxStaffSeats}).`
      );
    }
  }

  await ensureBusinessWorkspaceDefaults(invitation.businessId);

  const sanitizedPerms = sanitizeAccountantPermissions(invitation.permissions);

  return prisma.$transaction(async (tx) => {
    const acceptedInvite = await tx.accountantInvitation.update({
      where: { id: invitation.id },
      data: {
        status: AccountantInvitationStatus.ACCEPTED,
        acceptedByUserId: input.acceptingUserId,
        acceptedAt: new Date(),
      },
    });

    const access = await tx.accountantBusinessAccess.upsert({
      where: {
        userId_businessId: {
          userId: input.acceptingUserId,
          businessId: invitation.businessId,
        },
      },
      update: {
        grantedByUserId: invitation.invitedByUserId,
        branchScope: invitation.branchScope,
        branchIds: invitation.branchIds,
        fyScope: invitation.fyScope,
        financialYears: invitation.financialYears,
        permissions: sanitizedPerms,
        canApproveSensitive: invitation.canApproveSensitive,
        canFileGst: invitation.canFileGst,
        isActive: true,
        revokedAt: null,
        revokedReason: null,
      },
      create: {
        userId: input.acceptingUserId,
        businessId: invitation.businessId,
        grantedByUserId: invitation.invitedByUserId,
        branchScope: invitation.branchScope,
        branchIds: invitation.branchIds,
        fyScope: invitation.fyScope,
        financialYears: invitation.financialYears,
        permissions: sanitizedPerms,
        canApproveSensitive: invitation.canApproveSensitive,
        canFileGst: invitation.canFileGst,
        isActive: true,
      },
    });

    await tx.businessMembership.upsert({
      where: {
        userId_businessId: {
          userId: input.acceptingUserId,
          businessId: invitation.businessId,
        },
      },
      update: {
        role: BusinessRole.ACCOUNTANT,
        branchIds: invitation.branchIds,
        financialYears: invitation.financialYears,
        permissions: sanitizedPerms,
        isActive: true,
        revokedAt: null,
        invitedByUserId: invitation.invitedByUserId,
      },
      create: {
        userId: input.acceptingUserId,
        businessId: invitation.businessId,
        role: BusinessRole.ACCOUNTANT,
        branchIds: invitation.branchIds,
        financialYears: invitation.financialYears,
        permissions: sanitizedPerms,
        isActive: true,
        invitedByUserId: invitation.invitedByUserId,
      },
    });

    await recordAuditEvent(
      {
        businessId: invitation.businessId,
        actorUserId: input.acceptingUserId,
        actorEmail: normalizedUserEmail,
        actorName: input.acceptingUserName,
        actorRole: 'ACCOUNTANT',
        action: 'ACCOUNTANT_INVITATION_ACCEPTED',
        entityType: 'AccountantBusinessAccess',
        entityId: access.id,
        newValue: {
          invitationId: acceptedInvite.id,
          businessName: invitation.business.name,
          branchScope: access.branchScope,
          fyScope: access.fyScope,
        },
      },
      tx
    );

    return { invitation: acceptedInvite, access, business: invitation.business };
  });
}

export interface UpdateAccountantAccessInput {
  businessId: string;
  accountantUserId: string;
  actorUserId: string;
  actorEmail?: string | null;
  actorName?: string | null;
  branchScope?: AccessScopeType;
  branchIds?: string[];
  fyScope?: AccessScopeType;
  financialYears?: string[];
  permissions?: string[];
  canApproveSensitive?: boolean;
  canFileGst?: boolean;
}

export async function updateAccountantAccess(input: UpdateAccountantAccessInput) {
  const existing = await prisma.accountantBusinessAccess.findUnique({
    where: {
      userId_businessId: {
        userId: input.accountantUserId,
        businessId: input.businessId,
      },
    },
  });

  if (!existing) {
    throw new Error('Accountant access record not found for this business.');
  }

  const nextBranchScope = input.branchScope ?? existing.branchScope;
  const nextBranchIds =
    nextBranchScope === AccessScopeType.ALL
      ? []
      : input.branchIds !== undefined
        ? Array.from(new Set(input.branchIds))
        : existing.branchIds;

  const nextFyScope = input.fyScope ?? existing.fyScope;
  const nextFinancialYears =
    nextFyScope === AccessScopeType.ALL
      ? []
      : input.financialYears !== undefined
        ? Array.from(new Set(input.financialYears))
        : existing.financialYears;

  const nextPermissions =
    input.permissions !== undefined
      ? sanitizeAccountantPermissions(input.permissions)
      : existing.permissions;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.accountantBusinessAccess.update({
      where: { id: existing.id },
      data: {
        branchScope: nextBranchScope,
        branchIds: nextBranchIds,
        fyScope: nextFyScope,
        financialYears: nextFinancialYears,
        permissions: nextPermissions,
        canApproveSensitive:
          input.canApproveSensitive !== undefined
            ? input.canApproveSensitive
            : existing.canApproveSensitive,
        canFileGst: input.canFileGst !== undefined ? input.canFileGst : existing.canFileGst,
        isActive: true,
        revokedAt: null,
        revokedReason: null,
      },
    });

    await tx.businessMembership.updateMany({
      where: {
        userId: input.accountantUserId,
        businessId: input.businessId,
      },
      data: {
        branchIds: nextBranchIds,
        financialYears: nextFinancialYears,
        permissions: nextPermissions,
        isActive: true,
        revokedAt: null,
      },
    });

    await recordAuditEvent(
      {
        businessId: input.businessId,
        actorUserId: input.actorUserId,
        actorEmail: input.actorEmail,
        actorName: input.actorName,
        actorRole: 'OWNER',
        action: 'ACCOUNTANT_ACCESS_UPDATED',
        entityType: 'AccountantBusinessAccess',
        entityId: existing.id,
        previousValue: {
          branchScope: existing.branchScope,
          branchIds: existing.branchIds,
          fyScope: existing.fyScope,
          financialYears: existing.financialYears,
          permissions: existing.permissions,
          canApproveSensitive: existing.canApproveSensitive,
          canFileGst: existing.canFileGst,
        },
        newValue: {
          branchScope: updated.branchScope,
          branchIds: updated.branchIds,
          fyScope: updated.fyScope,
          financialYears: updated.financialYears,
          permissions: updated.permissions,
          canApproveSensitive: updated.canApproveSensitive,
          canFileGst: updated.canFileGst,
        },
      },
      tx
    );

    return updated;
  });
}

export async function revokeAccountantAccess(params: {
  businessId: string;
  accountantUserId: string;
  actorUserId: string;
  actorEmail?: string | null;
  actorName?: string | null;
  reason?: string | null;
}) {
  const existing = await prisma.accountantBusinessAccess.findUnique({
    where: {
      userId_businessId: {
        userId: params.accountantUserId,
        businessId: params.businessId,
      },
    },
  });

  if (!existing) {
    // Also check if legacy BusinessMembership exists with ACCOUNTANT role
    const membership = await prisma.businessMembership.findUnique({
      where: {
        userId_businessId: {
          userId: params.accountantUserId,
          businessId: params.businessId,
        },
      },
    });
    if (!membership || normalizeErpRole(membership.role) !== 'ACCOUNTANT') {
      throw new Error('Active accountant access record not found for this business.');
    }
  }

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.accountantBusinessAccess.update({
        where: { id: existing.id },
        data: {
          isActive: false,
          revokedAt: now,
          revokedReason: params.reason ?? 'Revoked by Business Owner',
        },
      });
    }

    await tx.businessMembership.updateMany({
      where: {
        userId: params.accountantUserId,
        businessId: params.businessId,
      },
      data: {
        isActive: false,
        revokedAt: now,
      },
    });

    // Clear pinned workspace on active sessions so revoked accountant loses access immediately
    await tx.session.updateMany({
      where: {
        userId: params.accountantUserId,
        businessId: params.businessId,
      },
      data: {
        businessId: null,
        branchId: null,
      },
    });

    await recordAuditEvent(
      {
        businessId: params.businessId,
        actorUserId: params.actorUserId,
        actorEmail: params.actorEmail,
        actorName: params.actorName,
        actorRole: 'OWNER',
        action: 'ACCOUNTANT_ACCESS_REVOKED',
        entityType: 'AccountantBusinessAccess',
        entityId: existing?.id ?? params.accountantUserId,
        previousValue: { isActive: true, accountantUserId: params.accountantUserId },
        newValue: { isActive: false, revokedAt: now.toISOString() },
        reason: params.reason ?? 'Revoked by Business Owner',
      },
      tx
    );

    return { revoked: true };
  });
}

export async function revokePendingAccountantInvitation(params: {
  businessId: string;
  invitationId: string;
  actorUserId: string;
  actorEmail?: string | null;
  actorName?: string | null;
}) {
  const existing = await prisma.accountantInvitation.findFirst({
    where: {
      id: params.invitationId,
      businessId: params.businessId,
      status: AccountantInvitationStatus.PENDING,
    },
  });
  if (!existing) {
    throw new Error('Pending accountant invitation not found.');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.accountantInvitation.update({
      where: { id: existing.id },
      data: {
        status: AccountantInvitationStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    await recordAuditEvent(
      {
        businessId: params.businessId,
        actorUserId: params.actorUserId,
        actorEmail: params.actorEmail,
        actorName: params.actorName,
        actorRole: 'OWNER',
        action: 'ACCOUNTANT_INVITATION_REVOKED',
        entityType: 'AccountantInvitation',
        entityId: existing.id,
        newValue: { invitedEmail: existing.invitedEmail, status: 'REVOKED' },
      },
      tx
    );

    return updated;
  });
}

