import { NextRequest, NextResponse } from 'next/server';
import { AccessScopeType } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  AuthError,
  TenantIsolationError,
  requireScaleErpAccess,
} from '@/lib/auth/guards';
import {
  ACCOUNTANT_ASSIGNABLE_PERMISSIONS,
  PERMISSIONS,
  createAccountantInvitation,
  ensureBusinessWorkspaceDefaults,
  revokePendingAccountantInvitation,
} from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { business, entitlements } = await requireScaleErpAccess(
      undefined,
      PERMISSIONS.ACCOUNTANT_MANAGE,
      ['BUSINESS_OWNER', 'OWNER']
    );

    const { branches, financialYears } = await ensureBusinessWorkspaceDefaults(business.id);

    const [invitations, accesses, activeStaffCount] = await Promise.all([
      prisma.accountantInvitation.findMany({
        where: { businessId: business.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.accountantBusinessAccess.findMany({
        where: { businessId: business.id },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.businessMembership.count({
        where: { businessId: business.id, isActive: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      seatLimit: {
        activeSeats: activeStaffCount,
        maxStaffSeats: entitlements.limits.maxUsers,
      },
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        isDefault: b.isDefault,
      })),
      financialYears: financialYears.map((fy) => ({
        id: fy.id,
        code: fy.code,
        label: fy.label,
        isClosed: fy.isClosed,
      })),
      assignablePermissions: ACCOUNTANT_ASSIGNABLE_PERMISSIONS,
      invitations: invitations.map((inv) => ({
        id: inv.id,
        invitedEmail: inv.invitedEmail,
        invitedName: inv.invitedName,
        status: inv.status,
        branchScope: inv.branchScope,
        branchIds: inv.branchIds,
        fyScope: inv.fyScope,
        financialYears: inv.financialYears,
        permissions: inv.permissions,
        canApproveSensitive: inv.canApproveSensitive,
        canFileGst: inv.canFileGst,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        acceptedAt: inv.acceptedAt,
        revokedAt: inv.revokedAt,
      })),
      accountants: accesses,
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[GET /api/accountant/invitations] Error:', error);
    return NextResponse.json({ error: 'Failed to load accountant invitations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { business, session, entitlements } = await requireScaleErpAccess(
      undefined,
      PERMISSIONS.ACCOUNTANT_MANAGE,
      ['BUSINESS_OWNER', 'OWNER']
    );

    const body = await req.json();
    const invitedEmail = typeof body?.invitedEmail === 'string' ? body.invitedEmail : '';
    const invitedName = typeof body?.invitedName === 'string' ? body.invitedName : null;
    const branchScope =
      body?.branchScope === AccessScopeType.SELECTED
        ? AccessScopeType.SELECTED
        : AccessScopeType.ALL;
    const branchIds = Array.isArray(body?.branchIds)
      ? body.branchIds.filter((v: unknown): v is string => typeof v === 'string')
      : [];
    const fyScope =
      body?.fyScope === AccessScopeType.SELECTED
        ? AccessScopeType.SELECTED
        : AccessScopeType.ALL;
    const financialYears = Array.isArray(body?.financialYears)
      ? body.financialYears.filter((v: unknown): v is string => typeof v === 'string')
      : [];
    const permissions = Array.isArray(body?.permissions)
      ? body.permissions.filter((v: unknown): v is string => typeof v === 'string')
      : undefined;

    const { invitation, rawToken } = await createAccountantInvitation({
      businessId: business.id,
      invitedEmail,
      invitedName,
      invitedByUserId: session.user.id,
      invitedByEmail: session.user.email,
      invitedByName: session.user.name,
      branchScope,
      branchIds,
      fyScope,
      financialYears,
      permissions,
      canApproveSensitive: Boolean(body?.canApproveSensitive),
      canFileGst: Boolean(body?.canFileGst),
      maxStaffSeats: entitlements.limits.maxUsers,
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        invitedEmail: invitation.invitedEmail,
        invitedName: invitation.invitedName,
        status: invitation.status,
        branchScope: invitation.branchScope,
        branchIds: invitation.branchIds,
        fyScope: invitation.fyScope,
        financialYears: invitation.financialYears,
        permissions: invitation.permissions,
        canApproveSensitive: invitation.canApproveSensitive,
        canFileGst: invitation.canFileGst,
        expiresAt: invitation.expiresAt,
      },
      inviteToken: rawToken,
      invitePath: `/accountant/businesses?token=${rawToken}`,
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to invite accountant';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { business, session } = await requireScaleErpAccess(
      undefined,
      PERMISSIONS.ACCOUNTANT_MANAGE,
      ['BUSINESS_OWNER', 'OWNER']
    );

    const { searchParams } = new URL(req.url);
    const invitationId = searchParams.get('id');
    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation id is required' }, { status: 400 });
    }

    const updated = await revokePendingAccountantInvitation({
      businessId: business.id,
      invitationId,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      actorName: session.user.name,
    });

    return NextResponse.json({ success: true, invitation: updated });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to revoke invitation';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

