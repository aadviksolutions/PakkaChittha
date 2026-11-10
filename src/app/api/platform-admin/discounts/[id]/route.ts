import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, AuthError } from '@/lib/auth/guards';
import { recordAdminAudit } from '@/lib/admin/audit';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireSuperAdmin();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.discountCode.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Discount code not found' }, { status: 404 });
    }

    const updated = await prisma.discountCode.update({
      where: { id },
      data: {
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.totalUsageLimit !== undefined ? { totalUsageLimit: body.totalUsageLimit ? Number(body.totalUsageLimit) : null } : {}),
        ...(body.expiryDate !== undefined ? { expiryDate: body.expiryDate ? new Date(body.expiryDate) : null } : {}),
      },
    });

    await recordAdminAudit(adminSession, {
      action: 'DISCOUNT_CODE_UPDATED',
      targetType: 'PLATFORM',
      targetId: id,
      targetName: updated.code,
      reason: `Updated discount code ${updated.code} status=${updated.isActive}`,
    });

    return NextResponse.json({
      success: true,
      discount: updated,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireSuperAdmin();
    const { id } = await params;

    const existing = await prisma.discountCode.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Discount code not found' }, { status: 404 });
    }

    await prisma.discountCode.delete({
      where: { id },
    });

    await recordAdminAudit(adminSession, {
      action: 'DISCOUNT_CODE_DELETED',
      targetType: 'PLATFORM',
      targetId: id,
      targetName: existing.code,
      reason: `Deleted discount code ${existing.code}`,
    });

    return NextResponse.json({
      success: true,
      message: `Discount code '${existing.code}' removed successfully.`,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
