import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { acceptHouseholdInvitation } from '@/lib/household/householdService';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Invitation token is required.' }, { status: 400 });
    }

    const result = await acceptHouseholdInvitation(session.user.id, token);

    return NextResponse.json({
      success: true,
      message: `You have successfully joined ${result.householdName}!`,
      householdId: result.householdId,
      householdName: result.householdName,
      role: result.role,
      redirectUrl: '/ghar-kharcha',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to accept invitation.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
