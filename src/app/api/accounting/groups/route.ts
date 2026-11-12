import { NextRequest, NextResponse } from 'next/server';
import { AccountingGroupType } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  AuthError,
  TenantIsolationError,
  requireScaleErpAccess,
} from '@/lib/auth/guards';
import { PERMISSIONS, recordAuditEvent } from '@/lib/rbac';
import { ensureBusinessCOA } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId') || undefined;

    const { business } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.ACCOUNTING_VIEW
    );

    const existingCount = await prisma.accountingGroup.count({
      where: { businessId: business.id },
    });
    if (existingCount === 0) {
      await ensureBusinessCOA(business.id);
    }

    const groups = await prisma.accountingGroup.findMany({
      where: { businessId: business.id, isActive: true },
      include: {
        _count: {
          select: { ledgers: { where: { isActive: true } } },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        type: g.type,
        parentGroupId: g.parentGroupId,
        sortOrder: g.sortOrder,
        isSystem: g.isSystem,
        ledgerCount: g._count.ledgers,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[GET /api/accounting/groups] Error:', error);
    return NextResponse.json({ error: 'Failed to load accounting groups.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requestedBusinessId =
      typeof body?.businessId === 'string' ? body.businessId : undefined;

    const { business, session } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.ACCOUNTING_LEDGER_MANAGE,
      ['BUSINESS_OWNER', 'OWNER', 'ACCOUNTANT']
    );

    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const type = body?.type as AccountingGroupType;
    const description =
      typeof body?.description === 'string' ? body.description.trim() || null : null;
    const parentGroupId =
      typeof body?.parentGroupId === 'string' && body.parentGroupId.trim()
        ? body.parentGroupId.trim()
        : null;
    const sortOrder = Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 100;

    if (!name) {
      return NextResponse.json({ error: 'Group name is required.' }, { status: 400 });
    }

    if (!Object.values(AccountingGroupType).includes(type)) {
      return NextResponse.json({ error: 'Invalid accounting group type.' }, { status: 400 });
    }

    if (parentGroupId) {
      const parent = await prisma.accountingGroup.findFirst({
        where: { id: parentGroupId, businessId: business.id },
        select: { id: true, type: true },
      });
      if (!parent) {
        return NextResponse.json({ error: 'Parent accounting group not found.' }, { status: 404 });
      }
    }

    const group = await prisma.accountingGroup.create({
      data: {
        businessId: business.id,
        name,
        description,
        type,
        parentGroupId,
        sortOrder,
        isSystem: false,
        isActive: true,
      },
    });

    await recordAuditEvent({
      businessId: business.id,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      actorName: session.user.name,
      actorRole: business.erpRole,
      action: 'ACCOUNTING_GROUP_CREATED',
      entityType: 'AccountingGroup',
      entityId: group.id,
      newValue: { name: group.name, type: group.type, parentGroupId: group.parentGroupId },
    });

    return NextResponse.json({ success: true, group }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[POST /api/accounting/groups] Error:', error);
    return NextResponse.json({ error: 'Failed to create accounting group.' }, { status: 500 });
  }
}

