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

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const errorParam = searchParams.get('error');
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Handle cancelled or denied consent
  if (errorParam) {
    console.warn('Google OAuth redirected with error:', errorParam);
    const loginUrl = new URL('/login', request.url);
    if (errorParam === 'access_denied') {
      loginUrl.searchParams.set('error', 'cancelled');
    } else {
      loginUrl.searchParams.set('error', 'auth_failed');
      loginUrl.searchParams.set('details', errorParam);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (!code || !state) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'invalid_state');
    return NextResponse.redirect(loginUrl);
  }

  // Verify state cookie against incoming state
  const stateCookie = request.cookies.get('lenden_oauth_state')?.value;
  if (!stateCookie || stateCookie !== state) {
    console.warn('Google OAuth state mismatch or expired.');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'invalid_state');
    return NextResponse.redirect(loginUrl);
  }

  // Parse redirect path from state payload
  let targetRedirect = '/';
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    if (
      decoded.redirect &&
      typeof decoded.redirect === 'string' &&
      decoded.redirect.startsWith('/') &&
      !decoded.redirect.startsWith('//')
    ) {
      targetRedirect = decoded.redirect;
    }
  } catch {
    targetRedirect = '/';
  }

  try {
    const config = await getGoogleOAuthConfig();

    if (!config.clientId) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'config_missing');
      return NextResponse.redirect(loginUrl);
    }

    if (!config.clientSecret) {
      console.warn('Google Client Secret not configured in environment or PlatformSettings.');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'google_secret_missing');
      return NextResponse.redirect(loginUrl);
    }

    const redirectUri = getGoogleRedirectUri(request);

    // Exchange authorization code for tokens
    const tokens = await exchangeGoogleCode({
      code,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri,
    });

    // Fetch user profile from Google
    const profile = await fetchGoogleUserProfile(tokens.accessToken);

    // Authenticate user, link existing or provision new workspace
    const authResult = await authenticateGoogleUser(profile);

    // Create session cookie
    await setSessionCookie(authResult.sessionToken, authResult.expiresAt);

    // Redirect to authenticated destination
    const destinationUrl = new URL(targetRedirect, request.url);
    const response = NextResponse.redirect(destinationUrl);

    // Clear state cookie
    response.cookies.delete('lenden_oauth_state');

    return response;
  } catch (error: unknown) {
    console.error('Google OAuth callback processing error:', error);
    const loginUrl = new URL('/login', request.url);
    const errorMessage = error instanceof Error ? error.message : 'auth_failed';

    if (errorMessage.includes('Suspended')) {
      loginUrl.searchParams.set('error', 'account_suspended');
    } else if (errorMessage.includes('token exchange')) {
      loginUrl.searchParams.set('error', 'token_exchange_failed');
    } else {
      loginUrl.searchParams.set('error', 'auth_failed');
    }

    const response = NextResponse.redirect(loginUrl);
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
      isNewUser: authResult.isNewUser,
    });
  } catch (error: unknown) {
    console.error('Google Identity token verification error:', error);
    const message = error instanceof Error ? error.message : 'Authentication failed.';
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }
}
