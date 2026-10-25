import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyWebhookSignature } from '@/lib/razorpay/client';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { OFFICIAL_PLANS, PlanKey, normalizePlanKey } from '@/lib/subscription/plans';

export async function POST(request: NextRequest) {
  try {
    // 1. Read exact raw request body string for cryptographic integrity
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing x-razorpay-signature header' },
        { status: 400 }
      );
    }

    // 2. Verify webhook signature
    const isValid = verifyWebhookSignature({ rawBody, signature });
    if (!isValid) {
      console.warn('Razorpay webhook signature verification failed');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;
    console.log(`Processing Razorpay webhook event: ${eventType} (ID: ${event.id || 'N/A'})`);

    // 3. Handle Order Paid / Payment Captured
    if (eventType === 'order.paid' || eventType === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderEntity = event.payload?.order?.entity;

      const paymentId = paymentEntity?.id;
      const orderId = paymentEntity?.order_id || orderEntity?.id;
      const notes = { ...(orderEntity?.notes || {}), ...(paymentEntity?.notes || {}) };

      if (!paymentId) {
        return NextResponse.json({ status: 'ignored', message: 'No payment ID in webhook' });
      }

      // Idempotency check: prevent duplicate credit
      const existingSuccess = await (prisma as any).subscriptionPayment.findFirst({
        where: {
          gatewayPaymentId: paymentId,
          status: 'SUCCESS',
        },
      });

      if (existingSuccess) {
        return NextResponse.json({
          status: 'ok',
          message: 'Webhook event already processed previously',
        });
      }

      // Locate corresponding payment record
      let paymentRecord = orderId
        ? await (prisma as any).subscriptionPayment.findFirst({
            where: { gatewayOrderId: orderId },
          })
        : null;

      const businessId = paymentRecord?.businessId || notes.businessId;

      if (!businessId) {
        console.warn('Webhook received for order without identifiable businessId:', orderId);
        return NextResponse.json({ status: 'ok', message: 'No matching tenant business found' });
      }

      const planKey: PlanKey =
        (notes.planKey as PlanKey) || normalizePlanKey(paymentRecord?.plan);
      const planConfig = OFFICIAL_PLANS[planKey] || OFFICIAL_PLANS.STARTER;
      const durationMonths = parseInt(notes.durationMonths, 10) || 1;

      // Calculate new subscription expiration
      const existingSub = await prisma.subscription.findFirst({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
      });

      const now = Date.now();
      const durationMs = durationMonths * 30 * 24 * 60 * 60 * 1000;
      let newEndDate: Date;

      if (existingSub?.endDate && new Date(existingSub.endDate).getTime() > now) {
        newEndDate = new Date(new Date(existingSub.endDate).getTime() + durationMs);
      } else {
        newEndDate = new Date(now + durationMs);
      }

      // Execute atomic transaction to update Subscription and SubscriptionPayment
      await prisma.$transaction(async (tx) => {
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

        if (paymentRecord) {
          await (tx as any).subscriptionPayment.update({
            where: { id: paymentRecord.id },
            data: {
              status: 'SUCCESS',
              gatewayPaymentId: paymentId,
              subscriptionId: sub.id,
              paidAt: new Date(),
              notes: `Fulfilled via Razorpay webhook (${eventType})`,
            },
          });
        } else {
          const amountInInr = (paymentEntity?.amount || 0) / 100;
          await (tx as any).subscriptionPayment.create({
            data: {
              businessId,
              subscriptionId: sub.id,
              amount: amountInInr,
              currency: paymentEntity?.currency || 'INR',
              plan: planConfig.prismaEnum,
              status: 'SUCCESS',
              gateway: 'RAZORPAY',
              gatewayOrderId: orderId || null,
              gatewayPaymentId: paymentId,
              idempotencyKey: `webhook_${paymentId}`,
              billingPeriod: notes.interval || 'MONTHLY',
              paidAt: new Date(),
              notes: `Created & fulfilled via Razorpay webhook (${eventType})`,
            },
          });
        }
      });

      return NextResponse.json({ status: 'ok', message: 'Subscription successfully activated' });
    }

    // 4. Handle Payment Failed
    if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;
      const failureReason =
        paymentEntity?.error_description || paymentEntity?.error_reason || 'Payment failed';

      if (orderId) {
        await (prisma as any).subscriptionPayment.updateMany({
          where: { gatewayOrderId: orderId },
          data: {
            status: 'FAILED',
            gatewayPaymentId: paymentId || undefined,
            notes: `Payment failed: ${failureReason}`,
          },
        });
      }

      return NextResponse.json({ status: 'ok', message: 'Failure recorded' });
    }

    // 5. Handle Recurring Subscription Charged (AutoPay renewal)
    if (eventType === 'subscription.charged') {
      const subscriptionEntity = event.payload?.subscription?.entity;
      const paymentEntity = event.payload?.payment?.entity;

      const subId = subscriptionEntity?.id;
      const paymentId = paymentEntity?.id;
      const notes = { ...(subscriptionEntity?.notes || {}), ...(paymentEntity?.notes || {}) };

      if (!paymentId) {
        return NextResponse.json({ status: 'ignored', message: 'Missing payment ID in subscription.charged' });
      }

      // Idempotency check: prevent duplicate credit
      const existingSuccess = await (prisma as any).subscriptionPayment.findFirst({
        where: { gatewayPaymentId: paymentId, status: 'SUCCESS' },
      });

      if (existingSuccess) {
        return NextResponse.json({ status: 'ok', message: 'Subscription charge already recorded' });
      }

      const businessId = notes.businessId;
      if (!businessId) {
        console.warn('subscription.charged received without businessId in notes:', subId);
        return NextResponse.json({ status: 'ok', message: 'No businessId in subscription notes' });
      }

      const planKey: PlanKey = (notes.planKey as PlanKey) || 'STARTER';
      const planConfig = OFFICIAL_PLANS[planKey] || OFFICIAL_PLANS.STARTER;
      const amountInInr = (paymentEntity?.amount || 0) / 100;

      // Extend subscription by 30 days
      const existingSub = await prisma.subscription.findFirst({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
      });

      const now = Date.now();
      const durationMs = 30 * 24 * 60 * 60 * 1000;
      let newEndDate: Date;

      if (existingSub?.endDate && new Date(existingSub.endDate).getTime() > now) {
        newEndDate = new Date(new Date(existingSub.endDate).getTime() + durationMs);
      } else {
        newEndDate = new Date(now + durationMs);
      }

      await prisma.$transaction(async (tx) => {
        let sub;
        if (existingSub) {
          sub = await tx.subscription.update({
            where: { id: existingSub.id },
            data: {
              plan: planConfig.prismaEnum,
              status: SubscriptionStatus.ACTIVE,
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

        await (tx as any).subscriptionPayment.create({
          data: {
            businessId,
            subscriptionId: sub.id,
            amount: amountInInr,
            currency: paymentEntity?.currency || 'INR',
            plan: planConfig.prismaEnum,
            status: 'SUCCESS',
            gateway: 'RAZORPAY',
            gatewayOrderId: subId || null,
            gatewayPaymentId: paymentId,
            idempotencyKey: `sub_charge_${paymentId}`,
            billingPeriod: 'MONTHLY',
            paidAt: new Date(),
            notes: `AutoPay recurring charge captured via webhook (${subId})`,
          },
        });
      });

      return NextResponse.json({ status: 'ok', message: 'Recurring AutoPay charge processed and subscription extended' });
    }

    // 6. Handle Subscription Halted / Cancelled
    if (eventType === 'subscription.halted' || eventType === 'subscription.cancelled') {
      const subscriptionEntity = event.payload?.subscription?.entity;
      const notes = subscriptionEntity?.notes || {};
      const businessId = notes.businessId;

      if (businessId) {
        console.log(`Razorpay subscription ${subscriptionEntity?.id} ${eventType} for business ${businessId}`);
      }

      return NextResponse.json({ status: 'ok', message: `Subscription event ${eventType} acknowledged` });
    }

    // 7. Handle Refund Processed
    if (eventType === 'refund.processed') {
      const refundEntity = event.payload?.refund?.entity;
      const paymentId = refundEntity?.payment_id;
      const refundAmount = (refundEntity?.amount || 0) / 100;

      if (paymentId) {
        await (prisma as any).subscriptionPayment.updateMany({
          where: { gatewayPaymentId: paymentId },
          data: {
            status: 'REFUNDED',
            refundAmount,
            refundedAt: new Date(),
            notes: `Refund of ₹${refundAmount} processed via Razorpay (${refundEntity?.id || 'N/A'})`,
          },
        });
      }

      return NextResponse.json({ status: 'ok', message: 'Refund processed acknowledged' });
    }

    // Acknowledge other unhandled events safely
    return NextResponse.json({ status: 'ok', message: `Unhandled event ${eventType} acknowledged` });
  } catch (error: any) {
    console.error('Razorpay webhook handler error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
