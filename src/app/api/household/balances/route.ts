import { NextRequest, NextResponse } from 'next/server';
import { requireHouseholdAccess } from '@/lib/household/guards';
import { getHouseholdBalances } from '@/lib/household/householdService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdIdParam = searchParams.get('householdId');

    const authContext = await requireHouseholdAccess(householdIdParam);
    const data = await getHouseholdBalances(authContext.householdId);

    return NextResponse.json({
      success: true,
      authContext: {
        role: authContext.role,
        householdId: authContext.householdId,
        userName: authContext.userName,
      },
      ...data,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch household balances.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
