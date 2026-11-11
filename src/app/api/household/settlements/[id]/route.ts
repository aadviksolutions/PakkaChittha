import { NextRequest, NextResponse } from 'next/server';
import { requireHouseholdAccess } from '@/lib/household/guards';
import {
  deleteHouseholdSettlement,
  updateHouseholdSettlement,
} from '@/lib/household/householdService';
import { HouseholdRole } from '@prisma/client';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const requestedHouseholdId =
      typeof body?.householdId === 'string'
        ? body.householdId
        : req.nextUrl.searchParams.get('householdId');

    const { householdId } = await requireHouseholdAccess(requestedHouseholdId, [
      HouseholdRole.OWNER,
      HouseholdRole.ADMIN,
      HouseholdRole.MEMBER,
    ]);
    const updated = await updateHouseholdSettlement(householdId, id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update settlement.';
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

    await deleteHouseholdSettlement(authContext.householdId, id);

    return NextResponse.json({
      success: true,
      deletedId: id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete settlement.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
