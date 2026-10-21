import { NextRequest, NextResponse } from 'next/server';
import { validateInvitationToken } from '@/lib/household/householdService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
    }

    const result = await validateInvitationToken(token);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid or expired invitation token.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
