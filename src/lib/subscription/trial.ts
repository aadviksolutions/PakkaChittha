import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { normalizePlanKey, OFFICIAL_PLANS } from './plans';

export interface SubscriptionTrialInfo {
  plan: SubscriptionPlan;
  planName: string;
  status: SubscriptionStatus;
  isTrial: boolean;
  isExpired: boolean;
  trialDaysRemaining: number;
  startDate: Date;
  endDate: Date;
  displayText: string;
}

/**
 * Calculates real-time subscription trial countdown based strictly on server calendar timestamps.
 * Does not decrement on page refresh or login.
 */
export function calculateSubscriptionTrialInfo(sub: {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: Date | string;
  endDate?: Date | string | null;
  trialDaysRemaining?: number;
}): SubscriptionTrialInfo {
  const planKey = normalizePlanKey(sub.plan);
  const planConfig = OFFICIAL_PLANS[planKey];
  const startDate = new Date(sub.startDate);
  
  // 7 calendar days trial strictly recorded from server activation
  const defaultTrialEnd = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const endDate = sub.endDate ? new Date(sub.endDate) : defaultTrialEnd;

  const isTrial = sub.plan === SubscriptionPlan.FREE_TRIAL || sub.status === SubscriptionStatus.TRIALING;
  const now = Date.now();

  if (isTrial) {
    const diffMs = endDate.getTime() - now;
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
    const isExpired = diffMs <= 0 || sub.status === SubscriptionStatus.EXPIRED;
    const resolvedStatus = isExpired ? SubscriptionStatus.EXPIRED : SubscriptionStatus.TRIALING;

    let displayText: string;
    if (isExpired) {
      displayText = `${planConfig.name} · Free Trial Expired`;
    } else if (daysRemaining === 1) {
      displayText = `${planConfig.name} · Free Trial · 1 day remaining`;
    } else {
      displayText = `${planConfig.name} · Free Trial · ${daysRemaining} days remaining`;
    }

    return {
      plan: sub.plan,
      planName: planConfig.name,
      status: resolvedStatus,
      isTrial: true,
      isExpired,
      trialDaysRemaining: daysRemaining,
      startDate,
      endDate,
      displayText,
    };
  }

  // Active / Paid / Free Khata plan
  const isExpired = sub.status === SubscriptionStatus.EXPIRED || sub.status === SubscriptionStatus.SUSPENDED;
  const displayText = isExpired
    ? `${planConfig.name} · ${sub.status}`
    : `${planConfig.name} · Active`;

  return {
    plan: sub.plan,
    planName: planConfig.name,
    status: sub.status,
    isTrial: false,
    isExpired,
    trialDaysRemaining: 0,
    startDate,
    endDate,
    displayText,
  };
}
