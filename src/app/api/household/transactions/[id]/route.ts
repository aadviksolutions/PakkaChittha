import { NextRequest, NextResponse } from 'next/server';
import { requireHouseholdAccess } from '@/lib/household/guards';
import {
  updateHouseholdTransaction,
  deleteHouseholdTransaction,
} from '@/lib/household/householdService';
import { HouseholdRole } from '@prisma/client';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { householdId, ...updateFields } = body;

    const authContext = await requireHouseholdAccess(householdId, [
      HouseholdRole.OWNER,
      HouseholdRole.ADMIN,
      HouseholdRole.MEMBER,
    ]);

    const updated = await updateHouseholdTransaction(
      authContext.householdId,
      authContext.userId,
      authContext.role,
      id,
      updateFields
    );

    return NextResponse.json({
      success: true,
      transaction: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update transaction.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId');

    const authContext = await requireHouseholdAccess(householdId, [
      HouseholdRole.OWNER,
      HouseholdRole.ADMIN,
      HouseholdRole.MEMBER,
    ]);

    await deleteHouseholdTransaction(
      authContext.householdId,
      authContext.userId,
      authContext.role,
      id
    );

    return NextResponse.json({
      success: true,
      deletedId: id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete transaction.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
