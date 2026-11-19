import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession, setSessionCookie } from '@/lib/auth/session';
import { setSecurityPin, verifySecurityPin, loginUserWithPin } from '@/lib/auth/service';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { securityPinHash: true },
    });

    return NextResponse.json({
      success: true,
      hasPin: Boolean(dbUser?.securityPinHash),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check PIN status';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, pin, identifier } = body;

    // 1. Quick PIN Login (No prior session required)
    if (action === 'login') {
      if (!identifier || !pin) {
        return NextResponse.json(
          { success: false, error: 'Please enter both your email/phone and 6-digit PIN.' },
          { status: 400 }
        );
      }

      const result = await loginUserWithPin(identifier, pin);
      await setSessionCookie(result.sessionToken, result.expiresAt);

      return NextResponse.json({
        success: true,
        sessionToken: result.sessionToken,
        token: result.sessionToken,
        expiresAt: result.expiresAt,
        user: result.user,
        business: result.business,
      });
    }

    // 2. Actions requiring authenticated session: 'set' and 'verify'
    const session = await getCurrentSession();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const currentUser = session.user;

    if (action === 'set') {
      if (!pin || !/^\d{6}$/.test(pin)) {
        return NextResponse.json(
          { success: false, error: 'PIN must be exactly 6 numerical digits.' },
          { status: 400 }
        );
      }

      await setSecurityPin(currentUser.id, pin);
      return NextResponse.json({
        success: true,
        message: '6-digit Security PIN created successfully.',
      });
    }

    if (action === 'verify') {
      if (!pin || !/^\d{6}$/.test(pin)) {
        return NextResponse.json(
          { success: false, error: 'PIN must be exactly 6 numerical digits.' },
          { status: 400 }
        );
      }

      const isValid = await verifySecurityPin(currentUser.id, pin);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Incorrect PIN. Please try again.' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'PIN verified successfully.',
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'PIN operation failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
