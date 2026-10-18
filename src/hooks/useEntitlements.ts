'use client';

import { useAuth } from '@/context/AuthContext';
import { OFFICIAL_PLANS, normalizePlanKey, PlanKey, OfficialPlan } from '@/lib/subscription/plans';

export interface UseEntitlementsResult {
  planKey: PlanKey;
  planName: string;
  isFreeKhata: boolean;
  isStarter: boolean;
  isGrowth: boolean;
  isScale: boolean;
  isSuperAdmin: boolean;
  isTrial: boolean;
  isExpired: boolean;
  isPaidPlan: boolean;
  isHighestPlan: boolean;
  trialDaysRemaining: number;
  status: string;
  displayText: string;
  limits: OfficialPlan['limits'];
  entitlements: OfficialPlan['entitlements'];
  isAllowed: (feature: keyof OfficialPlan['entitlements']) => boolean;
  canAccessCommercial: boolean;
}

export function useEntitlements(): UseEntitlementsResult {
  const { user, activeBusiness, loading } = useAuth();

  const isSuperAdmin = user?.platformRole === 'SUPER_ADMIN';

  // If loading or no active business subscription, default to FREE_KHATA (safest fallback)
  const rawPlan = activeBusiness?.subscription?.plan;
  const planKey: PlanKey = normalizePlanKey(rawPlan);
  const planConfig = OFFICIAL_PLANS[planKey];

  const sub = activeBusiness?.subscription;
  const status = sub?.status || 'TRIALING';
  const isTrial = Boolean(sub?.isTrial || status === 'TRIALING' || rawPlan === 'FREE_TRIAL');
  const isExpired = Boolean(sub?.isExpired || status === 'EXPIRED');
  const trialDaysRemaining = typeof sub?.trialDaysRemaining === 'number' ? sub.trialDaysRemaining : 14;

  const isFreeKhata = planKey === 'FREE_KHATA';
  const isStarter = planKey === 'STARTER';
  const isGrowth = planKey === 'GROWTH';
  const isScale = planKey === 'SCALE';
  const isHighestPlan = planKey === 'SCALE';
  const isPaidPlan = !isFreeKhata && status === 'ACTIVE';

  let displayText = sub?.displayText;
  if (!displayText) {
    if (isFreeKhata) {
      displayText = 'Lenden Free Khata · 100% Free';
    } else if (isTrial) {
      displayText = isExpired
        ? `${planConfig.name} · Free Trial Expired`
        : `${planConfig.name} · Free Trial · ${trialDaysRemaining} days remaining`;
    } else {
      displayText = `${planConfig.name} · ${status}`;
    }
  }

  const isAllowed = (feature: keyof OfficialPlan['entitlements']): boolean => {
    if (isSuperAdmin) return true;
    if (loading) return false;
    if (isExpired && !isFreeKhata) {
      // Allow read operations, disallow write operations
      if (
        feature === 'canCreateInvoices' ||
        feature === 'canManagePurchases' ||
        feature === 'canManageStaff' ||
        feature === 'canManageInventoryBasic'
      ) {
        return false;
      }
    }
    return Boolean(planConfig.entitlements[feature]);
  };

  const canAccessCommercial = isSuperAdmin || !isFreeKhata;

  return {
    planKey,
    planName: planConfig.name,
    isFreeKhata,
    isStarter,
    isGrowth,
    isScale,
    isSuperAdmin,
    isTrial,
    isExpired,
    isPaidPlan,
    isHighestPlan,
    trialDaysRemaining,
    status,
    displayText,
    limits: planConfig.limits,
    entitlements: planConfig.entitlements,
    isAllowed,
    canAccessCommercial,
  };
}
