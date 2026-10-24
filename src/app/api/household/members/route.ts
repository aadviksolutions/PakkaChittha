import { NextRequest, NextResponse } from 'next/server';
import { requireHouseholdAccess } from '@/lib/household/guards';
import {
  getHouseholdMembers,
  updateMemberRole,
  removeMember,
  addDirectHouseholdMember,
} from '@/lib/household/householdService';
import { HouseholdRole } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId');

    const authContext = await requireHouseholdAccess(householdId);
    const members = await getHouseholdMembers(authContext.householdId);

    return NextResponse.json({
      success: true,
      currentUserRole: authContext.role,
      currentUserId: authContext.userId,
      members,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch members.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { householdId, name, mobile, relationship, role } = body;

    // Package & Role validation: Only OWNER or ADMIN in Mera Ghar Ka Hisab can add family members
    const authContext = await requireHouseholdAccess(householdId, [
      HouseholdRole.OWNER,
      HouseholdRole.ADMIN,
    ]);

    const newMember = await addDirectHouseholdMember(authContext.userId, {
      householdId: authContext.householdId,
      name,
      mobile,
      relationship,
      role: (role as HouseholdRole) || HouseholdRole.MEMBER,
    });

    return NextResponse.json(
      {
        success: true,
        message: `${newMember.name} added to family successfully!`,
        member: newMember,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add family member.';
    const status = message.includes('Access Denied') || message.includes('Only Household Owners') ? 403 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { householdId, memberId, newRole } = body;

    // Only OWNER can modify member roles
    const authContext = await requireHouseholdAccess(householdId, [HouseholdRole.OWNER]);

    if (!memberId || !newRole) {
      throw new Error('Member ID and new role are required.');
    }

    const updated = await updateMemberRole(
      authContext.householdId,
      authContext.userId,
      memberId,
      newRole as HouseholdRole
    );

    return NextResponse.json({
      success: true,
      member: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update member role.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId');
    const memberId = searchParams.get('memberId');

    // OWNER and ADMIN can remove members
    const authContext = await requireHouseholdAccess(householdId, [
      HouseholdRole.OWNER,
      HouseholdRole.ADMIN,
    ]);

    if (!memberId) {
      throw new Error('Member ID is required.');
    }

    await removeMember(authContext.householdId, authContext.userId, memberId);

    return NextResponse.json({
      success: true,
      removedId: memberId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove member.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
