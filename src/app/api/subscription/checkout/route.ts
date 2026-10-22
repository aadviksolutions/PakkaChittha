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
import { createYoupiPaymentSession, isYoupiTestConfigured } from '@/lib/youpi/client';

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
    const { planKey, interval = 'MONTHLY', gateway = 'RAZORPAY' } = body as {
      planKey: PlanKey;
      interval: BillingInterval;
      gateway?: string;
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

    // Strict upgrade-only validation: Active paid subscribers can ONLY purchase a higher tier
    const currentSub = await prisma.subscription.findFirst({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });

    const TIER_RANKS: Record<string, number> = {
      FREE_KHATA: 0,
      FREE_TRIAL: 0,
      STARTER: 1,
      GROWTH: 2,
      GROWTH_PRO: 2,
      SCALE: 3,
      ENTERPRISE: 3,
    };

    if (currentSub && currentSub.status === 'ACTIVE' && currentSub.plan !== 'FREE_KHATA') {
      const currentRank = TIER_RANKS[currentSub.plan] ?? 0;
      const targetRank = TIER_RANKS[planKey] ?? 0;
      if (targetRank <= currentRank) {
        return NextResponse.json(
          {
            error:
              'Downgrades are not permitted. Active subscribers can only upgrade to higher-tier plans.',
          },
          { status: 400 }
        );
      }
    }

    const planConfig = OFFICIAL_PLANS[planKey];
    const pricing = planConfig.pricing[interval];
    const totalPriceInInr = pricing.totalPrice;
    const amountInPaise = Math.round(totalPriceInInr * 100);

    if (amountInPaise <= 0) {
      return NextResponse.json({ error: 'Plan pricing must be greater than zero' }, { status: 400 });
    }

    // Isolated test integration for YOUPI PG (guarded by environment and test flag)
    if (gateway === 'YOUPI_PG' || gateway === 'YOUPI') {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'YOUPI PG test gateway is forbidden in production environments.' },
          { status: 403 }
        );
      }
      if (!isYoupiTestConfigured()) {
        return NextResponse.json(
          {
            error: 'YOUPI PG test gateway is not configured or disabled on this environment.',
            isConfigured: false,
          },
          { status: 503 }
        );
      }

      const youpiOrderId = `youpi_ord_${businessId.slice(-6)}_${Date.now()}`;

      // Record PENDING payment record with unique idempotencyKey
      await (prisma as any).subscriptionPayment.create({
        data: {
          businessId,
          amount: totalPriceInInr,
          currency: 'INR',
          plan: planConfig.prismaEnum,
          status: 'PENDING',
          gateway: 'YOUPI_PG',
          gatewayOrderId: youpiOrderId,
          idempotencyKey: `order_${youpiOrderId}`,
          billingPeriod: interval,
          notes: `Test Checkout via YOUPI PG for ${planConfig.name} (${interval}) - ₹${totalPriceInInr}`,
        },
      });

      const session = await createYoupiPaymentSession({
        orderId: youpiOrderId,
        amountInRupees: totalPriceInInr,
        currency: 'INR',
        customerName: authContext.business.name,
        customerEmail: authContext.session.user.email,
        customerMobile: authContext.session.user.phone || (authContext.business as any).phone || '',
        metadata: {
          businessId,
          planKey,
          prismaEnum: planConfig.prismaEnum,
          interval,
          durationMonths: String(pricing.durationMonths),
        },
      });

      return NextResponse.json({
        success: true,
        gateway: 'YOUPI_PG',
        orderId: session.orderId,
        paymentId: session.paymentId,
        amount: amountInPaise,
        currency: 'INR',
        checkoutUrl: session.checkoutUrl,
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
    }

    // Default Gateway: RAZORPAY (remains 100% production-facing and default)
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
