import { NextRequest, NextResponse } from 'next/server';
import { Prisma, VoucherStatus, VoucherType } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  AuthError,
  TenantIsolationError,
  requireBranchAndFyScope,
  requireScaleErpAccess,
} from '@/lib/auth/guards';
import { PERMISSIONS, parseIndianFyCode } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId') || undefined;
    const dateParam = searchParams.get('date');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const branchId = searchParams.get('branchId') || undefined;
    const voucherType = searchParams.get('voucherType') as VoucherType | null;
    const status = searchParams.get('status') as VoucherStatus | null;
    const fyCodeParam = searchParams.get('fyCode');
    const fyCode = fyCodeParam ? parseIndianFyCode(fyCodeParam).code : undefined;

    const { business } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.ACCOUNTING_VIEW
    );

    requireBranchAndFyScope(business, branchId, fyCode);

    const dateFilter: Prisma.DateTimeFilter = {};
    if (dateParam) {
      const target = new Date(dateParam);
      if (Number.isNaN(target.getTime())) {
        return NextResponse.json({ error: 'Invalid date parameter.' }, { status: 400 });
      }
      dateFilter.equals = target;
    } else if (startDateParam || endDateParam) {
      if (startDateParam) {
        const s = new Date(startDateParam);
        if (Number.isNaN(s.getTime())) {
          return NextResponse.json({ error: 'Invalid startDate parameter.' }, { status: 400 });
        }
        dateFilter.gte = s;
      }
      if (endDateParam) {
        const e = new Date(endDateParam);
        if (Number.isNaN(e.getTime())) {
          return NextResponse.json({ error: 'Invalid endDate parameter.' }, { status: 400 });
        }
        dateFilter.lte = e;
      }
    }

    const vouchers = await prisma.voucher.findMany({
      where: {
        businessId: business.id,
        ...(fyCode ? { fyCode } : {}),
        ...(branchId && branchId !== 'ALL' ? { branchId } : {}),
        ...(voucherType && Object.values(VoucherType).includes(voucherType)
          ? { voucherType }
          : {}),
        ...(status && Object.values(VoucherStatus).includes(status) ? { status } : {}),
        ...(dateParam || startDateParam || endDateParam ? { voucherDate: dateFilter } : {}),
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        entries: {
          include: {
            ledger: { select: { id: true, name: true, code: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [{ voucherDate: 'desc' }, { createdAt: 'desc' }],
      take: 250,
    });

    return NextResponse.json({
      success: true,
      vouchers: vouchers.map((v) => ({
        id: v.id,
        voucherNumber: v.voucherNumber,
        voucherType: v.voucherType,
        voucherDate: v.voucherDate.toISOString().slice(0, 10),
        fyCode: v.fyCode,
        branch: v.branch,
        narration: v.narration,
        totalAmount: v.totalAmount.toFixed(2),
        status: v.status,
        referenceType: v.referenceType,
        referenceId: v.referenceId,
        entries: v.entries.map((e) => ({
          id: e.id,
          ledgerId: e.ledgerId,
          ledgerName: e.ledger.name,
          ledgerCode: e.ledger.code,
          debitAmount: e.debitAmount.toFixed(2),
          creditAmount: e.creditAmount.toFixed(2),
          narration: e.narration,
        })),
      })),
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[GET /api/accounting/day-book] Error:', error);
    return NextResponse.json({ error: 'Failed to load Day Book.' }, { status: 500 });
  }
}

