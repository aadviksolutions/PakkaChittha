import { NextRequest, NextResponse } from 'next/server';
import { requireHouseholdAccess } from '@/lib/household/guards';
import {
  getHouseholdCategories,
  createHouseholdCategory,
} from '@/lib/household/householdService';
import { HouseholdRole } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId');

    const authContext = await requireHouseholdAccess(householdId);
    const categories = await getHouseholdCategories(authContext.householdId);

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch categories.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { householdId, name, type, icon, color, monthlyBudget } = body;

    const authContext = await requireHouseholdAccess(householdId, [
      HouseholdRole.OWNER,
      HouseholdRole.ADMIN,
    ]);

    const category = await createHouseholdCategory(authContext.householdId, {
      name,
      type,
      icon,
      color,
      monthlyBudget,
    });

    return NextResponse.json({
      success: true,
      category,
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create category.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
