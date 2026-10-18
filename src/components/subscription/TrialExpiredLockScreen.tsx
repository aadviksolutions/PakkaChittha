'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';

interface TrialExpiredLockScreenProps {
  businessName?: string;
}

export function TrialExpiredLockScreen({ businessName }: TrialExpiredLockScreenProps) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-10 shadow-2xl border border-slate-200 text-slate-800 text-center space-y-6 relative overflow-hidden">
        {/* Subtle orange accent bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-[#EA580C] to-amber-600" />

        {/* Lock Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-orange-50 border border-orange-200 text-[#EA580C] flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-[#EA580C]" />
        </div>

        {/* Headings */}
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-orange-100 text-[#EA580C] text-[11px] font-black uppercase tracking-wider">
            7-Day Evaluation Concluded
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#071F38] tracking-tight">
            Your Free Trial Has Ended
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Your 7-day trial is complete. Choose a subscription plan to unlock your{' '}
            <strong className="text-[#071F38]">{businessName || 'Lenden'}</strong> workspace and
            continue enjoying seamless business management services.
          </p>
        </div>

        {/* Guarantee Pill */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2 text-xs text-slate-700">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Your existing business data is safe. Subscribe to restore access.</span>
          </div>
          <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">
            All your invoices, customer ledgers, inventory records, and settings remain securely
            preserved in your private database.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3 pt-2">
          <Link
            href="/subscription"
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#EA580C] hover:bg-[#D94E00] text-white text-sm font-bold shadow-lg shadow-orange-500/25 transition-all cursor-pointer active:scale-[0.99]"
          >
            <span>Get Full Subscription</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/pricing"
            className="inline-block text-xs font-semibold text-slate-500 hover:text-[#EA580C] transition-colors"
          >
            Compare Starter, Growth &amp; Scale Plans
          </Link>
        </div>
      </div>
    </div>
  );
}
