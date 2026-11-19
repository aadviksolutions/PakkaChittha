'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Crown, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface FeatureNotAvailableProps {
  featureName: string;
  requiredPlanName?: string;
  description?: string;
}

export function FeatureNotAvailable({
  featureName,
  requiredPlanName = 'Growth or Scale',
  description,
}: FeatureNotAvailableProps) {
  const { activeBusiness } = useAuth();
  const plan = activeBusiness?.subscription?.plan;
  const isFreeKhata = plan === 'FREE_KHATA';

  const dashboardHref = isFreeKhata ? '/free-khata' : '/';

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl text-center animate-in fade-in zoom-in-95">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
          Access Restricted
        </span>

        <h2 className="text-xl font-black text-[#071F38] tracking-tight mt-3">
          Feature Not Included
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
          {description || (
            <>
              <strong>{featureName}</strong> is not included in your current{' '}
              <strong className="text-[#071F38]">
                {isFreeKhata ? 'Free Khata' : plan?.replace('_', ' ') || 'Starter'}
              </strong>{' '}
              package. It requires a{' '}
              <strong className="text-emerald-700">{requiredPlanName}</strong> subscription.
            </>
          )}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Link
            href={dashboardHref}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#071F38] hover:bg-[#0D2C4D] text-white text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          {isFreeKhata ? (
            <Link
              href="/free-khata"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#008F91] border border-emerald-200 text-xs font-bold transition-all cursor-pointer min-h-[44px]"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#008A36]" />
              <span>Open Free Khata</span>
            </Link>
          ) : (
            <Link
              href="/subscription"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00B887] hover:bg-[#009E74] text-white text-xs font-bold transition-all shadow-xs shadow-emerald-500/20 cursor-pointer min-h-[44px]"
            >
              <Crown className="w-3.5 h-3.5 text-white" />
              <span>Upgrade Plan</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
