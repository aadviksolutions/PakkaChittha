'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ModulePageShell } from '@/components/shared/ModulePageShell';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import {
  Check,
  ShieldCheck,
  Zap,
  Sparkles,
  CreditCard,
  Clock,
  ArrowRight,
  RotateCcw,
  Users,
  Store,
  Layers,
  Crown,
  Printer,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Mail,
  Building2,
  Lock,
} from 'lucide-react';
import {
  OFFICIAL_PLANS,
  BILLING_INTERVALS,
  BillingInterval,
  PlanKey,
  normalizePlanKey,
} from '@/lib/subscription/plans';

interface SubscriptionData {
  id: string;
  plan: 'FREE_TRIAL' | 'STARTER' | 'GROWTH_PRO' | 'ENTERPRISE';
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'EXPIRED';
  monthlyPrice: number;
  maxMonthlyInvoices: number;
  maxStaffSeats: number;
  maxBranches: number;
  whatsAppQuota: number;
  trialDaysRemaining: number;
  endDate?: string | null;
  startDate?: string | null;
  isTrial?: boolean;
  isExpired?: boolean;
  displayText?: string;
}

interface UsageData {
  monthlyInvoicesCreated: number;
  maxMonthlyInvoices: number;
  invoiceUsagePercent: number;
  activeStaffCount: number;
  maxStaffSeats: number;
}

interface CustomerIdentity {
  userId: string;
  email: string;
  name: string;
  phone: string;
  businessId: string;
  businessName: string;
}

interface CustomerPaymentItem {
  id: string;
  amount: number;
  currency: string;
  plan: string;
  status: string;
  gateway: string;
  gatewayPaymentId: string | null;
  gatewayOrderId: string | null;
  billingPeriod: string;
  notes: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  refundAmount: number | null;
  createdAt: string;
}

interface AutoPayInfo {
  enabled: boolean;
  status: string;
  description: string;
}

