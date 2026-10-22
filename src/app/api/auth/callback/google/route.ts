import { NextRequest, NextResponse } from 'next/server';
import {
  getGoogleOAuthConfig,
  getGoogleRedirectUri,
  exchangeGoogleCode,
  fetchGoogleUserProfile,
  verifyGoogleIdToken,
  authenticateGoogleUser,
} from '@/lib/auth/google';
import { setSessionCookie } from '@/lib/auth/session';
import { SubscriptionPlan } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const errorParam = searchParams.get('error');
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Decode state payload early if possible to know origin ('login' vs 'register')
  let stateData: {
    nonce?: string;
    redirect?: string;
    mode?: 'household' | 'business' | 'free_khata' | null;
    plan?: string | null;
    origin?: string;
  } = {};

  if (state) {
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    } catch {
      stateData = {};
    }
  }

  const errorBase = stateData.origin === 'register' ? '/register' : '/login';

  // Handle cancelled or denied consent from Google
  if (errorParam) {
    console.warn('Google OAuth redirected with error:', errorParam);
    const errorUrl = new URL(errorBase, request.url);
    if (errorParam === 'access_denied') {
      errorUrl.searchParams.set('error', 'cancelled');
    } else {
      errorUrl.searchParams.set('error', 'auth_failed');
      errorUrl.searchParams.set('details', errorParam);
    }
    const response = NextResponse.redirect(errorUrl);
    response.cookies.delete('lenden_oauth_state');
    return response;
  }

  if (!code || !state) {
    const errorUrl = new URL(errorBase, request.url);
    errorUrl.searchParams.set('error', 'invalid_state');
    const response = NextResponse.redirect(errorUrl);
    response.cookies.delete('lenden_oauth_state');
    return response;
  }

  // Verify state cookie against incoming state for CSRF protection
  const stateCookie = request.cookies.get('lenden_oauth_state')?.value;
  if (!stateCookie || stateCookie !== state) {
    console.warn('Google OAuth state mismatch or expired.');
    const errorUrl = new URL(errorBase, request.url);
    errorUrl.searchParams.set('error', 'invalid_state');
    const response = NextResponse.redirect(errorUrl);
    response.cookies.delete('lenden_oauth_state');
    return response;
  }

  // Validate internal target redirect
  let targetRedirect = stateData.redirect || '/';
  if (
    !targetRedirect ||
    typeof targetRedirect !== 'string' ||
    !targetRedirect.startsWith('/') ||
    targetRedirect.startsWith('//')
  ) {
    targetRedirect = '/';
  }

  try {
    const config = await getGoogleOAuthConfig();

    if (!config.clientId) {
      const errorUrl = new URL(errorBase, request.url);
      errorUrl.searchParams.set('error', 'config_missing');
      const response = NextResponse.redirect(errorUrl);
      response.cookies.delete('lenden_oauth_state');
      return response;
    }

    if (!config.clientSecret) {
      console.warn('Google Client Secret not configured in environment or PlatformSettings.');
      const errorUrl = new URL(errorBase, request.url);
      errorUrl.searchParams.set('error', 'google_secret_missing');
      const response = NextResponse.redirect(errorUrl);
      response.cookies.delete('lenden_oauth_state');
      return response;
    }

    const redirectUri = getGoogleRedirectUri(request);

    // Exchange authorization code for tokens
    const tokens = await exchangeGoogleCode({
      code,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri,
    });

    // Fetch verified user profile from Google
    const profile = await fetchGoogleUserProfile(tokens.accessToken);

    // Enforce email verification check from Google
    if (!profile.emailVerified) {
      const errorUrl = new URL(errorBase, request.url);
      errorUrl.searchParams.set('error', 'unverified_email');
      const response = NextResponse.redirect(errorUrl);
      response.cookies.delete('lenden_oauth_state');
      return response;
    }

    // Authenticate user, link existing or provision new workspace/household
    const authResult = await authenticateGoogleUser(profile, {
      mode: stateData.mode || undefined,
      plan: stateData.plan || undefined,
    });

    // Create session cookie
    await setSessionCookie(authResult.sessionToken, authResult.expiresAt);

    // Determine final destination based on requested mode, user type, and redirect path
    let finalDestination = targetRedirect;
    if (!finalDestination || finalDestination === '/' || finalDestination === '/select-mode' || finalDestination === '/login') {
      if (authResult.user.platformRole === 'SUPER_ADMIN') {
        finalDestination = '/platform-admin';
      } else if (authResult.household && !authResult.business) {
        finalDestination = '/ghar-kharcha';
      } else if (authResult.business?.plan === SubscriptionPlan.FREE_KHATA) {
        finalDestination = '/free-khata';
      } else if (stateData.mode === 'household' || stateData.plan === 'ghar_kharcha') {
        finalDestination = '/ghar-kharcha';
      } else if (stateData.mode === 'free_khata' || stateData.plan === 'free_khata') {
        finalDestination = '/free-khata';
      } else {
        finalDestination = '/';
      }
    }

    const destinationUrl = new URL(finalDestination, request.url);
    const response = NextResponse.redirect(destinationUrl);

    // Clear state cookie
    response.cookies.delete('lenden_oauth_state');

    return response;
  } catch (error: unknown) {
    console.error('Google OAuth callback processing error:', error);
    const errorUrl = new URL(errorBase, request.url);
    const errorMessage = error instanceof Error ? error.message : 'auth_failed';

    if (errorMessage.includes('Suspended')) {
      errorUrl.searchParams.set('error', 'account_suspended');
    } else if (errorMessage.includes('token exchange')) {
      errorUrl.searchParams.set('error', 'token_exchange_failed');
    } else if (errorMessage.includes('not verified')) {
      errorUrl.searchParams.set('error', 'unverified_email');
    } else {
      errorUrl.searchParams.set('error', 'auth_failed');
    }

    const response = NextResponse.redirect(errorUrl);
    response.cookies.delete('lenden_oauth_state');
    return response;
  }
}

/**
 * POST handler for direct Google Identity Services (One Tap / Google Sign In JWT)
 */
export async function POST(request: NextRequest) {
  try {
    let credential = '';
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      credential = body.credential || body.idToken || '';
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      credential = (formData.get('credential') as string) || '';
    }

    if (!credential) {
      return NextResponse.json(
        { success: false, error: 'Credential token is required.' },
        { status: 400 }
      );
    }

    const config = await getGoogleOAuthConfig();
    const profile = await verifyGoogleIdToken(credential, config.clientId || undefined);

    const authResult = await authenticateGoogleUser(profile);

    await setSessionCookie(authResult.sessionToken, authResult.expiresAt);

    return NextResponse.json({
      success: true,
      user: authResult.user,
      business: authResult.business,
      household: authResult.household,
      isNewUser: authResult.isNewUser,
    });
  } catch (error: unknown) {
    console.error('Google Identity token verification error:', error);
    const message = error instanceof Error ? error.message : 'Authentication failed.';
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }
}
