import prisma from '@/lib/prisma';
import { OFFICIAL_PLANS, normalizePlanKey, PlanKey, OfficialPlan } from './plans';
import { SubscriptionStatus } from '@prisma/client';
import { calculateSubscriptionTrialInfo } from './trial';

export interface BusinessEntitlementsResult {
  businessId: string;
  businessName: string;
  isDemo: boolean;
  planKey: PlanKey;
  planName: string;
  status: SubscriptionStatus;
  isExpired: boolean;
  limits: OfficialPlan['limits'];
  entitlements: OfficialPlan['entitlements'];
  features: string[];
}

export async function getBusinessEntitlements(
  businessId: string
): Promise<BusinessEntitlementsResult> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!business) {
    // Safe default to FREE_KHATA (never grant paid access to an unresolved workspace)
    const defaultPlan = OFFICIAL_PLANS.FREE_KHATA;
    return {
      businessId,
      businessName: 'Unknown Workspace',
      isDemo: false,
      planKey: 'FREE_KHATA',
      planName: defaultPlan.name,
      status: SubscriptionStatus.ACTIVE,
      isExpired: false,
      limits: defaultPlan.limits,
      entitlements: defaultPlan.entitlements,
      features: defaultPlan.features,
    };
  }

  const isDemo = Boolean(business.isDemo || business.id.startsWith('demo_'));
  const activeSub = business.subscriptions[0];
  const trial = activeSub ? calculateSubscriptionTrialInfo(activeSub) : null;
  const planKey = normalizePlanKey(activeSub?.plan);
  const planConfig = OFFICIAL_PLANS[planKey];
  const status = trial ? trial.status : SubscriptionStatus.ACTIVE;
  const isExpired = trial ? trial.isExpired : (status === SubscriptionStatus.EXPIRED || status === SubscriptionStatus.SUSPENDED);
  const isPastDue = status === SubscriptionStatus.PAST_DUE;

  // If a commercial subscription is expired (including expired trial), suspended, or unpaid/past_due, restrict write entitlements safely
  const effectiveEntitlements = { ...planConfig.entitlements };
  if ((isExpired || isPastDue) && planKey !== 'FREE_KHATA') {
    // Expired or unpaid subscriptions cannot create new invoices, purchases, inventory items, or add staff
    effectiveEntitlements.canCreateInvoices = false;
    effectiveEntitlements.canManagePurchases = false;
    effectiveEntitlements.canManageStaff = false;
    effectiveEntitlements.canManageInventoryBasic = false;
    effectiveEntitlements.canAdvancedInventory = false;
  }

  return {
    businessId: business.id,
    businessName: business.name,
    isDemo,
    planKey,
    planName: planConfig.name,
    status,
    isExpired,
    limits: planConfig.limits,
    entitlements: effectiveEntitlements,
    features: planConfig.features,
  };
}

export async function checkFeatureEntitlement(
  businessId: string,
  feature: keyof OfficialPlan['entitlements']
): Promise<{
  allowed: boolean;
  requiredPlan?: 'STARTER' | 'GROWTH' | 'SCALE';
  planName?: string;
  message?: string;
}> {
  const result = await getBusinessEntitlements(businessId);
  const allowed = Boolean(result.entitlements[feature]);

  if (allowed) {
    return { allowed: true };
  }

  // Determine required plan
  const requiredPlan: 'STARTER' | 'GROWTH' | 'SCALE' = OFFICIAL_PLANS.STARTER.entitlements[feature]
    ? 'STARTER'
    : OFFICIAL_PLANS.GROWTH.entitlements[feature]
    ? 'GROWTH'
    : 'SCALE';

  const requiredPlanConfig = OFFICIAL_PLANS[requiredPlan];

  return {
    allowed: false,
    requiredPlan,
    planName: requiredPlanConfig.name,
    message: `This feature is available on ${requiredPlanConfig.name} (starting from ₹${requiredPlanConfig.pricing.MONTHLY.totalPrice}/mo).`,
  };
}
