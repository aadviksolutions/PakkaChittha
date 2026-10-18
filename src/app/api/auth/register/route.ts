import { NextRequest, NextResponse } from 'next/server';
import { registerBusinessOwner } from '@/lib/auth/service';
import { setSessionCookie } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      password,
      phone,
      businessName,
      legalName,
      tradeType,
      gstin,
      city,
      state,
      selectedPlan,
    } = body;

    const result = await registerBusinessOwner({
      name,
      email,
      password,
      phone,
      businessName,
      legalName,
      tradeType,
      gstin,
      city,
      state,
      selectedPlan: selectedPlan === 'STARTER' || selectedPlan === 'SCALE' ? selectedPlan : 'GROWTH',
    });

    await setSessionCookie(result.sessionToken, result.expiresAt);

    return NextResponse.json(
      {
        success: true,
        sessionToken: result.sessionToken,
        token: result.sessionToken,
        expiresAt: result.expiresAt,
        user: result.user,
        business: result.business,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Registration failed.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
