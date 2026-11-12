import { NextRequest, NextResponse } from 'next/server';
import { Prisma, VoucherStatus, VoucherType } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  AuthError,
  TenantIsolationError,
  requireBranchAndFyScope,
  requireScaleErpAccess,
} from '@/lib/auth/guards';
import {
  PERMISSIONS,
  buildIndianFyWindow,
  getIndianFyStartYear,
  parseIndianFyCode,
} from '@/lib/rbac';
import {
  VoucherImbalanceError,
  VoucherValidationError,
  createDraftVoucher,
  postVoucher,
} from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId') || undefined;
    const voucherType = searchParams.get('voucherType') as VoucherType | null;
    const status = searchParams.get('status') as VoucherStatus | null;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const referenceId = searchParams.get('referenceId') || undefined;
    const fyCodeParam = searchParams.get('fyCode');
    const branchId = searchParams.get('branchId') || undefined;
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '50', 10) || 50));

    const { business } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.ACCOUNTING_VIEW
    );

    const fyCode = fyCodeParam ? parseIndianFyCode(fyCodeParam).code : undefined;
    requireBranchAndFyScope(business, branchId, fyCode);

    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDateParam) {
      const d = new Date(startDateParam);
      if (!Number.isNaN(d.getTime())) dateFilter.gte = d;
    }
    if (endDateParam) {
      const d = new Date(endDateParam);
      if (!Number.isNaN(d.getTime())) dateFilter.lte = d;
    }

    const where: Prisma.VoucherWhereInput = {
      businessId: business.id,
      ...(fyCode ? { fyCode } : {}),
      ...(branchId && branchId !== 'ALL' ? { branchId } : {}),
      ...(voucherType && Object.values(VoucherType).includes(voucherType)
        ? { voucherType }
        : {}),
      ...(status && Object.values(VoucherStatus).includes(status) ? { status } : {}),
      ...(referenceId ? { referenceId } : {}),
      ...(startDateParam || endDateParam ? { voucherDate: dateFilter } : {}),
    };

    const [vouchers, total] = await Promise.all([
      prisma.voucher.findMany({
        where,
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
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.voucher.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      page,
      limit,
      total,
      vouchers: vouchers.map((v) => ({
        ...v,
        voucherDate: v.voucherDate.toISOString().slice(0, 10),
        totalAmount: v.totalAmount.toFixed(2),
        entries: v.entries.map((e) => ({
          ...e,
          debitAmount: e.debitAmount.toFixed(2),
          creditAmount: e.creditAmount.toFixed(2),
        })),
      })),
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[GET /api/accounting/vouchers] Error:', error);
    return NextResponse.json({ error: 'Failed to load vouchers.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requestedBusinessId =
      typeof body?.businessId === 'string' ? body.businessId : undefined;

    const { business, session } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.ACCOUNTING_VOUCHER_WRITE,
      ['BUSINESS_OWNER', 'OWNER', 'ACCOUNTANT', 'MANAGER']
    );

    const voucherType = body?.voucherType as VoucherType;
    if (!Object.values(VoucherType).includes(voucherType)) {
      return NextResponse.json({ error: 'Invalid voucher type.' }, { status: 400 });
    }

    const rawDate = body?.voucherDate ? new Date(body.voucherDate) : new Date();
    if (Number.isNaN(rawDate.getTime())) {
      return NextResponse.json({ error: 'Invalid voucher date.' }, { status: 400 });
    }

    const branchId =
      typeof body?.branchId === 'string' && body.branchId.trim() && body.branchId !== 'ALL'
        ? body.branchId.trim()
        : business.activeBranchId || null;

    const derivedFy = buildIndianFyWindow(getIndianFyStartYear(rawDate)).code;
    const fyCode =
      typeof body?.fyCode === 'string' && /^\d{4}-\d{4}$/.test(body.fyCode)
        ? body.fyCode
        : derivedFy;

    requireBranchAndFyScope(business, branchId, fyCode);

    const rawEntries = Array.isArray(body?.entries) ? body.entries : [];
    const entries = rawEntries.map(
      (e: {
        ledgerId?: unknown;
        debitAmount?: unknown;
        creditAmount?: unknown;
        narration?: unknown;
      }) => ({
        ledgerId: typeof e.ledgerId === 'string' ? e.ledgerId : '',
        debitAmount: Number(e.debitAmount || 0),
        creditAmount: Number(e.creditAmount || 0),
        narration: typeof e.narration === 'string' ? e.narration : undefined,
      })
    );

    const payload = {
      businessId: business.id,
      branchId,
      fyCode,
      voucherType,
      voucherNumber:
        typeof body?.voucherNumber === 'string' && body.voucherNumber.trim()
          ? body.voucherNumber.trim()
          : undefined,
      voucherDate: rawDate,
      narration: typeof body?.narration === 'string' ? body.narration : null,
      entries,
      referenceType: typeof body?.referenceType === 'string' ? body.referenceType : null,
      referenceId: typeof body?.referenceId === 'string' ? body.referenceId : null,
      createdBy: session.user.id,
    };

    const autoPost = Boolean(body?.autoPost);
    const voucher = autoPost ? await postVoucher(payload) : await createDraftVoucher(payload);

    return NextResponse.json(
      {
        success: true,
        voucher: {
          ...voucher,
          voucherDate: voucher.voucherDate.toISOString().slice(0, 10),
          totalAmount: voucher.totalAmount.toFixed(2),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof VoucherImbalanceError || error instanceof VoucherValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[POST /api/accounting/vouchers] Error:', error);
    return NextResponse.json({ error: 'Failed to create voucher.' }, { status: 500 });
  }
}

