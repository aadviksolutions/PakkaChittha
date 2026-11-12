import { NextRequest, NextResponse } from 'next/server';
import {
  AuthError,
  TenantIsolationError,
  requireBranchAndFyScope,
  requireScaleErpAccess,
} from '@/lib/auth/guards';
import {
  AccountantDrilldownMetric,
  PERMISSIONS,
  ensureBusinessWorkspaceDefaults,
  getAccountantDashboardOverview,
  getIndianFyStartYear,
  buildIndianFyWindow,
} from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const VALID_DRILLDOWNS = new Set<AccountantDrilldownMetric>([
  'sales',
  'purchases',
  'receivables',
  'payables',
  'gst',
  'cash_bank',
  'unreconciled',
  'drafts',
]);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId') || undefined;
    const requestedBranchId = searchParams.get('branchId') || 'ALL';
    const requestedFy = searchParams.get('fy') || undefined;
    const rawDrilldown = searchParams.get('drilldown') as AccountantDrilldownMetric | null;
    const drilldown = rawDrilldown && VALID_DRILLDOWNS.has(rawDrilldown) ? rawDrilldown : null;

    const { business } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.ACCOUNTING_VIEW
    );

    await ensureBusinessWorkspaceDefaults(business.id);

    const activeFyCode =
      requestedFy ||
      business.financialYears[0]?.code ||
      buildIndianFyWindow(getIndianFyStartYear()).code;

    requireBranchAndFyScope(business, requestedBranchId, activeFyCode);

    const overview = await getAccountantDashboardOverview({
      businessId: business.id,
      fyCode: activeFyCode,
      branchId: requestedBranchId,
      drilldown,
    });

    return NextResponse.json({
      success: true,
      workspace: {
        id: business.id,
        name: business.name,
        gstin: business.gstin,
        state: business.state,
        role: business.role,
        erpRole: business.erpRole,
        permissions: business.permissions,
        branches: business.branches,
        financialYears: business.financialYears,
        accountantAccess: business.accountantAccess,
        activeBranchId: business.activeBranchId,
      },
      overview,
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[GET /api/accountant/dashboard] Error:', error);
    return NextResponse.json({ error: 'Failed to load Accountant Workspace dashboard' }, { status: 500 });
  }
}

