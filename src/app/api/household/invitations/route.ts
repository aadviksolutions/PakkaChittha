import { NextRequest, NextResponse } from 'next/server';
import { requireHouseholdAccess } from '@/lib/household/guards';
import {
  createHouseholdInvitation,
  getHouseholdInvitations,
  revokeHouseholdInvitation,
} from '@/lib/household/householdService';
import { HouseholdRole } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId');

    const authContext = await requireHouseholdAccess(householdId);
    const invitations = await getHouseholdInvitations(authContext.householdId);

    return NextResponse.json({
      success: true,
      invitations,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve invitations.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { householdId, inviteeEmail, role } = body;

    const authContext = await requireHouseholdAccess(householdId, [
      HouseholdRole.OWNER,
      HouseholdRole.ADMIN,
    ]);

    const invite = await createHouseholdInvitation(
      authContext.householdId,
      authContext.userId,
      inviteeEmail,
      (role as HouseholdRole) || HouseholdRole.MEMBER
    );

    return NextResponse.json({
      success: true,
      invitation: invite,
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate invitation.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId');
    const invitationId = searchParams.get('invitationId');

    const authContext = await requireHouseholdAccess(householdId, [
      HouseholdRole.OWNER,
      HouseholdRole.ADMIN,
    ]);

    if (!invitationId) {
      throw new Error('Invitation ID is required.');
    }

    await revokeHouseholdInvitation(authContext.householdId, invitationId);

    return NextResponse.json({
      success: true,
      revokedId: invitationId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to revoke invitation.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
