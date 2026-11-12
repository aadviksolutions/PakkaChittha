import { NextRequest, NextResponse } from 'next/server';
import { AccessScopeType } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  AuthError,
  TenantIsolationError,
  requireScaleErpAccess,
} from '@/lib/auth/guards';
import {
  PERMISSIONS,
  ensureBusinessWorkspaceDefaults,
  recordAuditEvent,
} from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId') || undefined;

    const { business, entitlements } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.BRANCH_VIEW
    );

    const { branches } = await ensureBusinessWorkspaceDefaults(business.id);
    const visibleBranches =
      business.erpRole === 'ACCOUNTANT' &&
      business.accountantAccess?.branchScope === AccessScopeType.SELECTED
        ? branches.filter((b) => business.accountantAccess!.branchIds.includes(b.id))
        : branches;

    return NextResponse.json({
      success: true,
      maxBranches: entitlements.limits.maxLocations,
      branches: visibleBranches,
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[GET /api/branches] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch branches' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { business, session, entitlements } = await requireScaleErpAccess(
      undefined,
      PERMISSIONS.BRANCH_MANAGE,
      ['BUSINESS_OWNER', 'OWNER', 'MANAGER']
    );

    await ensureBusinessWorkspaceDefaults(business.id);

    const body = await req.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const rawCode = typeof body?.code === 'string' ? body.code.trim() : '';
    const code = (rawCode || name)
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '')
      .slice(0, 16);

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Branch name and short alphanumeric code are required.' },
        { status: 400 }
      );
    }

    const activeCount = await prisma.branch.count({
      where: { businessId: business.id, isActive: true },
    });

    if (activeCount >= entitlements.limits.maxLocations) {
      return NextResponse.json(
        {
          error: `Branch limit reached (${activeCount}/${entitlements.limits.maxLocations}) for your ${entitlements.planName} plan.`,
        },
        { status: 403 }
      );
    }

    const existingCode = await prisma.branch.findUnique({
      where: {
        businessId_code: { businessId: business.id, code },
      },
    });
    if (existingCode) {
      return NextResponse.json(
        { error: `A branch with code '${code}' already exists.` },
        { status: 400 }
      );
    }

    const branch = await prisma.$transaction(async (tx) => {
      if (body?.isDefault) {
        await tx.branch.updateMany({
          where: { businessId: business.id },
          data: { isDefault: false },
        });
      }

      const created = await tx.branch.create({
        data: {
          businessId: business.id,
          name,
          code,
          gstin: typeof body?.gstin === 'string' ? body.gstin.trim().toUpperCase() || null : null,
          state: typeof body?.state === 'string' ? body.state.trim() || null : null,
          city: typeof body?.city === 'string' ? body.city.trim() || null : null,
          address: typeof body?.address === 'string' ? body.address.trim() || null : null,
          isDefault: Boolean(body?.isDefault),
          isActive: true,
        },
      });

      await recordAuditEvent(
        {
          businessId: business.id,
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          actorName: session.user.name,
          actorRole: business.erpRole,
          action: 'BRANCH_CREATED',
          entityType: 'Branch',
          entityId: created.id,
          newValue: { name: created.name, code: created.code, state: created.state },
        },
        tx
      );

      return created;
    });

    return NextResponse.json({ success: true, branch });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[POST /api/branches] Error:', error);
    return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { business, session } = await requireScaleErpAccess(
      undefined,
      PERMISSIONS.BRANCH_MANAGE,
      ['BUSINESS_OWNER', 'OWNER', 'MANAGER']
    );

    const body = await req.json();
    const branchId = typeof body?.id === 'string' ? body.id.trim() : '';
    if (!branchId) {
      return NextResponse.json({ error: 'Branch id is required' }, { status: 400 });
    }

    const existing = await prisma.branch.findFirst({
      where: { id: branchId, businessId: business.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Branch not found in this business' }, { status: 404 });
    }

    if (body?.isActive === false && existing.isDefault) {
      return NextResponse.json(
        { error: 'Cannot deactivate the default Main Branch. Set another default branch first.' },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (body?.isDefault === true) {
        await tx.branch.updateMany({
          where: { businessId: business.id },
          data: { isDefault: false },
        });
      }

      const nextBranch = await tx.branch.update({
        where: { id: existing.id },
        data: {
          name: typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : existing.name,
          gstin:
            body?.gstin !== undefined
              ? (typeof body.gstin === 'string' ? body.gstin.trim().toUpperCase() || null : null)
              : existing.gstin,
          state:
            body?.state !== undefined
              ? (typeof body.state === 'string' ? body.state.trim() || null : null)
              : existing.state,
          city:
            body?.city !== undefined
              ? (typeof body.city === 'string' ? body.city.trim() || null : null)
              : existing.city,
          address:
            body?.address !== undefined
              ? (typeof body.address === 'string' ? body.address.trim() || null : null)
              : existing.address,
          isDefault: typeof body?.isDefault === 'boolean' ? body.isDefault : existing.isDefault,
          isActive: typeof body?.isActive === 'boolean' ? body.isActive : existing.isActive,
        },
      });

      await recordAuditEvent(
        {
          businessId: business.id,
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          actorName: session.user.name,
          actorRole: business.erpRole,
          action: 'BRANCH_UPDATED',
          entityType: 'Branch',
          entityId: existing.id,
          previousValue: { name: existing.name, isDefault: existing.isDefault, isActive: existing.isActive },
          newValue: { name: nextBranch.name, isDefault: nextBranch.isDefault, isActive: nextBranch.isActive },
        },
        tx
      );

      return nextBranch;
    });

    return NextResponse.json({ success: true, branch: updated });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[PATCH /api/branches] Error:', error);
    return NextResponse.json({ error: 'Failed to update branch' }, { status: 500 });
  }
}

