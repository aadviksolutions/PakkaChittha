import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAccess, AuthError } from '@/lib/auth/guards';
import {
  OFFICIAL_PLANS,
  PlanKey,
  BillingInterval,
  BILLING_INTERVALS,
} from '@/lib/subscription/plans';
import { verifyPaymentSignature } from '@/lib/razorpay/client';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireTenantAccess(undefined, ['BUSINESS_OWNER']);
    const businessId = authContext.business.id;

    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planKey,
      interval = 'MONTHLY',
    } = body as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      planKey: PlanKey;
      interval: BillingInterval;
    };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing required Razorpay payment credentials for verification' },
        { status: 400 }
      );
    }

    // 1. Cryptographically verify signature with constant-time HMAC SHA-256
    const isSignatureValid = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isSignatureValid) {
      // Mark matching payment record as FAILED if present
      await (prisma as any).subscriptionPayment.updateMany({
        where: { gatewayOrderId: razorpay_order_id, businessId },
        data: {
          status: 'FAILED',
          gatewayPaymentId: razorpay_payment_id,
          notes: 'Failed cryptographic signature verification',
        },
      });

      return NextResponse.json(
        { error: 'Invalid payment signature. Verification failed.' },
        { status: 400 }
      );
    }

    // 2. Idempotency Check: prevent duplicate processing if already completed
    const existingSuccessfulPayment = await (prisma as any).subscriptionPayment.findFirst({
      where: {
        gatewayPaymentId: razorpay_payment_id,
        status: 'SUCCESS',
      },
    });

    if (existingSuccessfulPayment) {
      return NextResponse.json({
        success: true,
        message: 'Payment has already been verified and subscription is active.',
        paymentId: existingSuccessfulPayment.id,
      });
    }

    // 3. Match the pending payment record
    const pendingPayment = await (prisma as any).subscriptionPayment.findFirst({
      where: {
        gatewayOrderId: razorpay_order_id,
        businessId,
      },
    });

    const targetPlanKey: PlanKey = planKey || (pendingPayment?.plan as PlanKey) || 'STARTER';
    const planConfig = OFFICIAL_PLANS[targetPlanKey] || OFFICIAL_PLANS.STARTER;
    const validInterval = BILLING_INTERVALS.find((i) => i.key === interval) || BILLING_INTERVALS[0];
    const durationMonths = validInterval.months;

    // 4. Calculate subscription expiry date
    const existingSub = await prisma.subscription.findFirst({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();
    const durationMs = durationMonths * 30 * 24 * 60 * 60 * 1000;
    let newEndDate: Date;

    if (existingSub?.endDate && new Date(existingSub.endDate).getTime() > now) {
      // If already active, extend from existing end date
      newEndDate = new Date(new Date(existingSub.endDate).getTime() + durationMs);
    } else {
      // Otherwise start from now
      newEndDate = new Date(now + durationMs);
    }

    // 5. Atomic database transaction: activate subscription & mark payment successful
    const [updatedSub, completedPayment] = await prisma.$transaction(async (tx) => {
      let sub;
      if (existingSub) {
        sub = await tx.subscription.update({
          where: { id: existingSub.id },
          data: {
            plan: planConfig.prismaEnum,
            status: SubscriptionStatus.ACTIVE,
            monthlyPrice: planConfig.pricing.MONTHLY.totalPrice,
            maxMonthlyInvoices: planConfig.limits.maxMonthlyInvoices,
            maxStaffSeats: planConfig.limits.maxUsers,
            maxBranches: planConfig.limits.maxLocations,
            endDate: newEndDate,
            trialDaysRemaining: 0,
          },
        });
      } else {
        sub = await tx.subscription.create({
          data: {
            businessId,
            plan: planConfig.prismaEnum,
            status: SubscriptionStatus.ACTIVE,
            monthlyPrice: planConfig.pricing.MONTHLY.totalPrice,
            maxMonthlyInvoices: planConfig.limits.maxMonthlyInvoices,
            maxStaffSeats: planConfig.limits.maxUsers,
            maxBranches: planConfig.limits.maxLocations,
            startDate: new Date(),
            endDate: newEndDate,
            trialDaysRemaining: 0,
          },
        });
      }

      let pay;
      if (pendingPayment) {
        pay = await (tx as any).subscriptionPayment.update({
          where: { id: pendingPayment.id },
          data: {
            status: 'SUCCESS',
            gatewayPaymentId: razorpay_payment_id,
            subscriptionId: sub.id,
            paidAt: new Date(),
            notes: `Verified payment for ${planConfig.name} (${validInterval.label})`,
          },
        });
      } else {
        pay = await (tx as any).subscriptionPayment.create({
          data: {
            businessId,
            subscriptionId: sub.id,
            amount: planConfig.pricing[validInterval.key].totalPrice,
            currency: 'INR',
            plan: planConfig.prismaEnum,
            status: 'SUCCESS',
            gateway: 'RAZORPAY',
            gatewayOrderId: razorpay_order_id,
            gatewayPaymentId: razorpay_payment_id,
            idempotencyKey: `pay_${razorpay_payment_id}`,
            billingPeriod: validInterval.key,
            paidAt: new Date(),
            notes: `Directly verified payment for ${planConfig.name} (${validInterval.label})`,
          },
        });
      }

      return [sub, pay];
    });

    return NextResponse.json({
      success: true,
      message: `Payment verified! You are now subscribed to ${planConfig.name}.`,
      subscription: updatedSub,
      payment: completedPayment,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
