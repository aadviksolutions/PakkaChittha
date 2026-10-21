import { NextRequest, NextResponse } from 'next/server';
import { requireHouseholdAccess } from '@/lib/household/guards';
import { getHouseholdDashboard } from '@/lib/household/householdService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedHouseholdId = searchParams.get('householdId');
    const month = searchParams.get('month') || undefined; // YYYY-MM

    const authContext = await requireHouseholdAccess(requestedHouseholdId);
    const dashboard = await getHouseholdDashboard(authContext.householdId, month);

    return NextResponse.json({
      success: true,
      authContext: {
        householdId: authContext.householdId,
        householdName: authContext.householdName,
        currency: authContext.currency,
        role: authContext.role,
      },
      ...dashboard,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load household dashboard.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
