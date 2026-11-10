import prisma from '@/lib/prisma';
import { CurrentAuthSession } from '@/lib/auth/session';
import { recordAdminAudit } from '@/lib/admin/audit';
import {
  BillingInterval,
  PlanKey,
  PlanPricing,
  OFFICIAL_PLANS,
  BILLING_INTERVALS,
} from './plans';

export interface DynamicPlanPricing {
  planKey: PlanKey;
  interval: BillingInterval;
  durationMonths: number;
  totalPrice: number;
  monthlyEquivalent: number;
  savingsAmount: number;
  savingsPercent: number;
  isActive: boolean;
}

export const DEFAULT_PLAN_PRICES: Record<
  'STARTER' | 'GROWTH' | 'SCALE',
  Record<BillingInterval, { months: number; price: number }>
> = {
  STARTER: {
    MONTHLY: { months: 1, price: 199 },
    THREE_MONTHS: { months: 3, price: 499 },
    SIX_MONTHS: { months: 6, price: 799 },
    YEARLY: { months: 12, price: 1499 },
  },
  GROWTH: {
    MONTHLY: { months: 1, price: 499 },
    THREE_MONTHS: { months: 3, price: 1299 },
    SIX_MONTHS: { months: 6, price: 2499 },
    YEARLY: { months: 12, price: 4499 },
  },
  SCALE: {
    MONTHLY: { months: 1, price: 999 },
    THREE_MONTHS: { months: 3, price: 2499 },
    SIX_MONTHS: { months: 6, price: 4499 },
    YEARLY: { months: 12, price: 8499 },
  },
};

/**
 * Calculates PlanPricing details given duration and package price.
 */
export function buildPricing(monthlyBase: number, months: number, packagePrice: number): PlanPricing {
  const fullMonthlySum = monthlyBase * months;
  const savings = Math.max(0, fullMonthlySum - packagePrice);
  const savingsPercent = months > 1 && fullMonthlySum > 0 ? Math.round((savings / fullMonthlySum) * 100) : 0;
  return {
    durationMonths: months,
    totalPrice: packagePrice,
    monthlyEquivalent: Math.round(packagePrice / months),
    savingsAmount: savings,
    savingsPercent,
  };
}

/**
 * Ensures all default plan pricing records exist in database.
 */
export async function ensureDefaultPlanPricing(): Promise<void> {
  try {
    const existing = await prisma.subscriptionPlanPricing.findMany();
    if (existing.length === 0) {
      for (const [planKey, intervals] of Object.entries(DEFAULT_PLAN_PRICES)) {
        for (const [interval, config] of Object.entries(intervals)) {
          await prisma.subscriptionPlanPricing.upsert({
            where: {
              planKey_interval: {
                planKey,
                interval,
              },
            },
            update: {},
            create: {
              planKey,
              interval,
              durationMonths: config.months,
              price: config.price,
              isActive: true,
            },
          });
        }
      }
    }
  } catch (error) {
    console.warn('ensureDefaultPlanPricing error:', error);
  }
}

/**
 * Retrieves authoritative dynamic pricing from database, falling back to defaults.
 */
export async function getAuthoritativePricing(): Promise<
  Record<PlanKey, Record<BillingInterval, PlanPricing>>
> {
  const result: Record<PlanKey, Record<BillingInterval, PlanPricing>> = {
    FREE_KHATA: {
      MONTHLY: buildPricing(0, 1, 0),
      THREE_MONTHS: buildPricing(0, 3, 0),
      SIX_MONTHS: buildPricing(0, 6, 0),
      YEARLY: buildPricing(0, 12, 0),
    },
    STARTER: { ...OFFICIAL_PLANS.STARTER.pricing },
    GROWTH: { ...OFFICIAL_PLANS.GROWTH.pricing },
    SCALE: { ...OFFICIAL_PLANS.SCALE.pricing },
  };

  try {
    const dbPrices = await prisma.subscriptionPlanPricing.findMany({
      where: { isActive: true },
    });

    if (dbPrices.length === 0) {
      await ensureDefaultPlanPricing();
      return result;
    }

    // Map monthly base prices for savings calculation
    const monthlyBases: Record<string, number> = {
      STARTER: 199,
      GROWTH: 499,
      SCALE: 999,
    };

    dbPrices.forEach((row) => {
      if (row.interval === 'MONTHLY') {
        monthlyBases[row.planKey] = row.price;
      }
    });

    dbPrices.forEach((row) => {
      const pKey = row.planKey as PlanKey;
      const interval = row.interval as BillingInterval;
      if (result[pKey] && result[pKey][interval]) {
        const base = monthlyBases[row.planKey] || row.price;
        result[pKey][interval] = buildPricing(base, row.durationMonths, row.price);
      }
    });
  } catch (error) {
    console.warn('Could not read dynamic pricing from database, using fallback:', error);
  }

  return result;
}

/**
 * Updates a plan interval price by Super Admin.
 */
export async function updatePlanPrice(
  adminSession: CurrentAuthSession,
  planKey: 'STARTER' | 'GROWTH' | 'SCALE',
  interval: BillingInterval,
  newPrice: number,
  reason?: string
): Promise<void> {
  if (newPrice <= 0) {
    throw new Error('Price must be greater than zero');
  }

  const durationMonths =
    BILLING_INTERVALS.find((i) => i.key === interval)?.months || 1;

  const old = await prisma.subscriptionPlanPricing.findUnique({
    where: {
      planKey_interval: {
        planKey,
        interval,
      },
    },
  });

  await prisma.subscriptionPlanPricing.upsert({
    where: {
      planKey_interval: {
        planKey,
        interval,
      },
    },
    update: {
      price: newPrice,
      durationMonths,
      updatedBy: adminSession.user.email,
    },
    create: {
      planKey,
      interval,
      durationMonths,
      price: newPrice,
      updatedBy: adminSession.user.email,
    },
  });

  await recordAdminAudit(adminSession, {
    action: 'SUBSCRIPTION_PRICE_UPDATE',
    targetType: 'PLATFORM',
    targetId: `${planKey}_${interval}`,
    targetName: `${planKey} ${interval}`,
    reason: reason || `Updated price from ₹${old?.price ?? 'N/A'} to ₹${newPrice}`,
    metadata: {
      planKey,
      interval,
      oldPrice: old?.price,
      newPrice,
    },
  });
}

