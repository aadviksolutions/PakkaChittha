import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess, AuthError } from '@/lib/auth/guards';
import { PlanKey, BillingInterval } from '@/lib/subscription/plans';
import { getAuthoritativePricing, validateDiscountCode } from '@/lib/subscription/pricingService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireTenantAccess(undefined, ['BUSINESS_OWNER']);
    const businessId = authContext.business.id;
    const userId = authContext.session.user.id;

    const body = await request.json();
    const { code, planKey, interval = 'MONTHLY' } = body as {
      code: string;
      planKey: PlanKey;
      interval: BillingInterval;
    };

    if (!code || !code.trim()) {
      return NextResponse.json({ error: 'Discount code is required' }, { status: 400 });
    }

    if (!planKey || !['STARTER', 'GROWTH', 'SCALE'].includes(planKey)) {
      return NextResponse.json({ error: 'Valid planKey is required' }, { status: 400 });
    }

    const authoritativePricing = await getAuthoritativePricing();
    const planPricing = authoritativePricing[planKey]?.[interval];

    if (!planPricing) {
      return NextResponse.json({ error: 'Invalid plan or billing duration' }, { status: 400 });
    }

    const validation = await validateDiscountCode({
      code,
      planKey,
      interval,
      totalPrice: planPricing.totalPrice,
      userId,
      businessId,
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || 'Invalid discount code.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      code: validation.code,
      description: validation.description,
      originalAmount: planPricing.totalPrice,
      discountAmount: validation.discountAmount,
      finalAmount: validation.finalAmount,
      discountCodeId: validation.discountCodeId,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
