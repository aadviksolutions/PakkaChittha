import { NextRequest, NextResponse } from 'next/server';
import { requireGrowthAccess } from '@/lib/auth/guards';
import { resolveDateFilterRange } from '@/lib/reports/financialYear';
import { getAccountsOverview } from '@/lib/reports/accountingEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authContext = await requireGrowthAccess();
    const businessId = authContext.business.id;

    const { searchParams } = new URL(request.url);
    const financialYear = searchParams.get('financialYear');
    const periodType = (searchParams.get('periodType') as any) || 'FY';
    const periodValue = searchParams.get('periodValue');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const filterRange = resolveDateFilterRange({
      financialYear,
      periodType,
      periodValue,
      startDate,
      endDate,
    });

    const overview = await getAccountsOverview(businessId, filterRange);

    return NextResponse.json({
      success: true,
      data: overview,
    });
  } catch (error: unknown) {
    console.error('Accounts Overview error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to generate Accounts Overview';
    const status = (error as any)?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
