import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/pricing',
  '/view',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/register-khata',
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, Next.js internal chunks, media assets, uploads, and icons
  if (
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
    pathname.endsWith('.webp')
  ) {
    return NextResponse.next();
  }

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'));
  const authHeader = request.headers.get('authorization') || request.headers.get('x-session-token');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader?.trim();
  const sessionToken = request.cookies.get('lenden_session_token')?.value || bearerToken;

  // Unauthenticated user attempting to access protected route -> redirect to /login or 401 for APIs
  if (!sessionToken && !isPublicPath) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already authenticated user visiting /login or /register -> redirect to /
  if (sessionToken && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, png, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)',
  ],
};
