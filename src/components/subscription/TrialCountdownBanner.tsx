'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { normalizePlanKey, OFFICIAL_PLANS } from '@/lib/subscription/plans';

export function TrialCountdownBanner() {
  const { activeBusiness } = useAuth();
  const [timeLeft, setTimeLeft] = useState<{
    totalMs: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isLast72h: boolean;
    isExpired: boolean;
  } | null>(null);

  const sub = activeBusiness?.subscription;
  const rawPlan = sub?.plan;
  const planKey = normalizePlanKey(rawPlan);
  const isFreeKhata = planKey === 'FREE_KHATA';
  const isTrial = Boolean(sub?.isTrial || sub?.status === 'TRIALING' || rawPlan === 'FREE_TRIAL');
  const planConfig = OFFICIAL_PLANS[planKey];

  useEffect(() => {
    if (!sub || isFreeKhata || !isTrial || sub.status === 'ACTIVE') {
      return;
    }

    const calculateTime = () => {
      if (!sub.endDate) return;
      const expiry = new Date(sub.endDate).getTime();
      const now = Date.now();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft({
          totalMs: 0,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isLast72h: true,
          isExpired: true,
        });
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const isLast72h = diff <= 72 * 3600 * 1000;

      setTimeLeft({
        totalMs: diff,
        days,
        hours,
        minutes,
        seconds,
        isLast72h,
        isExpired: false,
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [sub, isFreeKhata, isTrial]);

  if (!sub || !isTrial || isFreeKhata || sub.status === 'ACTIVE' || !timeLeft) {
    return null;
  }

  // Format string
  let countdownText = '';
  if (timeLeft.days >= 1) {
    countdownText = `${timeLeft.days} day${timeLeft.days > 1 ? 's' : ''}, ${timeLeft.hours} hr${timeLeft.hours > 1 ? 's' : ''}`;
  } else if (timeLeft.hours >= 1) {
    countdownText = `${timeLeft.hours} hr${timeLeft.hours > 1 ? 's' : ''}, ${timeLeft.minutes} min${timeLeft.minutes > 1 ? 's' : ''}`;
  } else {
    const pad = (n: number) => String(n).padStart(2, '0');
    countdownText = `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;
  }

  // If in the final 72 hours, show prominent alert countdown banner
  if (timeLeft.isLast72h && !timeLeft.isExpired) {
    return (
      <aside
        aria-label="Free Trial Expiry Countdown"
        className="w-full bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-3.5 sm:px-6 py-2.5 shadow-md border-b border-orange-400/40 relative z-40 animate-in fade-in"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 text-xs">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 text-white animate-spin-slow" />
            </div>
            <div>
              <span className="font-extrabold uppercase tracking-wider text-amber-100 mr-2 text-[11px]">
                {planConfig.name} Free Trial
              </span>
              <span className="font-semibold text-white">
                Your free trial ends in{' '}
                <strong className="underline decoration-white/60 font-black text-amber-100">
                  {countdownText}
                </strong>
                .
              </span>
            </div>
          </div>

          <Link
            href="/subscription"
            className="shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-[#C2410C] font-black text-xs shadow-md transition-all active:scale-[0.98]"
          >
            <span>Choose Subscription</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>
    );
  }

  // Before final 72h: show calm, non-intrusive trial info bar
  return (
    <aside
      aria-label="Free Trial Active Notice"
      className="w-full bg-[#071F38] text-white px-3.5 sm:px-6 py-2 border-b border-slate-700/60 relative z-30"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-slate-300">
            <strong className="text-white font-bold">{planConfig.name}</strong> 7-Day Free Trial Active
            {sub.endDate && (
              <span className="text-slate-400 hidden sm:inline">
                {' '}• Valid until{' '}
                {new Date(sub.endDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            )}
          </span>
        </div>

        <Link
          href="/subscription"
          className="text-[#FA8223] hover:text-white font-bold text-xs flex items-center gap-1 transition-colors"
        >
          <span>Upgrade Early</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </aside>
  );
}
