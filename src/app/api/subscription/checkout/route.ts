import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAccess, AuthError } from '@/lib/auth/guards';
import {
  OFFICIAL_PLANS,
  PlanKey,
  BillingInterval,
  BILLING_INTERVALS,
} from '@/lib/subscription/plans';
import { getRazorpayClient, isRazorpayConfigured } from '@/lib/razorpay/client';

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireTenantAccess(undefined, ['BUSINESS_OWNER']);
    const businessId = authContext.business.id;

    if (businessId.startsWith('demo_') || (authContext.business as any).isDemo) {
      return NextResponse.json(
        {
          error:
            'Demo workspaces are simulated evaluation environments. To purchase a paid plan, please register a live business account.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { planKey, interval = 'MONTHLY' } = body as {
      planKey: PlanKey;
      interval: BillingInterval;
    };

    if (!planKey || !OFFICIAL_PLANS[planKey]) {
      return NextResponse.json({ error: 'Valid planKey is required' }, { status: 400 });
    }

    if (planKey === 'FREE_KHATA') {
      return NextResponse.json(
        {
          error: 'Pakka Chittha Free Khata is permanently free and does not require payment processing.',
        },
        { status: 400 }
      );
    }

    const validInterval = BILLING_INTERVALS.find((i) => i.key === interval);
    if (!validInterval) {
      return NextResponse.json({ error: 'Valid billing interval is required' }, { status: 400 });
    }

    const planConfig = OFFICIAL_PLANS[planKey];
    const pricing = planConfig.pricing[interval];
    const totalPriceInInr = pricing.totalPrice;
    const amountInPaise = Math.round(totalPriceInInr * 100);

    if (amountInPaise <= 0) {
      return NextResponse.json({ error: 'Plan pricing must be greater than zero' }, { status: 400 });
    }

    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        {
          error:
            'Razorpay gateway credentials are not configured on this environment. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.',
          isConfigured: false,
        },
        { status: 503 }
      );
    }

    const razorpay = getRazorpayClient();
    const receipt = `rcpt_${businessId.slice(-6)}_${Date.now()}`.slice(0, 40);

    // Create Razorpay Order
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        businessId,
        planKey,
        prismaEnum: planConfig.prismaEnum,
        interval,
        durationMonths: String(pricing.durationMonths),
        businessName: authContext.business.name,
        userEmail: authContext.session.user.email,
      },
    });

    // Record PENDING payment record with unique idempotencyKey
    await (prisma as any).subscriptionPayment.create({
      data: {
        businessId,
        amount: totalPriceInInr,
        currency: 'INR',
        plan: planConfig.prismaEnum,
        status: 'PENDING',
        gateway: 'RAZORPAY',
        gatewayOrderId: order.id,
        idempotencyKey: `order_${order.id}`,
        billingPeriod: interval,
        notes: `Checkout for ${planConfig.name} (${interval}) - ₹${totalPriceInInr}`,
      },
    });

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      planName: planConfig.name,
      interval,
      durationMonths: pricing.durationMonths,
      business: {
        id: businessId,
        name: authContext.business.name,
        email: authContext.session.user.email,
        phone: authContext.session.user.phone || (authContext.business as any).phone || '',
      },
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize Razorpay checkout' },
      { status: 500 }
    );
  }
}
