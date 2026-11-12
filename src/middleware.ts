import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/select-mode',
  '/welcome',
  '/login',
  '/register',
  '/pricing',
  '/gst-billing-software',
  '/udhaar-khata-management',
  '/inventory-stock-software',
  '/ghar-kharcha-app',
  '/view',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/register-khata',
  '/api/auth/register-household',
  '/ghar-kharcha/join',
  '/api/household/invitations/validate',
  '/api/auth/me',
  '/api/auth/google',
  '/api/auth/callback/google',
  '/api/auth/google/config',
  '/api/demo/enter',
  '/api/demo/exit',
  '/api/subscription/plans',
  '/api/whatsapp/webhook',
  '/api/webhooks/razorpay',
];

const NOINDEX_PREFIXES = [
  '/login',
  '/register',
  '/select-mode',
  '/welcome',
  '/dashboard',
  '/free-khata',
  '/ghar-kharcha',
  '/invoices',
  '/customers',
  '/inventory',
  '/purchases',
  '/suppliers',
  '/quotations',
  '/expenses',
  '/reports',
  '/settings',
  '/staff',
  '/subscription',
  '/whatsapp',
  '/accountant',
  '/platform-admin',
  '/view',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, Next.js internal chunks, media assets, uploads, robots/sitemap, and icons
  if (
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/uploads') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.mp4') ||
    pathname.endsWith('.webm') ||
    pathname.endsWith('.json') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.txt') ||
    pathname.endsWith('.xml')
  ) {
    return NextResponse.next();
  }

  const isPublicPath =
    pathname === '/' ||
    PUBLIC_PATHS.some((path) => path !== '/' && (pathname === path || pathname.startsWith(path + '/')));
  const authHeader = request.headers.get('authorization') || request.headers.get('x-session-token');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader?.trim();
  const sessionToken = request.cookies.get('lenden_session_token')?.value || bearerToken;

  // Unauthenticated user attempting to access protected route:
  // Subpaths send user to /login with redirect parameter preserved; APIs return 401
  if (!sessionToken && !isPublicPath) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already authenticated user visiting public entry routes -> redirect to authorized workspace or requested redirect
  if (
    sessionToken &&
    (pathname === '/login' ||
      pathname === '/register' ||
      pathname === '/select-mode' ||
      pathname === '/welcome')
  ) {
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    const destination =
      redirectParam &&
      redirectParam.startsWith('/') &&
      redirectParam !== '/login' &&
      redirectParam !== '/register' &&
      redirectParam !== '/select-mode'
        ? redirectParam
        : '/';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  const isNoindexRoute =
    (pathname === '/' && Boolean(sessionToken)) ||
    NOINDEX_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
  if (isNoindexRoute) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt & sitemap.xml
     * - public files (svg, png, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|txt|xml)$).*)',
  ],
};
