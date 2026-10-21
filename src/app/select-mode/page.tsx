'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  ShoppingCart,
  CalendarCheck,
  Users,
  ShieldCheck,
  FileText,
  Package,
  BarChart3,
  Cloud,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function ModeSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const { user, activeBusiness, loading } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // If already authenticated, forward user to authorized workspace
  useEffect(() => {
    if (!loading) {
      if (user) {
        if (redirectParam && redirectParam.startsWith('/')) {
          router.replace(redirectParam);
          return;
        }
        if (user.platformRole === 'SUPER_ADMIN') {
          router.replace('/platform-admin');
          return;
        }
        if (activeBusiness?.subscription?.plan === 'FREE_KHATA') {
          router.replace('/free-khata');
          return;
        }
        if (!activeBusiness) {
          router.replace('/ghar-kharcha');
          return;
        }
        router.replace('/');
        return;
      }
      setCheckingAuth(false);
    }
  }, [user, activeBusiness, loading, redirectParam, router]);

  if (loading || (checkingAuth && user)) {
    return (
      <div className="min-h-screen min-h-[100dvh] w-full bg-[#FFF9F5] flex flex-col items-center justify-center text-slate-800 px-4">
        <div className="w-10 h-10 border-3 border-[#EA580C] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-600">PakkaChittha khol rahe hain...</p>
      </div>
    );
  }

  const householdLoginUrl = redirectParam
    ? `/login?mode=household&redirect=${encodeURIComponent(redirectParam)}`
    : '/login?mode=household&redirect=/ghar-kharcha';

  const businessLoginUrl = redirectParam
    ? `/login?mode=business&redirect=${encodeURIComponent(redirectParam)}`
    : '/login?mode=business&redirect=/';

  return (
    <div className="relative min-h-screen min-h-[100dvh] w-full overflow-x-hidden flex flex-col justify-between select-none bg-[#FCF8F5] font-sans">
      {/* =========================================================
          1. EXACT SCENIC BACKGROUND (PHOTO INTERIOR HOME & OFFICE)
          Fixed to viewport so it stays locked even when mobile scrolls
          ========================================================= */}
      <img
        src="/mode-selection-clean-bg.png"
        alt=""
        aria-hidden="true"
        className="fixed inset-0 w-full h-full object-cover object-center pointer-events-none z-0"
      />

      {/* Subtle radial ambient light overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40 mix-blend-soft-light"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.2) 60%, transparent 100%)',
        }}
      />

      {/* =========================================================
          2. TOP HEADER (BRAND LOGO & SIGN IN PILL)
          ========================================================= */}
      <header className="relative z-10 w-full px-4 sm:px-8 lg:px-14 pt-3.5 sm:pt-5 pb-2 flex items-center justify-between shrink-0">
        {/* Real Brand Logo */}
        <Link href="/" className="inline-flex items-center group transition-transform hover:scale-[1.02]">
          <img
            src="/pakka-chittha-logo.png"
            alt="PakkaChittha"
            className="h-8 sm:h-10 lg:h-11 w-auto max-w-[170px] sm:max-w-[210px] object-contain"
          />
        </Link>

        {/* Top-Right Sign In Button */}
        <Link
          href="/login"
          className="px-4 sm:px-6 py-1.5 sm:py-2 rounded-full border border-[#EA580C] bg-white/95 hover:bg-[#EA580C] text-[#071F38] hover:text-white font-bold text-xs sm:text-sm shadow-xs transition-all duration-200 shrink-0"
        >
          Sign In
        </Link>
      </header>

      {/* =========================================================
          3. MAIN CONTENT: HEADLINE & THE TWO EXACT CARDS
          ========================================================= */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 w-full max-w-[1400px] mx-auto min-h-0 py-3 sm:py-5">
        {/* Headline */}
        <div className="text-center mb-4 sm:mb-5 lg:mb-6 shrink-0 w-full px-2">
          <h1 className="text-2xl sm:text-3xl lg:text-[44px] font-black tracking-tight text-[#071F38] leading-tight">
            Pakka<span className="text-[#EA580C]">Chittha</span>
          </h1>
          <p className="mt-1 sm:mt-1.5 text-sm sm:text-base lg:text-lg font-black text-[#071F38] tracking-tight">
            Har hisaab, ab <span className="text-[#EA580C]">ek hi jagah.</span>
          </p>
          <span className="sr-only">
            PakkaChittha: Har hisaab, ab ek hi jagah. Aap kis tarah ka hisaab rakhna chahte hain?
          </span>
        </div>

        {/* The Two Prominent Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-7 w-full max-w-[780px] lg:max-w-[840px] items-stretch">
          {/* =========================================================
              CARD A: MERA GHAR (HOUSEHOLD EXPENSES & FAMILY BUDGET)
              ========================================================= */}
          <div
            aria-label="OPTION A: MERA GHAR"
            className="bg-white/95 rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-[0_12px_36px_rgba(234,88,12,0.08)] border border-slate-100 flex flex-col justify-between transition-all duration-200 hover:shadow-[0_16px_42px_rgba(234,88,12,0.14)] hover:-translate-y-0.5 w-full min-w-0"
          >
            <div>
              {/* Header: Icon + Title + Description */}
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-3.5">
                {/* House Icon in rounded square */}
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-[#FFEFE6] text-[#EA580C] flex items-center justify-center shrink-0 shadow-inner">
                  <svg className="w-5 h-5 sm:w-7 sm:h-7 fill-current" viewBox="0 0 24 24">
                    <path d="M12 3L2 11h3v10h6v-6h2v6h6V11h3L12 3z" />
                  </svg>
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl font-black text-[#071F38] tracking-tight">
                    Mera <span className="text-[#EA580C]">Ghar</span>
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-snug mt-0.5 max-w-full">
                    Ghar ka budget, roz ke kharche aur family ka hisaab.
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="w-full border-t border-slate-100 my-2.5 sm:my-3" />

              {/* 4 Feature Bullet Points */}
              <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-[13px] text-slate-700 font-medium">
                {/* Bullet 1: Shopping cart */}
                <li className="flex items-center gap-2.5 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-[#FFEFE6] text-[#EA580C] flex items-center justify-center shrink-0">
                    <ShoppingCart className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <span className="leading-tight">Rozana kharche ka record</span>
                </li>

                {/* Bullet 2: Calendar check */}
                <li className="flex items-center gap-2.5 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-[#FFEFE6] text-[#EA580C] flex items-center justify-center shrink-0">
                    <CalendarCheck className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <span className="leading-tight">Monthly budget planning</span>
                </li>

                {/* Bullet 3: Shared access */}
                <li className="flex items-center gap-2.5 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-[#FFEFE6] text-[#EA580C] flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <span className="leading-tight">Parivaar ke saath shared access</span>
                </li>

                {/* Bullet 4: Simple and easy */}
                <li className="flex items-center gap-2.5 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-[#FFEFE6] text-[#EA580C] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <span className="leading-tight">Simple aur easy to use</span>
                </li>
              </ul>
            </div>

            {/* CTA Button: Ghar ka Hisaab */}
            <Link
              href={householdLoginUrl}
              className="mt-4 sm:mt-5 w-full py-2.5 sm:py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF5500] to-[#EA580C] hover:from-[#E64A00] hover:to-[#D94E00] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-orange-500/25 transition-all duration-150 active:scale-[0.99] shrink-0"
            >
              <span>Ghar ka Hisaab</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>

          {/* =========================================================
              CARD B: MERA VYAPAAR (BUSINESS BILLING & ACCOUNTS)
              ========================================================= */}
          <div
            aria-label="OPTION B: MERA VYAPAAR"
            className="bg-white/95 rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-[0_12px_36px_rgba(0,102,255,0.08)] border border-slate-100 flex flex-col justify-between transition-all duration-200 hover:shadow-[0_16px_42px_rgba(0,102,255,0.14)] hover:-translate-y-0.5 w-full min-w-0"
          >
            <div>
              {/* Header: Icon + Title + Description */}
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-3.5">
                {/* Storefront Icon in rounded square */}
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-[#E8F3FF] text-[#0066FF] flex items-center justify-center shrink-0 shadow-inner">
                  <svg className="w-5 h-5 sm:w-7 sm:h-7 fill-current" viewBox="0 0 24 24">
                    <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z" />
                  </svg>
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl font-black text-[#071F38] tracking-tight">
                    Mera <span className="text-[#0066FF]">Vyapaar</span>
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-snug mt-0.5 max-w-full">
                    Business billing, udhaar, inventory aur accounts.
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="w-full border-t border-slate-100 my-2.5 sm:my-3" />

              {/* 4 Feature Bullet Points */}
              <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-[13px] text-slate-700 font-medium">
                {/* Bullet 1: Invoices */}
                <li className="flex items-center gap-2.5 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-[#E8F3FF] text-[#0066FF] flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <span className="leading-tight">Professional invoices (GST &amp; Non-GST)</span>
                </li>

                {/* Bullet 2: Customer Udhaar */}
                <li className="flex items-center gap-2.5 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-[#E8F3FF] text-[#0066FF] flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <span className="leading-tight">Customer udhaar khata</span>
                </li>

                {/* Bullet 3: Stock inventory */}
                <li className="flex items-center gap-2.5 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-[#E8F3FF] text-[#0066FF] flex items-center justify-center shrink-0">
                    <Package className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <span className="leading-tight">Stock inventory &amp; low-stock alerts</span>
                </li>

                {/* Bullet 4: Reports */}
                <li className="flex items-center gap-2.5 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-[#E8F3FF] text-[#0066FF] flex items-center justify-center shrink-0">
                    <BarChart3 className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <span className="leading-tight">Reports &amp; business insights</span>
                </li>
              </ul>
            </div>

            {/* CTA Button: Business Hisaab */}
            <Link
              href={businessLoginUrl}
              className="mt-4 sm:mt-5 w-full py-2.5 sm:py-3 px-4 rounded-xl bg-[#071F38] hover:bg-[#0A2A4C] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-slate-900/25 transition-all duration-150 active:scale-[0.99] shrink-0"
            >
              <span>Business Hisaab</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      </main>

      {/* =========================================================
          4. BOTTOM TRUST BAR (EXACT 4 SIGNALS WITH RESPONSIVE DIVIDERS)
          Normal document flow after cards, never covers buttons
          ========================================================= */}
      <footer className="relative z-10 w-full shrink-0 pt-4 pb-6 sm:pb-5 px-4 mt-auto">
        <div className="max-w-2xl mx-auto flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2 text-[11px] sm:text-xs text-slate-700 font-semibold">
          {/* Signal 1: Safe & Secure */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-4 h-4 rounded-full bg-[#FFEFE6] text-[#EA580C] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3 h-3 stroke-[2.4]" />
            </div>
            <span className="whitespace-nowrap">100% Safe &amp; Secure</span>
          </div>

          <span className="hidden sm:inline-block text-slate-300 font-light select-none">|</span>

          {/* Signal 2: Cloud Sync */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-4 h-4 rounded-full bg-[#E8F3FF] text-[#0066FF] flex items-center justify-center shrink-0">
              <Cloud className="w-3 h-3 stroke-[2.4]" />
            </div>
            <span className="whitespace-nowrap">Cloud Sync</span>
          </div>

          <span className="hidden sm:inline-block text-slate-300 font-light select-none">|</span>

          {/* Signal 3: Bank-grade Encryption */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-4 h-4 rounded-full bg-slate-100 text-[#071F38] flex items-center justify-center shrink-0">
              <Lock className="w-3 h-3 stroke-[2.4]" />
            </div>
            <span className="whitespace-nowrap">Bank-grade Encryption</span>
          </div>

          <span className="hidden sm:inline-block text-slate-300 font-light select-none">|</span>

          {/* Signal 4: Made for Bharat */}
          <div className="flex items-center gap-1.5 shrink-0">
            <svg className="w-3.5 h-3.5 text-[#0066FF] shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.5 2 6 5 6 8.5c0 3.2 2.2 5.5 3.5 7.5l2.5 6 2.5-6c1.3-2 3.5-4.3 3.5-7.5C18 5 15.5 2 12 2z" />
            </svg>
            <span className="whitespace-nowrap">Made for Bharat</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function ModeSelectionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen min-h-[100dvh] w-full bg-[#FFF9F5] flex items-center justify-center text-slate-800">
          <div className="w-8 h-8 border-2 border-[#EA580C] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ModeSelectionContent />
    </Suspense>
  );
}
