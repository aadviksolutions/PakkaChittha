import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAccess } from '@/lib/auth/guards';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

const PLAN_TIERS: Record<
  SubscriptionPlan,
  {
    name: string;
    monthlyPrice: number;
    maxMonthlyInvoices: number;
    maxStaffSeats: number;
    maxBranches: number;
    whatsAppQuota: number;
  }
> = {
  FREE_KHATA: {
    name: 'Pakka Chittha Free Khata',
    monthlyPrice: 0,
    maxMonthlyInvoices: 0,
    maxStaffSeats: 1,
    maxBranches: 1,
    whatsAppQuota: 999999,
  },
  FREE_TRIAL: {
    name: '7-Day Free Trial',
    monthlyPrice: 0,
    maxMonthlyInvoices: 999999,
    maxStaffSeats: 2,
    maxBranches: 1,
    whatsAppQuota: 50,
  },
  STARTER: {
    name: 'Pakka Chittha Starter',
    monthlyPrice: 199,
    maxMonthlyInvoices: 999999,
    maxStaffSeats: 1,
    maxBranches: 1,
    whatsAppQuota: 150,
  },
  GROWTH_PRO: {
    name: 'Pakka Chittha Growth',
    monthlyPrice: 499,
    maxMonthlyInvoices: 999999,
    maxStaffSeats: 3,
    maxBranches: 1,
    whatsAppQuota: 600,
  },
  ENTERPRISE: {
    name: 'Pakka Chittha Scale',
    monthlyPrice: 999,
    maxMonthlyInvoices: 999999,
    maxStaffSeats: 10,
    maxBranches: 3,
    whatsAppQuota: 2500,
  },
};

export async function GET(request: NextRequest) {
  try {
    const authContext = await requireTenantAccess();
    const businessId = authContext.business.id;

    let subscription = await prisma.subscription.findFirst({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      // Create initial free trial subscription if none exists
      subscription = await prisma.subscription.create({
        data: {
          businessId,
          plan: SubscriptionPlan.FREE_TRIAL,
          status: SubscriptionStatus.TRIALING,
          monthlyPrice: 0,
          maxMonthlyInvoices: 100,
          maxStaffSeats: 2,
          maxBranches: 1,
          whatsAppQuota: 50,
          trialDaysRemaining: 7,
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 86400000),
        },
      });
    }

    // Calculate usage in current calendar month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyInvoicesCreated = await prisma.invoice.count({
      where: {
        businessId,
        createdAt: { gte: startOfMonth },
      },
    });

    const activeStaffCount = await prisma.businessMembership.count({
      where: { businessId },
    });

    const { calculateSubscriptionTrialInfo } = await import('@/lib/subscription/trial');
    const trial = calculateSubscriptionTrialInfo(subscription);

    // Fetch customer's subscription payments history
    const payments = await (prisma as any).subscriptionPayment.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        amount: true,
        currency: true,
        plan: true,
        status: true,
        gateway: true,
        gatewayPaymentId: true,
        gatewayOrderId: true,
        billingPeriod: true,
        notes: true,
        paidAt: true,
        refundedAt: true,
        refundAmount: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      subscription: {
        ...subscription,
        status: trial.status,
        trialDaysRemaining: trial.trialDaysRemaining,
        endDate: trial.endDate,
        displayText: trial.displayText,
      },
      customerIdentity: {
        userId: authContext.session.user.id,
        email: authContext.session.user.email,
        name: authContext.session.user.name,
        phone: authContext.session.user.phone || (authContext.business as any).phone || '',
        businessId: authContext.business.id,
        businessName: authContext.business.name,
      },
      payments,
      autoPay: {
        enabled: false,
        status: 'ONE_TIME_BILLING',
        description:
          'AutoPay (recurring e-mandate) is currently disabled pending merchant bank mandate approval on Razorpay Dashboard. Subscriptions are billed per selected duration with zero automatic recurring charges.',
      },
      usage: {
        monthlyInvoicesCreated,
        maxMonthlyInvoices: subscription.maxMonthlyInvoices,
        invoiceUsagePercent: Math.min(
          100,
          Math.round((monthlyInvoicesCreated / subscription.maxMonthlyInvoices) * 100)
        ),
        activeStaffCount,
        maxStaffSeats: subscription.maxStaffSeats,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscription' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

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

    const { plan, paymentVerified } = body;
    if (!plan || !PLAN_TIERS[plan as SubscriptionPlan]) {
      return NextResponse.json({ error: 'Valid plan tier is required' }, { status: 400 });
    }

    const isSuperAdmin = authContext.session.user.platformRole === 'SUPER_ADMIN';

    // Free Khata is permanently free and can be activated by any business owner.
    // Paid subscription plans (Starter, Growth, Scale) can ONLY be activated by Super Admin or confirmed gateway webhook.
    // Clients cannot self-authorize paid upgrades by sending paymentVerified: true in request payload.
    if (plan !== 'FREE_KHATA' && !isSuperAdmin) {
      return NextResponse.json(
        {
          error:
            'Payment verification required. Paid subscription plans (Starter, Growth, Scale) activate only after confirmed payment processing.',
          requiresPayment: true,
          plan,
        },
        { status: 402 }
      );
    }

    const tier = PLAN_TIERS[plan as SubscriptionPlan];

    // Find existing or create new
    const existing = await prisma.subscription.findFirst({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });

    const updated = existing
      ? await prisma.subscription.update({
          where: { id: existing.id },
          data: {
            plan: plan as SubscriptionPlan,
            status: SubscriptionStatus.ACTIVE,
            monthlyPrice: tier.monthlyPrice,
            maxMonthlyInvoices: tier.maxMonthlyInvoices,
            maxStaffSeats: tier.maxStaffSeats,
            maxBranches: tier.maxBranches,
            whatsAppQuota: tier.whatsAppQuota,
            trialDaysRemaining: 0,
            endDate: new Date(Date.now() + 365 * 86400000),
          },
        })
      : await prisma.subscription.create({
          data: {
            businessId,
            plan: plan as SubscriptionPlan,
            status: SubscriptionStatus.ACTIVE,
            monthlyPrice: tier.monthlyPrice,
            maxMonthlyInvoices: tier.maxMonthlyInvoices,
            maxStaffSeats: tier.maxStaffSeats,
            maxBranches: tier.maxBranches,
            whatsAppQuota: tier.whatsAppQuota,
            trialDaysRemaining: 0,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 86400000),
          },
        });

    return NextResponse.json({
      message: `Successfully upgraded to ${tier.name}!`,
      subscription: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update subscription' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
