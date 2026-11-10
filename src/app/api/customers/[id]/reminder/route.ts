import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess, AuthError } from '@/lib/auth/guards';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireTenantAccess();
    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: { id, businessId: business.id },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: { lastReminderSentAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      lastReminderSentAt: updated.lastReminderSentAt,
      message: 'Payment reminder logged successfully.',
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
