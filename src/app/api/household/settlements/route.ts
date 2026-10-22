import { NextRequest, NextResponse } from 'next/server';
import { requireHouseholdAccess } from '@/lib/household/guards';
import {
  createHouseholdSettlement,
  getHouseholdBalances,
} from '@/lib/household/householdService';
import { HouseholdRole, PaymentMethod } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdIdParam = searchParams.get('householdId');

    const authContext = await requireHouseholdAccess(householdIdParam);
    const balances = await getHouseholdBalances(authContext.householdId);

    return NextResponse.json({
      success: true,
      settlements: balances.recentSettlements,
      suggestedSettlements: balances.suggestedSettlements,
      members: balances.members,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch settlements.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      householdId,
      payerMemberId,
      receiverMemberId,
      amount,
      date,
      paymentMethod,
      notes,
    } = body;

    const authContext = await requireHouseholdAccess(householdId, [
      HouseholdRole.OWNER,
      HouseholdRole.ADMIN,
      HouseholdRole.MEMBER,
    ]);

    const settlement = await createHouseholdSettlement(
      authContext.householdId,
      authContext.userId,
      {
        payerMemberId,
        receiverMemberId,
        amount: Number(amount),
        date,
        paymentMethod: paymentMethod as PaymentMethod,
        notes,
      }
    );

    return NextResponse.json(
      {
        success: true,
        settlement,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record settlement.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