/**
 * Validates a discount code server-side with anti-abuse and usage rules.
 */
export async function validateDiscountCode(params: {
  code: string;
  planKey: PlanKey;
  interval: BillingInterval;
  totalPrice: number;
  userId: string;
  businessId?: string;
}): Promise<{
  valid: boolean;
  discountAmount: number;
  finalAmount: number;
  discountCodeId?: string;
  code?: string;
  description?: string;
  error?: string;
}> {
  const cleanCode = params.code.trim().toUpperCase();

  const discount = await prisma.discountCode.findUnique({
    where: { code: cleanCode },
  });

  if (!discount || !discount.isActive) {
    return { valid: false, discountAmount: 0, finalAmount: params.totalPrice, error: 'Invalid or inactive discount code.' };
  }

  const now = new Date();
  if (discount.startDate && now < discount.startDate) {
    return { valid: false, discountAmount: 0, finalAmount: params.totalPrice, error: 'Discount code is not active yet.' };
  }

  if (discount.expiryDate && now > discount.expiryDate) {
    return { valid: false, discountAmount: 0, finalAmount: params.totalPrice, error: 'Discount code has expired.' };
  }

  // Check minimum purchase
  if (discount.minPurchaseAmount && params.totalPrice < discount.minPurchaseAmount) {
    return {
      valid: false,
      discountAmount: 0,
      finalAmount: params.totalPrice,
      error: `Minimum purchase amount of ₹${discount.minPurchaseAmount} required for this code.`,
    };
  }

  // Check applicable plans
  if (discount.applicablePlans !== 'ALL') {
    const allowedPlans = discount.applicablePlans.split(',').map((p) => p.trim());
    if (!allowedPlans.includes(params.planKey)) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: params.totalPrice,
        error: `This code is not applicable for the ${params.planKey} plan.`,
      };
    }
  }

  // Check applicable durations
  if (discount.applicableDurations !== 'ALL') {
    const allowedDurations = discount.applicableDurations.split(',').map((d) => d.trim());
    if (!allowedDurations.includes(params.interval)) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: params.totalPrice,
        error: `This code is not applicable for ${params.interval} billing duration.`,
      };
    }
  }

  // Check global usage limit
  if (discount.totalUsageLimit !== null && discount.usedCount >= discount.totalUsageLimit) {
    return {
      valid: false,
      discountAmount: 0,
      finalAmount: params.totalPrice,
      error: 'Discount code usage limit has been reached.',
    };
  }

  // Check per-customer limit
  if (discount.perCustomerLimit !== null && discount.perCustomerLimit > 0) {
    const userUsageCount = await prisma.discountUsage.count({
      where: {
        discountCodeId: discount.id,
        OR: [
          { userId: params.userId },
          ...(params.businessId ? [{ businessId: params.businessId }] : []),
        ],
      },
    });

    if (userUsageCount >= discount.perCustomerLimit) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: params.totalPrice,
        error: 'You have already reached the maximum usage limit for this discount code.',
      };
    }
  }

  // Check new customers only
  if (discount.newCustomersOnly && params.businessId) {
    const priorPayments = await prisma.subscriptionPayment.count({
      where: {
        businessId: params.businessId,
        status: 'SUCCESS',
      },
    });

    if (priorPayments > 0) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: params.totalPrice,
        error: 'This discount code is only available for first-time subscribers.',
      };
    }
  }

  // Calculate discount
  let discountAmount = 0;
  if (discount.type === 'PERCENTAGE') {
    discountAmount = Math.round((params.totalPrice * discount.value) / 100);
    if (discount.maxDiscountAmount && discount.maxDiscountAmount > 0) {
      discountAmount = Math.min(discountAmount, discount.maxDiscountAmount);
    }
  } else {
    // FIXED
    discountAmount = Math.min(params.totalPrice, Math.round(discount.value));
  }

  discountAmount = Math.max(0, Math.min(discountAmount, params.totalPrice));
  const finalAmount = Math.max(0, Math.round(params.totalPrice - discountAmount));

  return {
    valid: true,
    discountCodeId: discount.id,
    code: discount.code,
    description: discount.description || undefined,
    discountAmount,
    finalAmount,
  };
}

/**
 * Atomically marks discount code redeemed on successful payment.
 */
export async function redeemDiscountCode(params: {
  discountCodeId: string;
  userId: string;
  businessId?: string;
  orderId?: string;
  paymentId?: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
}): Promise<void> {
  await prisma.$transaction([
    prisma.discountCode.update({
      where: { id: params.discountCodeId },
      data: {
        usedCount: { increment: 1 },
      },
    }),
    prisma.discountUsage.create({
      data: {
        discountCodeId: params.discountCodeId,
        userId: params.userId,
        businessId: params.businessId || null,
        orderId: params.orderId || null,
        paymentId: params.paymentId || null,
        originalAmount: params.originalAmount,
        discountAmount: params.discountAmount,
        finalAmount: params.finalAmount,
      },
    }),
  ]);
}