export default function SubscriptionPage() {
  const toast = useToast();
  const { activeBusiness } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [customerIdentity, setCustomerIdentity] = useState<CustomerIdentity | null>(null);
  const [payments, setPayments] = useState<CustomerPaymentItem[]>([]);
  const [autoPay, setAutoPay] = useState<AutoPayInfo | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<CustomerPaymentItem | null>(null);
  const [interval, setInterval] = useState<BillingInterval>('YEARLY');

  const isDemo = Boolean(activeBusiness?.id?.startsWith('demo_') || (activeBusiness as any)?.isDemo);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/subscription');
      if (!res.ok) throw new Error('Failed to load subscription info');
      const data = await res.json();
      setSubscription(data.subscription);
      setUsage(data.usage);
      setCustomerIdentity(data.customerIdentity || null);
      setPayments(data.payments || []);
      setAutoPay(data.autoPay || null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error loading subscription');
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async (planKey: PlanKey) => {
    if (isDemo) {
      toast.info('This is a simulated demo workspace. Use the switcher in the top banner to test different plans.');
      return;
    }

    // Free Khata is permanently free and does not require gateway checkout
    if (planKey === 'FREE_KHATA') {
      try {
        setSubscribing(true);
        const res = await fetch('/api/subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: 'FREE_KHATA' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to switch to Free Khata');
        toast.success(data.message || 'Switched to Free Khata!');
        fetchSubscription();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Error switching plan');
      } finally {
        setSubscribing(false);
      }
      return;
    }

    try {
      setSubscribing(true);

      // 1. Create Razorpay Order on server
      const checkoutRes = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey, interval }),
      });

      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) {
        throw new Error(checkoutData.error || 'Failed to initialize payment checkout');
      }

      // 2. Load Razorpay Checkout Script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Could not load Razorpay payment SDK. Please check your internet connection.');
      }

      // 3. Launch Razorpay modal
      const options = {
        key: checkoutData.keyId,
        amount: checkoutData.amount,
        currency: checkoutData.currency,
        name: 'Pakka Chittha Cloud Platform',
        description: `${checkoutData.planName} (${interval})`,
        order_id: checkoutData.orderId,
        image: '/logo.png',
        prefill: {
          name: checkoutData.business?.name || '',
          email: checkoutData.business?.email || '',
          contact: checkoutData.business?.phone || '',
        },
        theme: {
          color: '#071F38',
        },
        modal: {
          ondismiss: () => {
            toast.info('Payment checkout dismissed');
            setSubscribing(false);
          },
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            setSubscribing(true);
            // 4. Cryptographically verify signature on server
            const verifyRes = await fetch('/api/subscription/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planKey,
                interval,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || 'Payment signature verification failed');
            }

            toast.success(verifyData.message || 'Subscription successfully upgraded!');
            fetchSubscription();
          } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Error verifying payment');
          } finally {
            setSubscribing(false);
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        toast.error(`Payment failed: ${resp.error?.description || 'Transaction unsuccessful'}`);
        setSubscribing(false);
      });
      rzp.open();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error starting checkout');
      setSubscribing(false);
    }
  };

  const currentPlan = subscription?.plan || 'FREE_TRIAL';
  const activePlanKey: PlanKey = normalizePlanKey(currentPlan);
  const isTrial = subscription?.status === 'TRIALING' || currentPlan === 'FREE_TRIAL';

  return (
    <ModulePageShell
      title="My Business Subscription & Billing"
      description="Manage your subscription plan, examine limits, and evaluate Starter, Growth, and Scale entitlements."
      targetPhase="Subscription Management"
    >
      <div className="space-y-6">
        {/* Demo Mode Notice Banner if in Demo */}
        {isDemo && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <strong>DEMO MODE WORKSPACE:</strong> You are testing the sample{' '}
                <span className="font-bold uppercase underline">{activePlanKey}</span> workspace. Real
                payment charges and real subscription updates are blocked.
              </div>
            </div>
            <Link
              href="/pricing"
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors shrink-0"
            >
              View Pricing Details
            </Link>
          </div>
        )}

        {/* Authenticated Account Identity & AutoPay Status Card */}
        {customerIdentity && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                  <Mail className="w-4 h-4 text-[#EA580C]" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Registered Billing Email
                  </span>
                  <span className="font-bold text-[#071F38] flex items-center gap-1.5">
                    {customerIdentity.email}
                    <span title="Cryptographically tied to authenticated session">
                      <Lock className="w-3 h-3 text-emerald-600" />
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                  <Building2 className="w-4 h-4 text-[#071F38]" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Store / Workspace
                  </span>
                  <span className="font-bold text-[#071F38]">{customerIdentity.businessName}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start md:self-auto bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  AutoPay (Recurring Mandate)
                </span>
                <span className="font-bold text-slate-700 text-[11px]">
                  Disabled • One-Time Invoicing Only
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Active Plan & Usage Banner */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#071F38] text-white">
                <Sparkles className="w-5 h-5 text-[#EA580C]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#071F38]">
                    Active Plan: {OFFICIAL_PLANS[activePlanKey]?.name || currentPlan.replace('_', ' ')}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      subscription?.status === 'ACTIVE'
                        ? 'bg-orange-50 text-[#EA580C] border-orange-200'
                        : subscription?.status === 'TRIALING'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {subscription?.status || 'TRIALING'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isTrial
                    ? `7-Day Free Evaluation Period (${subscription?.trialDaysRemaining || 7} days remaining)`
                    : `Active subscription valid until ${
                        subscription?.endDate
                          ? new Date(subscription.endDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Renewal'
                      }`}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono font-bold text-[#071F38]">
                ₹{OFFICIAL_PLANS[activePlanKey]?.pricing.MONTHLY.totalPrice || subscription?.monthlyPrice || 0}/mo
              </span>
              <p className="text-[11px] text-slate-400">Unlimited Invoices Included</p>
            </div>
          </div>

          {/* Usage Metrics */}
          {usage && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700">Monthly Invoices Generated</span>
                  <span className="font-mono font-bold text-[#EA580C]">
                    {usage.monthlyInvoicesCreated} Created / UNLIMITED
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#EA580C]" style={{ width: '100%' }} />
                </div>
                <p className="text-[11px] text-slate-500">
                  Unlimited invoice generation on all official plans. No monthly cap.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">Staff Seats Active</span>
                  <span className="text-lg font-black text-[#071F38] font-mono mt-1 block">
                    {usage.activeStaffCount} / {OFFICIAL_PLANS[activePlanKey]?.limits.maxUsers || 1}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    {activePlanKey === 'STARTER' ? 'Owner only' : 'Owner & staff members'}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-700">
                  <ShieldCheck className="w-6 h-6 text-[#EA580C]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Interval Selector */}
        <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
          <div>
            <h4 className="font-bold text-sm text-[#071F38]">Available Subscription Plans</h4>
            <p className="text-xs text-slate-500">Select a duration to see package totals and exact savings.</p>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-white border border-slate-200 shadow-2xs">
            {BILLING_INTERVALS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setInterval(item.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  interval === item.key
                    ? 'bg-[#071F38] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Available Upgrades Section */}
        {(() => {
          const TIER_RANKS: Record<PlanKey, number> = { FREE_KHATA: 0, STARTER: 1, GROWTH: 2, SCALE: 3 };
          const isTrialActive = isTrial && subscription?.status === 'TRIALING' && !subscription?.isExpired;
          // During evaluation trial, allow selecting any of the official commercial plans
          const currentRank = isTrialActive ? 0 : TIER_RANKS[activePlanKey] ?? 1;

          const upgradePlans = (['STARTER', 'GROWTH', 'SCALE'] as PlanKey[]).filter(
            (key) => TIER_RANKS[key] > currentRank
          );

          if (currentRank >= 3) {
            // Already on highest plan (Scale)
            return (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-orange-500/10 via-slate-900/5 to-orange-500/10 border-2 border-[#EA580C] rounded-2xl p-8 text-center space-y-3 shadow-2xs">
                  <div className="w-12 h-12 rounded-full bg-orange-100 text-[#EA580C] flex items-center justify-center mx-auto shadow-xs">
                    <Crown className="w-6 h-6" />
                  </div>
                  <h3 className="font-black text-base sm:text-lg text-[#071F38]">
                    You are on our highest plan: {OFFICIAL_PLANS.SCALE.name}
                  </h3>
                  <p className="text-xs text-slate-600 max-w-lg mx-auto">
                    You have unlocked all features: Unlimited Invoices, Multi-Branch godowns (up to 3 branches), 10 Staff seats, Advanced Stock Valuation, and Priority Support.
                  </p>
                  <span className="inline-block text-[11px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-3 py-1 rounded-full uppercase tracking-wider">
                    Full Platform Access Active
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div className="space-y-6">
              {/* Upgrade Plans Grid */}
              <div className={`grid grid-cols-1 ${upgradePlans.length === 1 ? 'max-w-md mx-auto' : upgradePlans.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'md:grid-cols-3'} gap-6`}>
                {upgradePlans.map((key) => {
                  const plan = OFFICIAL_PLANS[key];
                  const pricing = plan.pricing[interval];
                  const isGrowth = key === 'GROWTH';

                  return (
                    <div
                      key={key}
                      className={`rounded-2xl p-6 border flex flex-col justify-between transition-all relative ${
                        isGrowth
                          ? 'bg-white border-2 border-[#EA580C] shadow-lg'
                          : 'bg-white text-slate-800 border-slate-200/90 shadow-2xs hover:border-slate-300'
                      }`}
                    >
                      {isGrowth && (
                        <div className="absolute -top-3 right-5 bg-[#EA580C] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                          Recommended Upgrade
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-[#071F38]">
                            {plan.name}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {plan.limits.maxUsers === 1 ? '1 User' : `${plan.limits.maxUsers} Users`}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-1 my-3">
                          <span className="text-3xl font-black text-[#071F38]">
                            ₹{pricing.totalPrice.toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs text-slate-500 font-semibold">
                            / {pricing.durationMonths === 1 ? 'mo' : `${pricing.durationMonths} mo`}
                          </span>
                        </div>

                        {/* Savings Pill */}
                        <div className="text-xs text-slate-600 mb-3 flex items-center gap-1.5 flex-wrap">
                          <span>Equiv: <strong>₹{pricing.monthlyEquivalent}/mo</strong></span>
                          {pricing.savingsAmount > 0 && (
                            <span className="bg-orange-50 text-[#EA580C] text-[10px] font-bold px-1.5 py-0.2 rounded border border-orange-200">
                              Save ₹{pricing.savingsAmount}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 mb-4 min-h-[32px]">
                          {plan.tagline}
                        </p>

                        <div className="space-y-2 border-t pt-4 text-xs font-medium border-slate-100">
                          <div className="flex items-center gap-2 text-slate-700 font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                            <span>Unlimited Invoices</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-700">
                            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Max Users: {plan.limits.maxUsers}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-700">
                            <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Locations: {plan.limits.maxLocations}</span>
                          </div>
                          {plan.features.slice(0, 4).map((f, i) => (
                            <div key={i} className="flex items-center gap-2 text-slate-600">
                              <Check className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
                        <button
                          type="button"
                          onClick={() => handleUpgrade(key)}
                          disabled={subscribing}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isGrowth
                              ? 'bg-[#EA580C] hover:bg-[#D94E00] text-white shadow-2xs'
                              : 'bg-[#071F38] hover:bg-[#0D2C4D] text-white shadow-2xs'
                          }`}
                        >
                          Upgrade to {plan.name}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Feature Comparison Link */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#EA580C] hover:text-[#D94E00] transition-colors"
          >
            <span>Need a full side-by-side feature matrix comparison? View Pricing Page</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Customer Payment History & Receipts */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-sm text-[#071F38] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#EA580C]" />
                <span>Payment History & Tax Invoices</span>
              </h3>
              <p className="text-xs text-slate-500">
                Authoritative transaction receipts, verified Razorpay payment IDs, and downloadable receipts.
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-slate-500 self-start sm:self-auto bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
              {payments.length} {payments.length === 1 ? 'Transaction' : 'Transactions'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Transaction / Order ID</th>
                  <th className="py-3 px-4">Plan & Duration</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Receipt / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-xs text-slate-400">
                      <CreditCard className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                      <span>No payment transactions recorded yet. When you upgrade, your receipts will be saved here.</span>
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => {
                    const normPlan = normalizePlanKey(p.plan);
                    const planName = OFFICIAL_PLANS[normPlan]?.name || p.plan;
                    const isSuccess = p.status === 'SUCCESS';
                    const isPending = p.status === 'PENDING';
                    const isRefunded = p.status === 'REFUNDED';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-bold text-slate-800 text-[11px]">
                            {p.gatewayPaymentId || p.id}
                          </div>
                          {p.gatewayOrderId && (
                            <div className="text-[10px] text-slate-400">
                              Order: {p.gatewayOrderId}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">{planName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {p.billingPeriod || 'MONTHLY'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                          ₹{p.amount.toLocaleString('en-IN')}
                          {p.refundAmount && p.refundAmount > 0 ? (
                            <div className="text-[10px] font-semibold text-purple-700">
                              Refunded ₹{p.refundAmount}
                            </div>
                          ) : null}
                        </td>

                        <td className="py-3.5 px-4">
                          {isSuccess ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Paid & Active</span>
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Pending Verification</span>
                            </span>
                          ) : isRefunded ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                              <RotateCcw className="w-3 h-3 text-purple-600" />
                              <span>Refunded</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              <span>Failed Attempt</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {new Date(p.paidAt || p.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {isSuccess ? (
                            <button
                              type="button"
                              onClick={() => setSelectedReceipt(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#071F38] bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                              <FileText className="w-3 h-3 text-[#EA580C]" />
                              <span>View Receipt</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUpgrade(normPlan)}
                              disabled={subscribing}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-[#EA580C] hover:bg-[#D94E00] transition-colors"
                            >
                              <span>Retry Checkout</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Official Tax Invoice & Payment Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200 animate-in fade-in-50 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#071F38] text-white">
                  <Sparkles className="w-4 h-4 text-[#EA580C]" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#071F38]">Official Payment Receipt</h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Ref: {selectedReceipt.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/90 space-y-3 text-xs">
              <div className="flex justify-between items-start border-b border-slate-200 pb-2.5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Billed To Customer
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {customerIdentity?.businessName || activeBusiness?.name}
                  </span>
                  <p className="text-slate-500 text-[11px]">{customerIdentity?.email}</p>
                  {customerIdentity?.phone && (
                    <p className="text-slate-500 text-[11px]">{customerIdentity.phone}</p>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Payment Gateway
                  </span>
                  <span className="font-extrabold text-[#071F38]">
                    {selectedReceipt.gateway || 'RAZORPAY'}
                  </span>
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mt-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Verified</span>
                  </div>
                </div>
              </div>

              {/* Order and Payment Identifiers */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">Razorpay Payment ID:</span>
                  <span className="font-mono font-semibold text-slate-800 break-all">
                    {selectedReceipt.gatewayPaymentId || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Razorpay Order ID:</span>
                  <span className="font-mono font-semibold text-slate-800 break-all">
                    {selectedReceipt.gatewayOrderId || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Line Items */}
              <div className="border-t border-slate-200 pt-2.5 space-y-1.5">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>
                    Pakka Chittha {normalizePlanKey(selectedReceipt.plan)} Subscription
                  </span>
                  <span>₹{selectedReceipt.amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Billing Period Duration</span>
                  <span className="capitalize">{selectedReceipt.billingPeriod.toLowerCase().replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Payment Date</span>
                  <span>
                    {new Date(selectedReceipt.paidAt || selectedReceipt.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Total */}
              <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline font-black text-slate-900 text-sm">
                <span>Total Paid (INR):</span>
                <span className="text-base text-[#EA580C]">
                  ₹{selectedReceipt.amount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Note & Print Button */}
            <p className="text-[11px] text-slate-400 text-center">
              This is a computer-generated tax payment confirmation receipt issued by Pakka Chittha Cloud Platform.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#071F38] hover:bg-[#0D2C4D] shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </ModulePageShell>
  );
}
