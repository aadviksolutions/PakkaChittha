import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyYoupiWebhookSignature, isYoupiTestConfigured } from '@/lib/youpi/client';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { OFFICIAL_PLANS, PlanKey, normalizePlanKey } from '@/lib/subscription/plans';

export async function POST(request: NextRequest) {
  try {
    // 0. Strict Environment & Test Mode Check
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'YOUPI PG test webhooks are disabled in production' },
        { status: 403 }
      );
    }

    if (!isYoupiTestConfigured()) {
      return NextResponse.json(
        { error: 'YOUPI PG test gateway is not configured' },
        { status: 503 }
      );
    }

    // 1. Read exact raw request body for cryptographic signature verification
    const rawBody = await request.text();
    const signatureV2 = request.headers.get('x-gateway-signature-v2');
    const signatureV1 = request.headers.get('x-gateway-signature');
    const timestamp = request.headers.get('x-gateway-timestamp');
    const deliveryId = request.headers.get('x-gateway-delivery-id');
    const gatewayEventHeader = request.headers.get('x-gateway-event');

    if (!signatureV2 && !signatureV1) {
      return NextResponse.json(
        { error: 'Missing gateway signature header (x-gateway-signature-v2 or x-gateway-signature required)' },
        { status: 400 }
      );
    }

    // 2. Cryptographic signature and timestamp verification
    const verification = verifyYoupiWebhookSignature({
      rawBody,
      signature: signatureV1,
      signatureV2,
      timestamp,
    });

    if (!verification.isValid) {
      console.warn(`YOUPI PG webhook verification rejected: ${verification.reason}`);
      return NextResponse.json(
        { error: `Invalid webhook signature: ${verification.reason || 'VERIFICATION_FAILED'}` },
        { status: 400 }
      );
    }

    // 3. Parse and validate webhook payload structure
    let eventPayload: any;
    try {
      eventPayload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    const {
      event: payloadEvent,
      paymentId,
      orderId,
      amount,
      amountPaise,
      currency = 'INR',
      metadata = {},
    } = eventPayload;

    const eventType = payloadEvent || gatewayEventHeader;

    if (!paymentId || !orderId) {
      return NextResponse.json({ error: 'Missing paymentId or orderId in webhook event' }, { status: 400 });
    }

    // 4. Idempotency Check: prevent duplicate activation or double crediting
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
        deliveryId,
      });
    }

    // 5. Match existing server-side payment record
    const paymentRecord = await (prisma as any).subscriptionPayment.findFirst({
      where: {
        gatewayOrderId: orderId,
        gateway: 'YOUPI_PG',
      },
    });

    if (!paymentRecord) {
      console.warn(`YOUPI PG webhook received for unknown or unassociated order: ${orderId}`);
      return NextResponse.json(
        { error: 'No matching YOUPI PG payment record found for this order' },
        { status: 404 }
      );
    }

    const businessId = paymentRecord.businessId;

    // 6. Validate Currency and Amount Integrity
    const expectedCurrency = (paymentRecord.currency || 'INR').toUpperCase();
    const eventCurrency = String(currency).toUpperCase();
    if (expectedCurrency !== eventCurrency) {
      await (prisma as any).subscriptionPayment.update({
        where: { id: paymentRecord.id },
        data: {
          status: 'FAILED',
          gatewayPaymentId: paymentId,
          notes: `Currency mismatch: expected ${expectedCurrency}, got ${eventCurrency}`,
        },
      });
      return NextResponse.json({ error: 'Currency mismatch' }, { status: 400 });
    }

    const expectedAmountPaise = Math.round(paymentRecord.amount * 100);
    const receivedAmountPaise = amountPaise != null
      ? Number(amountPaise)
      : Math.round(parseFloat(amount || '0') * 100);

    if (expectedAmountPaise !== receivedAmountPaise) {
      await (prisma as any).subscriptionPayment.update({
        where: { id: paymentRecord.id },
        data: {
          status: 'FAILED',
          gatewayPaymentId: paymentId,
          notes: `Amount mismatch: expected ${expectedAmountPaise} paise, got ${receivedAmountPaise} paise`,
        },
      });
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }

    // 7. Handle Terminal Failures without plan activation
    if (eventType === 'payment.failed' || eventType === 'payment.expired' || eventType === 'payment.cancelled') {
      const targetStatus = eventType === 'payment.expired'
        ? 'EXPIRED'
        : eventType === 'payment.cancelled'
        ? 'CANCELLED'
        : 'FAILED';

      await (prisma as any).subscriptionPayment.update({
        where: { id: paymentRecord.id },
        data: {
          status: targetStatus,
          gatewayPaymentId: paymentId,
          notes: `Marked ${targetStatus} via YOUPI webhook (${eventType})`,
        },
      });

      return NextResponse.json({
        status: 'ok',
        message: `Payment record updated to ${targetStatus}`,
      });
    }

    // 8. Handle Payment Success and Atomic Subscription Activation
    if (eventType === 'payment.success' || eventType === 'order.paid') {
      const planKey: PlanKey =
        (metadata.planKey as PlanKey) || normalizePlanKey(paymentRecord.plan);
      const planConfig = OFFICIAL_PLANS[planKey] || OFFICIAL_PLANS.STARTER;

      const durationMonths = parseInt(metadata.durationMonths, 10) ||
        (paymentRecord.billingPeriod === 'ANNUAL' ? 12 : 1);

      // Fetch existing business subscription
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

      // Execute atomic transaction for ACID integrity
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

        await (tx as any).subscriptionPayment.update({
          where: { id: paymentRecord.id },
          data: {
            status: 'SUCCESS',
            gatewayPaymentId: paymentId,
            subscriptionId: sub.id,
            paidAt: new Date(),
            notes: `Fulfilled via YOUPI PG webhook (${eventType}) [Delivery: ${deliveryId || 'direct'}]`,
          },
        });
      });

      return NextResponse.json({
        status: 'ok',
        message: 'Subscription successfully activated via YOUPI PG',
        businessId,
        paymentId,
      });
    }

    // Default: unhandled non-terminal events
    return NextResponse.json({ status: 'ignored', message: `Unhandled event type: ${eventType}` });
  } catch (error: any) {
    console.error('Error handling YOUPI PG webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error processing webhook' },
      { status: 500 }
    );
  }
}
