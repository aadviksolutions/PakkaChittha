import { NextRequest, NextResponse } from 'next/server';
import { AccessScopeType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { AuthError, requireAuth } from '@/lib/auth/guards';
import { ensureBusinessWorkspaceDefaults, normalizeErpRole, recordAuditEvent } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const businessId = typeof body?.businessId === 'string' ? body.businessId.trim() : '';
    const requestedBranchId = typeof body?.branchId === 'string' ? body.branchId.trim() : '';

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const membership = await prisma.businessMembership.findUnique({
      where: {
        userId_businessId: {
          userId: session.user.id,
          businessId,
        },
      },
      include: {
        business: {
          select: { id: true, name: true },
        },
      },
    });

    if (!membership || !membership.isActive) {
      return NextResponse.json(
        { error: 'Access denied: you do not have an active membership for this business.' },
        { status: 403 }
      );
    }

    const erpRole = normalizeErpRole(membership.role);
    const accAccess = await prisma.accountantBusinessAccess.findUnique({
      where: {
        userId_businessId: {
          userId: session.user.id,
          businessId,
        },
      },
    });

    if (erpRole === 'ACCOUNTANT' && accAccess && !accAccess.isActive) {
      return NextResponse.json(
        { error: 'Your accountant access to this business has been revoked.' },
        { status: 403 }
      );
    }

    const seeded = await ensureBusinessWorkspaceDefaults(businessId);
    const allowedBranches =
      erpRole === 'ACCOUNTANT' && accAccess?.branchScope === AccessScopeType.SELECTED
        ? seeded.branches.filter((b) => accAccess.branchIds.includes(b.id))
        : seeded.branches;

    let resolvedBranchId: string | null = null;
    if (requestedBranchId) {
      const branchMatch = allowedBranches.find((b) => b.id === requestedBranchId);
      if (!branchMatch) {
        return NextResponse.json(
          { error: 'Selected branch is invalid or outside your assigned scope.' },
          { status: 403 }
        );
      }
      resolvedBranchId = branchMatch.id;
    } else {
      resolvedBranchId =
        allowedBranches.find((b) => b.isDefault)?.id ?? allowedBranches[0]?.id ?? null;
    }

    await prisma.session.update({
      where: { id: session.sessionId },
      data: {
        businessId,
        branchId: resolvedBranchId,
      },
    });

    await recordAuditEvent({
      businessId,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      actorName: session.user.name,
      actorRole: erpRole,
      action: 'WORKSPACE_SWITCHED',
      entityType: 'Session',
      entityId: session.sessionId,
      previousValue: { businessId: session.activeBusiness?.id ?? null },
      newValue: { businessId, branchId: resolvedBranchId },
    });

    return NextResponse.json({
      success: true,
      activeBusinessId: businessId,
      businessName: membership.business.name,
      activeBranchId: resolvedBranchId,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[POST /api/accountant/switch-business] Error:', error);
    return NextResponse.json({ error: 'Failed to switch business workspace' }, { status: 500 });
  }
}

