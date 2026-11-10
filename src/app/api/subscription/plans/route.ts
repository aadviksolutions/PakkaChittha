import { NextResponse } from 'next/server';
import { OFFICIAL_PLANS, BILLING_INTERVALS, PlanKey } from '@/lib/subscription/plans';
import { getAuthoritativePricing } from '@/lib/subscription/pricingService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dynamicPricing = await getAuthoritativePricing();

    const mergedPlans = { ...OFFICIAL_PLANS };
    for (const key of Object.keys(dynamicPricing) as PlanKey[]) {
      if (mergedPlans[key]) {
        mergedPlans[key] = {
          ...mergedPlans[key],
          pricing: dynamicPricing[key],
        };
      }
    }

    return NextResponse.json({
      success: true,
      plans: mergedPlans,
      intervals: BILLING_INTERVALS,
    });
  } catch (error) {
    console.error('Failed to get authoritative plans:', error);
    return NextResponse.json({
      success: true,
      plans: OFFICIAL_PLANS,
      intervals: BILLING_INTERVALS,
    });
  }
}
