import { NextRequest, NextResponse } from 'next/server';
import { requireHouseholdAccess } from '@/lib/household/guards';
import { setMonthlyBudget, getHouseholdDashboard } from '@/lib/household/householdService';
import { HouseholdRole } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId');
    const month = searchParams.get('month') || undefined;

    const authContext = await requireHouseholdAccess(householdId);
    const dashboard = await getHouseholdDashboard(authContext.householdId, month);

    return NextResponse.json({
      success: true,
      budget: {
        monthYear: dashboard.monthYear,
        monthlyBudget: dashboard.kpis.monthlyBudget,
        totalExpenses: dashboard.kpis.totalExpenses,
        remainingBudget: dashboard.kpis.remainingBudget,
        budgetUtilization: dashboard.kpis.budgetUtilization,
        isBudgetExceeded: dashboard.kpis.isBudgetExceeded,
        categoryBreakdown: dashboard.categoryBreakdown,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve budget.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { householdId, monthYear, amount } = body;

    const authContext = await requireHouseholdAccess(householdId, [
      HouseholdRole.OWNER,
      HouseholdRole.ADMIN,
    ]);

    if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) {
      throw new Error('Please specify a valid month in YYYY-MM format.');
    }

    const budget = await setMonthlyBudget(
      authContext.householdId,
      monthYear,
      Number(amount)
    );

    return NextResponse.json({
      success: true,
      budget,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update budget.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
