import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, validateSessionToken } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=no_session', request.url));
    }

    const session = await validateSessionToken(token);
    if (!session) {
      return NextResponse.redirect(new URL('/login?error=invalid_session', request.url));
    }

    const userName = encodeURIComponent(session.user.name || '');
    const userEmail = encodeURIComponent(session.user.email || '');
    const userId = encodeURIComponent(session.user.id || '');
    const bizId = encodeURIComponent(session.activeBusiness?.id || '');
    const bizName = encodeURIComponent(session.activeBusiness?.name || '');

    const appDeepLink = `pakkachittha://auth/callback?token=${encodeURIComponent(
      token
    )}&userId=${userId}&email=${userEmail}&name=${userName}&businessId=${bizId}&businessName=${bizName}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pakkachittha - Logging In</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #071F38;
      color: #F8FAFC;
      margin: 0;
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
    }
    .card {
      background: #112238;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 36px 28px;
      border-radius: 24px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      background: rgba(234, 88, 12, 0.15);
      color: #EA580C;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 20px;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3.5px solid rgba(255, 255, 255, 0.15);
      border-top-color: #EA580C;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h2 {
      margin: 0 0 8px;
      font-size: 22px;
      font-weight: 800;
      color: #FFFFFF;
    }
    p {
      color: #94A3B8;
      font-size: 14px;
      line-height: 1.5;
      margin: 0 0 28px;
    }
    .btn {
      display: block;
      width: 100%;
      background: #EA580C;
      color: #FFFFFF;
      font-weight: 700;
      text-decoration: none;
      padding: 14px 20px;
      border-radius: 14px;
      font-size: 15px;
      transition: background 0.2s ease, transform 0.1s ease;
      box-shadow: 0 4px 14px rgba(234, 88, 12, 0.4);
    }
    .btn:active {
      transform: scale(0.98);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Pakka Chittha</div>
    <div class="spinner"></div>
    <h2>Sign-in Successful!</h2>
    <p>Transferring your session securely to the Pakkachittha Android app...</p>
    <a id="open-btn" href="${appDeepLink}" class="btn">Open Pakkachittha App</a>
  </div>
  <script>
    (function() {
      // Automatically redirect to Android application deep link
      window.location.href = "${appDeepLink}";
    })();
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: unknown) {
    console.error('Mobile callback error:', err);
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
  }
}

