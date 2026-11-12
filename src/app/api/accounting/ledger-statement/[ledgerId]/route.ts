import { NextRequest, NextResponse } from 'next/server';
import {
  AuthError,
  TenantIsolationError,
  requireBranchAndFyScope,
  requireScaleErpAccess,
} from '@/lib/auth/guards';
import { PERMISSIONS, parseIndianFyCode } from '@/lib/rbac';
import { getLedgerStatement } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ledgerId: string }> }
) {
  try {
    const { ledgerId } = await params;
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId') || undefined;
    const fyCode = parseIndianFyCode(searchParams.get('fyCode')).code;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const { business } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.ACCOUNTING_VIEW
    );

    requireBranchAndFyScope(business, undefined, fyCode);

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateParam) {
      startDate = new Date(startDateParam);
      if (Number.isNaN(startDate.getTime())) {
        return NextResponse.json({ error: 'Invalid startDate.' }, { status: 400 });
      }
    }
    if (endDateParam) {
      endDate = new Date(endDateParam);
      if (Number.isNaN(endDate.getTime())) {
        return NextResponse.json({ error: 'Invalid endDate.' }, { status: 400 });
      }
    }

    const statement = await getLedgerStatement(ledgerId, fyCode, {
      businessId: business.id,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      statement,
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof Error && error.message === 'Ledger not found.') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('[GET /api/accounting/ledger-statement/[ledgerId]] Error:', error);
    return NextResponse.json({ error: 'Failed to load ledger statement.' }, { status: 500 });
  }
}

