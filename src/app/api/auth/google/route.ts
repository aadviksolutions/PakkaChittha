import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  getGoogleOAuthConfig,
  getGoogleRedirectUri,
  buildGoogleAuthUrl,
} from '@/lib/auth/google';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const originParam = searchParams.get('origin') === 'register' ? 'register' : 'login';
  const modeParam = searchParams.get('mode'); // 'household' | 'business' | 'free_khata'
  const planParam = searchParams.get('plan'); // 'ghar_kharcha' | 'free_khata' | 'starter' etc.
  const redirectParam = searchParams.get('redirect');

  const errorBase = originParam === 'register' ? '/register' : '/login';

  try {
    const config = await getGoogleOAuthConfig();

    if (!config.clientId) {
      const errorUrl = new URL(errorBase, request.url);
      errorUrl.searchParams.set('error', 'config_missing');
      if (modeParam) errorUrl.searchParams.set('mode', modeParam);
      if (planParam) errorUrl.searchParams.set('plan', planParam);
      return NextResponse.redirect(errorUrl);
    }

    if (!config.clientSecret) {
      const errorUrl = new URL(errorBase, request.url);
      errorUrl.searchParams.set('error', 'google_secret_missing');
      if (modeParam) errorUrl.searchParams.set('mode', modeParam);
      if (planParam) errorUrl.searchParams.set('plan', planParam);
      return NextResponse.redirect(errorUrl);
    }

    // Default target path based on mode or plan if not explicitly supplied
    let defaultTarget = '/';
    if (modeParam === 'household' || planParam === 'ghar_kharcha') {
      defaultTarget = '/ghar-kharcha';
    } else if (modeParam === 'free_khata' || planParam === 'free_khata') {
      defaultTarget = '/free-khata';
    }

    // Prevent open redirect vulnerabilities
    const safeRedirect =
      redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
        ? redirectParam
        : defaultTarget;

    // Generate cryptographically secure state nonce
    const nonce = crypto.randomBytes(24).toString('hex');
    const statePayload = Buffer.from(
      JSON.stringify({
        nonce,
        redirect: safeRedirect,
        mode: modeParam || null,
        plan: planParam || null,
        origin: originParam,
      })
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
    const errorUrl = new URL(errorBase, request.url);
    errorUrl.searchParams.set('error', 'auth_failed');
    return NextResponse.redirect(errorUrl);
  }
}
