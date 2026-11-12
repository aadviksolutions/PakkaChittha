import { NextRequest, NextResponse } from 'next/server';
import {
  AuthError,
  TenantIsolationError,
  requireBranchAndFyScope,
  requireScaleErpAccess,
} from '@/lib/auth/guards';
import { PERMISSIONS, parseIndianFyCode } from '@/lib/rbac';
import { ensureBusinessCOA, getTrialBalance } from '@/lib/accounting';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId') || undefined;
    const fyCode = parseIndianFyCode(searchParams.get('fyCode')).code;
    const branchId = searchParams.get('branchId') || undefined;

    const { business } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.ACCOUNTING_VIEW
    );

    requireBranchAndFyScope(business, branchId, fyCode);

    const existingLedgers = await prisma.ledger.count({ where: { businessId: business.id } });
    if (existingLedgers === 0) {
      await ensureBusinessCOA(business.id, fyCode);
    }

    const report = await getTrialBalance(business.id, fyCode, branchId);

    return NextResponse.json({
      success: true,
      ...report,
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[GET /api/accounting/trial-balance] Error:', error);
    return NextResponse.json({ error: 'Failed to generate Trial Balance.' }, { status: 500 });
  }
}

