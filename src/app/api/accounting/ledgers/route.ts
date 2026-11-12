import { NextRequest, NextResponse } from 'next/server';
import { AccountingGroupType, LedgerNature, Prisma, VoucherStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  AuthError,
  TenantIsolationError,
  requireScaleErpAccess,
} from '@/lib/auth/guards';
import { PERMISSIONS, parseIndianFyCode, recordAuditEvent } from '@/lib/rbac';
import { ensureBusinessCOA, toDecimal2 } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId') || undefined;
    const groupId = searchParams.get('groupId') || undefined;
    const groupType = searchParams.get('type') as AccountingGroupType | null;
    const search = searchParams.get('search')?.trim() || undefined;
    const fyCode = parseIndianFyCode(searchParams.get('fyCode')).code;

    const { business } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.ACCOUNTING_VIEW
    );

    const existingCount = await prisma.ledger.count({ where: { businessId: business.id } });
    if (existingCount === 0) {
      await ensureBusinessCOA(business.id, fyCode);
    }

    const where: Prisma.LedgerWhereInput = {
      businessId: business.id,
      isActive: true,
      ...(groupId ? { groupId } : {}),
      ...(groupType && Object.values(AccountingGroupType).includes(groupType)
        ? { group: { type: groupType } }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [ledgers, entryTotals] = await Promise.all([
      prisma.ledger.findMany({
        where,
        include: {
          group: { select: { id: true, name: true, type: true, sortOrder: true } },
        },
        orderBy: [{ group: { sortOrder: 'asc' } }, { name: 'asc' }],
      }),
      prisma.voucherEntry.groupBy({
        by: ['ledgerId'],
        where: {
          voucher: {
            businessId: business.id,
            fyCode,
            status: VoucherStatus.POSTED,
          },
        },
        _sum: { debitAmount: true, creditAmount: true },
      }),
    ]);

    const balanceMap = new Map<string, { dr: Prisma.Decimal; cr: Prisma.Decimal }>();
    for (const row of entryTotals) {
      balanceMap.set(row.ledgerId, {
        dr: row._sum.debitAmount ? toDecimal2(row._sum.debitAmount) : new Prisma.Decimal(0),
        cr: row._sum.creditAmount ? toDecimal2(row._sum.creditAmount) : new Prisma.Decimal(0),
      });
    }

    const formatted = ledgers.map((l) => {
      const openBal = toDecimal2(l.openingBalance);
      const openSigned = l.openingBalanceType === 'CR' ? openBal.negated() : openBal;
      const mov = balanceMap.get(l.id) ?? {
        dr: new Prisma.Decimal(0),
        cr: new Prisma.Decimal(0),
      };
      const closingSigned = openSigned.plus(mov.dr).minus(mov.cr);

      return {
        id: l.id,
        name: l.name,
        code: l.code,
        groupId: l.groupId,
        groupName: l.group.name,
        groupType: l.group.type,
        nature: l.nature,
        openingBalance: openBal.toFixed(2),
        openingBalanceType: l.openingBalanceType,
        periodDr: mov.dr.toFixed(2),
        periodCr: mov.cr.toFixed(2),
        closingBalance: closingSigned.abs().toFixed(2),
        closingBalanceType: closingSigned.gte(0) ? 'DR' : 'CR',
        isSystem: l.isSystem,
        isActive: l.isActive,
        notes: l.notes,
      };
    });

    return NextResponse.json({ success: true, fyCode, ledgers: formatted });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[GET /api/accounting/ledgers] Error:', error);
    return NextResponse.json({ error: 'Failed to load ledgers.' }, { status: 500 });
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
    const code =
      typeof body?.code === 'string' && body.code.trim()
        ? body.code.trim().toUpperCase()
        : null;
    const groupId = typeof body?.groupId === 'string' ? body.groupId.trim() : '';
    const openingBalanceRaw = Number(body?.openingBalance || 0);
    const openingBalanceType = body?.openingBalanceType === 'CR' ? 'CR' : 'DR';
    const notes = typeof body?.notes === 'string' ? body.notes.trim() || null : null;

    if (!name) {
      return NextResponse.json({ error: 'Ledger name is required.' }, { status: 400 });
    }
    if (!groupId) {
      return NextResponse.json({ error: 'Accounting group is required.' }, { status: 400 });
    }
    if (!Number.isFinite(openingBalanceRaw) || openingBalanceRaw < 0) {
      return NextResponse.json(
        { error: 'Opening balance must be zero or a positive number.' },
        { status: 400 }
      );
    }

    const group = await prisma.accountingGroup.findFirst({
      where: { id: groupId, businessId: business.id, isActive: true },
    });
    if (!group) {
      return NextResponse.json({ error: 'Accounting group not found.' }, { status: 404 });
    }

    const defaultNature =
      group.type === AccountingGroupType.ASSETS || group.type === AccountingGroupType.EXPENSES
        ? LedgerNature.DEBIT_NORMAL
        : LedgerNature.CREDIT_NORMAL;
    const nature = Object.values(LedgerNature).includes(body?.nature)
      ? (body.nature as LedgerNature)
      : defaultNature;

    if (code) {
      const dupCode = await prisma.ledger.findUnique({
        where: { businessId_code: { businessId: business.id, code } },
        select: { id: true },
      });
      if (dupCode) {
        return NextResponse.json(
          { error: `A ledger with code '${code}' already exists.` },
          { status: 409 }
        );
      }
    }

    const ledger = await prisma.ledger.create({
      data: {
        businessId: business.id,
        name,
        code,
        groupId: group.id,
        nature,
        openingBalance: toDecimal2(openingBalanceRaw),
        openingBalanceType,
        notes,
        isSystem: false,
        isActive: true,
      },
      include: { group: { select: { id: true, name: true, type: true } } },
    });

    await recordAuditEvent({
      businessId: business.id,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      actorName: session.user.name,
      actorRole: business.erpRole,
      action: 'LEDGER_CREATED',
      entityType: 'Ledger',
      entityId: ledger.id,
      newValue: {
        name: ledger.name,
        code: ledger.code,
        groupName: ledger.group.name,
        openingBalance: ledger.openingBalance.toFixed(2),
        openingBalanceType: ledger.openingBalanceType,
      },
    });

    return NextResponse.json(
      {
        success: true,
        ledger: {
          ...ledger,
          openingBalance: ledger.openingBalance.toFixed(2),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[POST /api/accounting/ledgers] Error:', error);
    return NextResponse.json({ error: 'Failed to create ledger.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id')?.trim();
    const body = await req.json();
    const targetId = id || (typeof body?.id === 'string' ? body.id.trim() : '');
    const requestedBusinessId =
      typeof body?.businessId === 'string' ? body.businessId : undefined;

    const { business, session } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.ACCOUNTING_LEDGER_MANAGE,
      ['BUSINESS_OWNER', 'OWNER', 'ACCOUNTANT']
    );

    if (!targetId) {
      return NextResponse.json({ error: 'Ledger id is required.' }, { status: 400 });
    }

    const existing = await prisma.ledger.findFirst({
      where: { id: targetId, businessId: business.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Ledger not found.' }, { status: 404 });
    }

    const updateData: Prisma.LedgerUpdateInput = {};
    if (typeof body?.name === 'string' && body.name.trim()) {
      updateData.name = body.name.trim();
    }
    if (body?.notes !== undefined) {
      updateData.notes = typeof body.notes === 'string' ? body.notes.trim() || null : null;
    }
    if (typeof body?.isActive === 'boolean') {
      if (existing.isSystem && body.isActive === false) {
        return NextResponse.json(
          { error: 'System ledgers cannot be deactivated.' },
          { status: 400 }
        );
      }
      updateData.isActive = body.isActive;
    }

    if (!existing.isSystem) {
      if (typeof body?.groupId === 'string' && body.groupId.trim()) {
        const group = await prisma.accountingGroup.findFirst({
          where: { id: body.groupId.trim(), businessId: business.id, isActive: true },
          select: { id: true },
        });
        if (!group) {
          return NextResponse.json({ error: 'Target accounting group not found.' }, { status: 404 });
        }
        updateData.group = { connect: { id: group.id } };
      }
      if (body?.nature && Object.values(LedgerNature).includes(body.nature)) {
        updateData.nature = body.nature as LedgerNature;
      }
    } else if (body?.groupId !== undefined || body?.nature !== undefined) {
      return NextResponse.json(
        { error: 'Nature and group cannot be changed for system ledgers.' },
        { status: 400 }
      );
    }

    const updated = await prisma.ledger.update({
      where: { id: existing.id },
      data: updateData,
    });

    await recordAuditEvent({
      businessId: business.id,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      actorName: session.user.name,
      actorRole: business.erpRole,
      action: 'LEDGER_UPDATED',
      entityType: 'Ledger',
      entityId: updated.id,
      previousValue: { name: existing.name, isActive: existing.isActive },
      newValue: { name: updated.name, isActive: updated.isActive },
    });

    return NextResponse.json({
      success: true,
      ledger: {
        ...updated,
        openingBalance: updated.openingBalance.toFixed(2),
      },
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[PATCH /api/accounting/ledgers] Error:', error);
    return NextResponse.json({ error: 'Failed to update ledger.' }, { status: 500 });
  }
}

