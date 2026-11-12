import { NextRequest, NextResponse } from 'next/server';
import {
  AuthError,
  TenantIsolationError,
  requireScaleErpAccess,
} from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/rbac';
import { getPartyAgeingReport } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId') || undefined;
    const asOfDateParam = searchParams.get('asOfDate');

    let asOfDate: Date | undefined;
    if (asOfDateParam) {
      const parsed = new Date(asOfDateParam);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Invalid asOfDate parameter.' }, { status: 400 });
      }
      asOfDate = parsed;
    }

    const { business } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.ACCOUNTING_VIEW
    );

    const report = await getPartyAgeingReport(business.id, asOfDate);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[GET /api/accounting/party-ageing] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate Receivables & Payables ageing report.' },
      { status: 500 }
    );
  }
}
