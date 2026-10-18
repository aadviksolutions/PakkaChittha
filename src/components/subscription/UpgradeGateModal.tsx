'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Sparkles, ArrowRight, X, ShieldAlert, Check } from 'lucide-react';
import { OFFICIAL_PLANS, PlanKey } from '@/lib/subscription/plans';

interface UpgradeGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  requiredPlan: 'GROWTH' | 'SCALE';
  description?: string;
}

export function UpgradeGateModal({
  isOpen,
  onClose,
  featureName,
  requiredPlan,
  description,
}: UpgradeGateModalProps) {
  const router = useRouter();
  const toast = useToast();
  const { activeBusiness } = useAuth();
  const [switching, setSwitching] = useState(false);

  if (!isOpen) return null;

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
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to switch demo tier');
      }
      toast.success(`Switched demo workspace to ${planConfig.name}!`);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Error switching demo plan');
      setSwitching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-slate-800 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Badge & Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-[#00B887] border border-emerald-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>FEATURE UPGRADE PREVIEW</span>
          </span>
        </div>

        <h3 className="text-lg sm:text-xl font-black text-[#071F38] tracking-tight">
          Unlock {featureName}
        </h3>

        <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
          {description ||
            `This capability is available exclusively on ${planConfig.name} and above. Upgrade your workspace to enable this module.`}
        </p>

        {/* Plan Preview Card */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-[#071F38] block">{planConfig.name}</span>
              <span className="text-[11px] text-slate-500">{planConfig.tagline}</span>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-[#071F38]">
                ₹{planConfig.pricing.MONTHLY.totalPrice}
              </span>
              <span className="text-[10px] text-slate-500 block">/ month</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 space-y-1.5 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-[#00B887] shrink-0" />
              <span>Unlimited Invoices</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-[#00B887] shrink-0" />
              <span>Up to {planConfig.limits.maxUsers} Users & {planConfig.limits.maxLocations} Location(s)</span>
            </div>
            {planConfig.features.slice(0, 3).map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#00B887] shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 pt-2 space-y-2.5">
          <Link
            href="/subscription"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-[#EA580C] hover:bg-[#D94E00] text-white text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 transition-all text-center flex items-center justify-center gap-2"
          >
            <span>Upgrade to {planConfig.name}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/pricing"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-[#071F38] text-xs font-bold transition-all text-center block"
          >
            Compare All Plans
          </Link>
        </div>
      </div>
    </div>
  );
}
