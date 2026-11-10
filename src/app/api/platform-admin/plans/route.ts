import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, AuthError } from '@/lib/auth/guards';
import { OFFICIAL_PLANS, BillingInterval, PlanKey } from '@/lib/subscription/plans';
import { getAuthoritativePricing, updatePlanPrice } from '@/lib/subscription/pricingService';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireSuperAdmin();

    const [planCounts, authoritativePricing] = await Promise.all([
      prisma.subscription.groupBy({
        by: ['plan'],
        where: {
          status: SubscriptionStatus.ACTIVE,
          business: { isDemo: false },
        },
        _count: { id: true },
      }),
      getAuthoritativePricing(),
    ]);

    const countsMap: Record<string, number> = {};
    planCounts.forEach((c) => {
      countsMap[c.plan] = c._count.id;
    });

    const enrichedPlans = Object.entries(OFFICIAL_PLANS).map(([key, config]) => {
      let dbEnumKey = key;
      if (key === 'GROWTH') dbEnumKey = 'GROWTH_PRO';
      if (key === 'SCALE') dbEnumKey = 'ENTERPRISE';

      const currentPricing = authoritativePricing[key as PlanKey] || config.pricing;
      const monthlyPrice = currentPricing.MONTHLY.totalPrice;
      const annualPrice = currentPricing.YEARLY.totalPrice;
      const priceLabel = monthlyPrice === 0 ? '₹0' : `₹${monthlyPrice}/mo`;

      return {
        key,
        dbEnumKey,
        name: config.name,
        priceLabel,
        monthlyPrice,
        annualPrice,
        pricing: currentPricing,
        badge: config.badge || (key === 'FREE_KHATA' ? 'Free Forever' : 'Paid Tier'),
        features: config.features,
        quotas: {
          maxMonthlyInvoices: config.limits.maxMonthlyInvoices,
          maxStaffSeats: config.limits.maxUsers,
          maxBranches: config.limits.maxLocations,
          whatsAppQuota: 100,
        },
        activeSubscribersCount: countsMap[dbEnumKey] || countsMap[key] || 0,
      };
    });

    return NextResponse.json({
      success: true,
      plans: enrichedPlans,
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

    const { planKey, interval, price, reason } = body as {
      planKey: 'STARTER' | 'GROWTH' | 'SCALE';
      interval: BillingInterval;
      price: number;
      reason?: string;
    };

    if (!planKey || !['STARTER', 'GROWTH', 'SCALE'].includes(planKey)) {
      return NextResponse.json({ error: 'Valid planKey (STARTER, GROWTH, SCALE) is required' }, { status: 400 });
    }

    if (!interval || !['MONTHLY', 'THREE_MONTHS', 'SIX_MONTHS', 'YEARLY'].includes(interval)) {
      return NextResponse.json({ error: 'Valid billing interval is required' }, { status: 400 });
    }

    if (typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'Price must be a positive number' }, { status: 400 });
    }

    await updatePlanPrice(adminSession, planKey, interval, price, reason);

    return NextResponse.json({
      success: true,
      message: `Price for ${planKey} (${interval}) updated to ₹${price}`,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
