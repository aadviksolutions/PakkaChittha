import { NextResponse } from 'next/server';
import { getGoogleOAuthConfig } from '@/lib/auth/google';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getGoogleOAuthConfig();

    return NextResponse.json({
      configured: config.isConfigured,
      clientId: config.clientId || null,
      hasSecret: Boolean(config.clientSecret),
    });
  } catch (error: unknown) {
    console.error('Failed to retrieve Google OAuth public config:', error);
    return NextResponse.json(
      { configured: false, clientId: null, hasSecret: false },
      { status: 500 }
    );
  }
}
