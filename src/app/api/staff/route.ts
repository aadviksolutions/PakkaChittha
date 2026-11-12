import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthError, TenantIsolationError, requireGrowthAccess } from '@/lib/auth/guards';
import { hashPassword } from '@/lib/auth/password';
import { BusinessRole } from '@prisma/client';
import { getBusinessEntitlements } from '@/lib/subscription/entitlements';
import {
  DEFAULT_ACCOUNTANT_PERMISSIONS,
  normalizeErpRole,
  recordAuditEvent,
  sanitizeAccountantPermissions,
} from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const ASSIGNABLE_STAFF_ROLES = new Set<string>([
  BusinessRole.BILLING_STAFF,
  BusinessRole.ACCOUNTANT,
  BusinessRole.INVENTORY_MANAGER,
  'MANAGER',
  'OPERATOR',
  'VIEWER',
]);

function handleStaffError(error: unknown, fallbackMessage: string) {
  if (error instanceof AuthError || error instanceof TenantIsolationError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
  const message = error instanceof Error ? error.message : fallbackMessage;
  return NextResponse.json(
    { error: message },
    { status: message.includes('Unauthorized') ? 401 : 500 }
  );
}

export async function GET(_request: NextRequest) {
  try {
    const authContext = await requireGrowthAccess();

    const [memberships, accesses] = await Promise.all([
      prisma.businessMembership.findMany({
        where: { businessId: authContext.business.id, isActive: true },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.accountantBusinessAccess.findMany({
        where: { businessId: authContext.business.id },
      }),
    ]);

    const accessMap = new Map(accesses.map((a) => [a.userId, a]));

    return NextResponse.json({
      staff: memberships.map((m) => {
        const acc = accessMap.get(m.userId);
        return {
          membershipId: m.id,
          userId: m.user.id,
          name: m.user.name,
          email: m.user.email,
          phone: m.user.phone,
          role: m.role,
          erpRole: normalizeErpRole(m.role),
          branchIds: acc?.branchIds ?? m.branchIds ?? [],
          financialYears: acc?.financialYears ?? m.financialYears ?? [],
          permissions: acc?.permissions ?? m.permissions ?? [],
          branchScope: acc?.branchScope ?? 'ALL',
          fyScope: acc?.fyScope ?? 'ALL',
          canApproveSensitive: acc?.canApproveSensitive ?? false,
          canFileGst: acc?.canFileGst ?? false,
          createdAt: m.createdAt,
        };
      }),
      currentUserRole: authContext.userRole,
      currentUserErpRole: normalizeErpRole(authContext.userRole),
      currentUserId: authContext.session.user.id,
    });
  } catch (error) {
    return handleStaffError(error, 'Unauthorized or failed to fetch staff');
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireGrowthAccess(undefined, ['BUSINESS_OWNER', 'OWNER']);
    const body = await request.json();

    // Enforce Plan User Limit on the Server
    const entitlements = await getBusinessEntitlements(authContext.business.id);
    const currentMemberCount = await prisma.businessMembership.count({
      where: { businessId: authContext.business.id, isActive: true },
    });

    if (currentMemberCount >= entitlements.limits.maxUsers) {
      return NextResponse.json(
        {
          error: `Your current ${entitlements.planName} plan is limited to ${entitlements.limits.maxUsers} user(s) (including owner). Please upgrade to add more staff.`,
          upgradeRequired: true,
          limitReached: 'maxUsers',
          maxUsers: entitlements.limits.maxUsers,
          currentUsers: currentMemberCount,
        },
        { status: 403 }
      );
    }

    const { name, email, phone, password, role } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Staff name is required' }, { status: 400 });
    }

    if (!email || !email.trim() || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    if (typeof role !== 'string' || !ASSIGNABLE_STAFF_ROLES.has(role)) {
      return NextResponse.json({ error: 'Invalid staff role specified' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    let existingInactiveMembershipId: string | null = null;

    if (user) {
      const existingMembership = await prisma.businessMembership.findUnique({
        where: {
          userId_businessId: {
            userId: user.id,
            businessId: authContext.business.id,
          },
        },
      });

      if (existingMembership && existingMembership.isActive) {
        return NextResponse.json(
          { error: 'User is already an active member of this business workspace' },
          { status: 400 }
        );
      }

      if (existingMembership) {
        existingInactiveMembershipId = existingMembership.id;
      }
    } else {
      if (!password || password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters for a new user account' },
          { status: 400 }
        );
      }

      const passwordHash = await hashPassword(password);
      user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          phone: phone?.trim() || null,
          passwordHash,
        },
      });
    }

    const targetRole = role as BusinessRole;
    const isAccountant = normalizeErpRole(targetRole) === 'ACCOUNTANT';
    const permissions = isAccountant
      ? sanitizeAccountantPermissions(body?.permissions ?? DEFAULT_ACCOUNTANT_PERMISSIONS)
      : Array.isArray(body?.permissions)
        ? body.permissions.filter((p: unknown): p is string => typeof p === 'string')
        : [];

    const membership = await prisma.$transaction(async (tx) => {
      const upserted = existingInactiveMembershipId
        ? await tx.businessMembership.update({
            where: { id: existingInactiveMembershipId },
            data: {
              role: targetRole,
              permissions,
              isActive: true,
              revokedAt: null,
              invitedByUserId: authContext.session.user.id,
            },
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } },
            },
          })
        : await tx.businessMembership.create({
            data: {
              userId: user!.id,
              businessId: authContext.business.id,
              role: targetRole,
              permissions,
              isActive: true,
              invitedByUserId: authContext.session.user.id,
            },
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } },
            },
          });

      if (isAccountant) {
        await tx.accountantBusinessAccess.upsert({
          where: {
            userId_businessId: {
              userId: user!.id,
              businessId: authContext.business.id,
            },
          },
          update: {
            grantedByUserId: authContext.session.user.id,
            permissions,
            isActive: true,
            revokedAt: null,
            revokedReason: null,
          },
          create: {
            userId: user!.id,
            businessId: authContext.business.id,
            grantedByUserId: authContext.session.user.id,
            permissions,
            isActive: true,
          },
        });
      }

      await recordAuditEvent(
        {
          businessId: authContext.business.id,
          actorUserId: authContext.session.user.id,
          actorEmail: authContext.session.user.email,
          actorName: authContext.session.user.name,
          actorRole: 'OWNER',
          action: 'STAFF_MEMBER_ADDED',
          entityType: 'BusinessMembership',
          entityId: upserted.id,
          newValue: { email: normalizedEmail, role: targetRole, erpRole: normalizeErpRole(targetRole) },
        },
        tx
      );

      return upserted;
    });

    return NextResponse.json(
      {
        message: 'Staff member added successfully',
        staff: {
          membershipId: membership.id,
          userId: membership.user.id,
          name: membership.user.name,
          email: membership.user.email,
          phone: membership.user.phone,
          role: membership.role,
          erpRole: normalizeErpRole(membership.role),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleStaffError(error, 'Failed to add staff member');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authContext = await requireGrowthAccess(undefined, ['BUSINESS_OWNER', 'OWNER']);
    const body = await request.json();
    const membershipId = typeof body?.membershipId === 'string' ? body.membershipId : '';
    const nextRole = typeof body?.role === 'string' ? body.role : '';

    if (!membershipId) {
      return NextResponse.json({ error: 'membershipId is required' }, { status: 400 });
    }
    if (nextRole && !ASSIGNABLE_STAFF_ROLES.has(nextRole)) {
      return NextResponse.json({ error: 'Invalid target staff role' }, { status: 400 });
    }

    const existing = await prisma.businessMembership.findFirst({
      where: {
        id: membershipId,
        businessId: authContext.business.id,
        isActive: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Active staff membership not found' }, { status: 404 });
    }
    if (normalizeErpRole(existing.role) === 'OWNER') {
      return NextResponse.json({ error: 'Cannot alter Business Owner role here' }, { status: 403 });
    }

    const updatedRole = (nextRole || existing.role) as BusinessRole;

    const updated = await prisma.$transaction(async (tx) => {
      const m = await tx.businessMembership.update({
        where: { id: existing.id },
        data: {
          role: updatedRole,
          ...(Array.isArray(body?.permissions) ? { permissions: body.permissions } : {}),
        },
      });

      if (normalizeErpRole(updatedRole) === 'ACCOUNTANT') {
        await tx.accountantBusinessAccess.upsert({
          where: {
            userId_businessId: {
              userId: existing.userId,
              businessId: authContext.business.id,
            },
          },
          update: {
            isActive: true,
            revokedAt: null,
            grantedByUserId: authContext.session.user.id,
          },
          create: {
            userId: existing.userId,
            businessId: authContext.business.id,
            grantedByUserId: authContext.session.user.id,
            permissions: [...DEFAULT_ACCOUNTANT_PERMISSIONS],
            isActive: true,
          },
        });
      } else {
        await tx.accountantBusinessAccess.updateMany({
          where: { userId: existing.userId, businessId: authContext.business.id },
          data: { isActive: false, revokedAt: new Date(), revokedReason: `Role changed to ${updatedRole}` },
        });
      }

      await recordAuditEvent(
        {
          businessId: authContext.business.id,
          actorUserId: authContext.session.user.id,
          actorEmail: authContext.session.user.email,
          actorName: authContext.session.user.name,
          actorRole: 'OWNER',
          action: 'STAFF_ROLE_UPDATED',
          entityType: 'BusinessMembership',
          entityId: existing.id,
          previousValue: { role: existing.role },
          newValue: { role: updatedRole },
        },
        tx
      );

      return m;
    });

    return NextResponse.json({ success: true, membership: updated });
  } catch (error) {
    return handleStaffError(error, 'Failed to update staff role');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authContext = await requireGrowthAccess(undefined, ['BUSINESS_OWNER', 'OWNER']);
    const { searchParams } = new URL(request.url);
    const membershipId = searchParams.get('id');

    if (!membershipId) {
      return NextResponse.json({ error: 'Membership ID is required' }, { status: 400 });
    }

    const membership = await prisma.businessMembership.findFirst({
      where: {
        id: membershipId,
        businessId: authContext.business.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Membership not found or unauthorized' }, { status: 404 });
    }

    if (normalizeErpRole(membership.role) === 'OWNER') {
      return NextResponse.json(
        { error: 'Cannot remove the primary Business Owner account' },
        { status: 403 }
      );
    }

    if (membership.userId === authContext.session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own active membership' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.businessMembership.update({
        where: { id: membershipId },
        data: { isActive: false, revokedAt: new Date() },
      });

      await tx.accountantBusinessAccess.updateMany({
        where: { userId: membership.userId, businessId: authContext.business.id },
        data: { isActive: false, revokedAt: new Date(), revokedReason: 'Removed by Owner' },
      });

      await tx.session.updateMany({
        where: { userId: membership.userId, businessId: authContext.business.id },
        data: { businessId: null, branchId: null },
      });

      await recordAuditEvent(
        {
          businessId: authContext.business.id,
          actorUserId: authContext.session.user.id,
          actorEmail: authContext.session.user.email,
          actorName: authContext.session.user.name,
          actorRole: 'OWNER',
          action: 'STAFF_MEMBER_REVOKED',
          entityType: 'BusinessMembership',
          entityId: membershipId,
          previousValue: { userId: membership.userId, role: membership.role, isActive: true },
          newValue: { isActive: false },
        },
        tx
      );
    });

    return NextResponse.json({ success: true, message: 'Staff member removed successfully' });
  } catch (error) {
    return handleStaffError(error, 'Failed to remove staff member');
  }
}
