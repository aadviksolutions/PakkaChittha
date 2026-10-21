import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { requireHouseholdAccess } from '@/lib/household/guards';
import {
  getUserHouseholds,
  createHousehold,
  updateHouseholdSettings,
  getHouseholdDetail,
} from '@/lib/household/householdService';
import { HouseholdRole } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const households = await getUserHouseholds(session.user.id);

    // If specific householdId query param requested, get its details too
    const { searchParams } = new URL(req.url);
    const requestedId = searchParams.get('householdId');

    let activeHousehold = null;
    if (requestedId) {
      activeHousehold = await getHouseholdDetail(requestedId);
    } else if (households.length > 0) {
      activeHousehold = await getHouseholdDetail(households[0].id);
    }

    return NextResponse.json({
      success: true,
      households,
      activeHousehold,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve households.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { name, currency, monthlyBudget, budgetStartDay } = body;

    const household = await createHousehold(session.user.id, {
      name,
      currency: currency || 'INR',
      monthlyBudget: monthlyBudget ? Number(monthlyBudget) : 0,
      budgetStartDay: budgetStartDay ? Number(budgetStartDay) : 1,
    });

    return NextResponse.json({
      success: true,
      household,
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create household.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { householdId, name, monthlyBudget, budgetStartDay } = body;

    const authContext = await requireHouseholdAccess(householdId, [
      HouseholdRole.OWNER,
      HouseholdRole.ADMIN,
    ]);

    const updated = await updateHouseholdSettings(authContext.householdId, {
      name,
      monthlyBudget,
      budgetStartDay,
    });

    return NextResponse.json({
      success: true,
      household: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update household settings.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
