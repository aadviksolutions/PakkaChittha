'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { OFFICIAL_PLANS, PlanKey } from '@/lib/subscription/plans';

interface UpgradeGateBannerProps {
  featureName: string;
  requiredPlan: 'GROWTH' | 'SCALE';
  description?: string;
}

export function UpgradeGateBanner({
  featureName,
  requiredPlan,
  description,
}: UpgradeGateBannerProps) {
  const toast = useToast();
  const { activeBusiness } = useAuth();
  const [switching, setSwitching] = useState(false);

  const isDemo = Boolean(
    activeBusiness?.id?.startsWith('demo_') || (activeBusiness as any)?.isDemo
  );
  const planConfig = OFFICIAL_PLANS[requiredPlan];

  const handleSwitchDemoTier = async () => {
    try {
      setSwitching(true);
      const res = await fetch('/api/demo/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: requiredPlan }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to switch');
      toast.success(`Switched demo workspace to ${planConfig.name}!`);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Error switching demo plan');
      setSwitching(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-orange-500/30 shadow-lg text-slate-800 space-y-4 my-4">
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 rounded-full bg-orange-50 text-[#EA580C] border border-orange-200 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{planConfig.name} Feature</span>
        </span>
      </div>

      <h3 className="text-xl sm:text-2xl font-black text-[#071F38]">
        {featureName} is Available on {planConfig.name}
      </h3>

      <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
        {description ||
          `Your current workspace plan does not include ${featureName}. Upgrade to ${planConfig.name} (starting from ₹${planConfig.pricing.MONTHLY.totalPrice}/mo) to access purchases, supplier ledgers, and inventory alerts.`}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
          <Check className="w-4 h-4 text-[#EA580C] shrink-0" />
          <span>Unlimited Invoices</span>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
          <Check className="w-4 h-4 text-[#EA580C] shrink-0" />
          <span>Up to {planConfig.limits.maxUsers} Users</span>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
          <Check className="w-4 h-4 text-[#EA580C] shrink-0" />
          <span>{planConfig.limits.maxLocations} Active Location(s)</span>
        </div>
      </div>

      <div className="pt-2 flex items-center gap-3 flex-wrap">
        <Link
          href="/subscription"
          className="px-5 py-2.5 rounded-xl bg-[#071F38] hover:bg-[#0D2C4D] text-white text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-2"
        >
          <span>Upgrade to {planConfig.name}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>

        <Link
          href="/pricing"
          className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-[#071F38] text-xs font-bold transition-all"
        >
          Compare All Plans
        </Link>
      </div>
    </div>
  );
}
