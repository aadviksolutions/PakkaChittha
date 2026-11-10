import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/guards';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const body = await request.json();
    const { contactId } = body;

    if (!contactId) {
      return NextResponse.json({ error: 'contactId is required' }, { status: 400 });
    }

    const contact = await prisma.khataContact.findFirst({
      where: {
        id: contactId,
        OR: [
          { userId },
          ...(session.activeBusiness ? [{ businessId: session.activeBusiness.id }] : []),
        ],
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const updated = await prisma.khataContact.update({
      where: { id: contactId },
      data: { lastReminderSentAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      lastReminderSentAt: updated.lastReminderSentAt,
      message: 'Reminder logged successfully.',
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
