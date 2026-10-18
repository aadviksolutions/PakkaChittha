import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  getGoogleOAuthConfig,
  getGoogleRedirectUri,
  buildGoogleAuthUrl,
} from '@/lib/auth/google';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const config = await getGoogleOAuthConfig();

    if (!config.clientId) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'config_missing');
      return NextResponse.redirect(loginUrl);
    }

    const { searchParams } = new URL(request.url);
    const redirectParam = searchParams.get('redirect') || '/';

    // Ensure redirect parameter is safe internal path to prevent open redirect vulnerabilities
    const safeRedirect =
      redirectParam.startsWith('/') && !redirectParam.startsWith('//')
        ? redirectParam
        : '/';

    // Generate cryptographically secure state nonce
    const nonce = crypto.randomBytes(24).toString('hex');
    const statePayload = Buffer.from(
      JSON.stringify({ nonce, redirect: safeRedirect })
    ).toString('base64url');

    const redirectUri = getGoogleRedirectUri(request);

    const googleAuthUrl = buildGoogleAuthUrl({
      clientId: config.clientId,
      redirectUri,
      state: statePayload,
    });

    const response = NextResponse.redirect(googleAuthUrl);

    // Set secure HTTP-only state cookie valid for 10 minutes
    response.cookies.set('lenden_oauth_state', statePayload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error: unknown) {
    console.error('Google OAuth initiation error:', error);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'auth_failed');
    return NextResponse.redirect(loginUrl);
  }
}
