import { NextRequest, NextResponse } from 'next/server';
import {
  AuthError,
  TenantIsolationError,
  requireBranchAndFyScope,
  requireScaleErpAccess,
} from '@/lib/auth/guards';
import { PERMISSIONS, parseIndianFyCode } from '@/lib/rbac';
import { ensureBusinessCOA, getProfitAndLossStatement } from '@/lib/accounting';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId') || undefined;
    const fyCode = parseIndianFyCode(searchParams.get('fyCode')).code;
    const branchId = searchParams.get('branchId') || undefined;
    const comparePrevFy = searchParams.get('comparePrevFy') === 'true';

    const { business } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.ACCOUNTING_VIEW
    );

    requireBranchAndFyScope(business, branchId, fyCode);

    const existingLedgers = await prisma.ledger.count({ where: { businessId: business.id } });
    if (existingLedgers === 0) {
      await ensureBusinessCOA(business.id, fyCode);
    }

    const statement = await getProfitAndLossStatement(
      business.id,
      fyCode,
      branchId,
      comparePrevFy
    );

    return NextResponse.json({
      success: true,
      statement,
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[GET /api/accounting/profit-loss] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate Profit & Loss statement.' },
      { status: 500 }
    );
  }
}
