import { NextRequest, NextResponse } from 'next/server';
import { registerHouseholdUser } from '@/lib/auth/service';
import { setSessionCookie } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, phone, householdName, monthlyBudget } = body;

    const result = await registerHouseholdUser({
      name,
      email,
      password,
      phone,
      householdName,
      monthlyBudget: monthlyBudget ? Number(monthlyBudget) : 0,
    });

    await setSessionCookie(result.sessionToken, result.expiresAt);

    return NextResponse.json(
      {
        success: true,
        redirectUrl: '/ghar-kharcha',
        sessionToken: result.sessionToken,
        expiresAt: result.expiresAt,
        user: result.user,
        household: result.household,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Household registration failed.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
