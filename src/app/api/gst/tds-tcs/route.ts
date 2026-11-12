import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  AuthError,
  TenantIsolationError,
  requireScaleErpAccess,
} from '@/lib/auth/guards';
import { PERMISSIONS, parseIndianFyCode } from '@/lib/rbac';
import {
  TDS_SECTION_RULES,
  TdsSectionCode,
  getTdsTcsRegister,
  postTdsProvisionVoucher,
} from '@/lib/gst';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId') || undefined;
    const fyCode = parseIndianFyCode(searchParams.get('fyCode')).code;

    const { business } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.GST_VIEW
    );

    const [register, ledgers] = await Promise.all([
      getTdsTcsRegister(business.id, fyCode),
      prisma.ledger.findMany({
        where: { businessId: business.id, isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, code: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      register,
      ledgers,
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[GET /api/gst/tds-tcs] Error:', error);
    return NextResponse.json({ error: 'Failed to load TDS / TCS register.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requestedBusinessId =
      typeof body?.businessId === 'string' ? body.businessId : undefined;
    const fyCode = parseIndianFyCode(
      typeof body?.fyCode === 'string' ? body.fyCode : undefined
    ).code;
    const debitLedgerId =
      typeof body?.debitLedgerId === 'string' ? body.debitLedgerId.trim() : '';
    const sectionCode = body?.sectionCode as TdsSectionCode | undefined;
    const partyName = typeof body?.partyName === 'string' ? body.partyName.trim() : '';
    const tdsAmount = body?.tdsAmount;
    const voucherDateRaw =
      typeof body?.voucherDate === 'string' ? body.voucherDate.trim() : '';

    if (
      !debitLedgerId ||
      !sectionCode ||
      !TDS_SECTION_RULES.some((r) => r.code === sectionCode) ||
      !partyName
    ) {
      return NextResponse.json(
        { error: 'debitLedgerId, valid sectionCode, and partyName are required.' },
        { status: 400 }
      );
    }

    const voucherDate = voucherDateRaw ? new Date(voucherDateRaw) : new Date();
    if (Number.isNaN(voucherDate.getTime())) {
      return NextResponse.json({ error: 'Invalid voucherDate.' }, { status: 400 });
    }

    const { business, session } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.ACCOUNTING_VOUCHER_WRITE
    );

    const voucher = await postTdsProvisionVoucher({
      businessId: business.id,
      fyCode,
      debitLedgerId,
      tdsAmount,
      sectionCode,
      partyName,
      voucherDate,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      actorName: session.user.name,
      actorRole: business.erpRole,
    });

    return NextResponse.json({ success: true, voucher }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Failed to post TDS journal voucher.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
