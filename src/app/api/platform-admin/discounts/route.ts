import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, AuthError } from '@/lib/auth/guards';
import { recordAdminAudit } from '@/lib/admin/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireSuperAdmin();

    const discounts = await prisma.discountCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { usages: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      discounts,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminSession = await requireSuperAdmin();
    const body = await request.json();

    const {
      code,
      description,
      type = 'PERCENTAGE',
      value,
      applicablePlans = 'ALL',
      applicableDurations = 'ALL',
      maxDiscountAmount,
      minPurchaseAmount = 0,
      totalUsageLimit,
      perCustomerLimit = 1,
      startDate,
      expiryDate,
      newCustomersOnly = false,
      isActive = true,
    } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Valid discount code is required' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');

    if (typeof value !== 'number' || value <= 0) {
      return NextResponse.json({ error: 'Discount value must be a positive number' }, { status: 400 });
    }

    if (type === 'PERCENTAGE' && value > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100%' }, { status: 400 });
    }

    const existing = await prisma.discountCode.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json({ error: `Discount code '${cleanCode}' already exists` }, { status: 400 });
    }

    const newDiscount = await prisma.discountCode.create({
      data: {
        code: cleanCode,
        description: description?.trim() || null,
        type: type === 'FIXED' ? 'FIXED' : 'PERCENTAGE',
        value,
        applicablePlans: applicablePlans || 'ALL',
        applicableDurations: applicableDurations || 'ALL',
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
        minPurchaseAmount: minPurchaseAmount ? Number(minPurchaseAmount) : 0,
        totalUsageLimit: totalUsageLimit ? Number(totalUsageLimit) : null,
        perCustomerLimit: perCustomerLimit ? Number(perCustomerLimit) : 1,
        startDate: startDate ? new Date(startDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        newCustomersOnly: Boolean(newCustomersOnly),
        isActive: Boolean(isActive),
        createdBy: adminSession.user.email,
      },
    });

    await recordAdminAudit(adminSession, {
      action: 'DISCOUNT_CODE_CREATED',
      targetType: 'PLATFORM',
      targetId: newDiscount.id,
      targetName: newDiscount.code,
      reason: `Created discount code ${newDiscount.code} (${newDiscount.type} ${newDiscount.value})`,
      metadata: { newDiscount },
    });

    return NextResponse.json({
      success: true,
      discount: newDiscount,
      message: `Discount code '${cleanCode}' created successfully.`,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
