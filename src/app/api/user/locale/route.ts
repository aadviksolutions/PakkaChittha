import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import prisma from '@/lib/prisma';
import { isValidLocale, COOKIE_LOCALE_KEY } from '@/i18n/config';

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentSession();
    const body = await request.json().catch(() => ({}));
    const { locale } = body;

    if (!locale || typeof locale !== 'string' || !isValidLocale(locale)) {
      return NextResponse.json(
        { error: 'Invalid or unsupported language locale' },
        { status: 400 }
      );
    }

    // If authenticated, persist to user account profile
    if (session?.user?.id && !session.user.id.startsWith('demo_')) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { preferredLanguage: locale },
      });
    }

    const response = NextResponse.json({
      success: true,
      locale,
      authenticated: Boolean(session?.user?.id),
    });

    // Set persistence cookie (1 year expiry)
    response.cookies.set(COOKIE_LOCALE_KEY, locale, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'lax',
      httpOnly: false, // Accessible by client-side i18n hydration
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update language';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
