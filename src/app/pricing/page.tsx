'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Layers,
  HelpCircle,
  Building2,
  Users,
  Store,
  ChevronRight,
} from 'lucide-react';
import {
  OFFICIAL_PLANS,
  BILLING_INTERVALS,
  BillingInterval,
  PlanKey,
} from '@/lib/subscription/plans';

export default function PricingPage() {
  const router = useRouter();
  const [interval, setInterval] = useState<BillingInterval>('YEARLY');

  const featureMatrix = [
    {
      category: 'Invoicing & Billing',
      items: [
        { name: 'Monthly Invoice Limit', starter: 'Unlimited', growth: 'Unlimited', scale: 'Unlimited' },
        { name: 'GST & Non-GST Invoices', starter: true, growth: true, scale: true },
        { name: 'PDF Invoice & Print Generation', starter: true, growth: true, scale: true },
        { name: 'Payment Receipts & Recording', starter: true, growth: true, scale: true },
        { name: 'Manual WhatsApp Bill Sharing', starter: true, growth: true, scale: true },
        { name: 'Custom Business Logo & Header', starter: false, growth: true, scale: true },
      ],
    },
    {
      category: 'Customer & Udhaar Management',
      items: [
        { name: 'Customer Directory & Profiles', starter: true, growth: true, scale: true },
        { name: 'Customer Ledger & Udhaar Tracking', starter: 'Basic', growth: 'Advanced', scale: 'Advanced' },
        { name: 'Opening Balances & Payment Allocation', starter: false, growth: true, scale: true },
        { name: 'Customer Statements & Downloads', starter: false, growth: true, scale: true },
        { name: 'Bulk Follow-up Workflows', starter: false, growth: false, scale: true },
      ],
    },
    {
      category: 'Inventory & Purchases',
      items: [
        { name: 'Product Catalogue & Pricing', starter: true, growth: true, scale: true },
        { name: 'Basic Stock Tracking', starter: true, growth: true, scale: true },
        { name: 'Low-Stock Alerts & Thresholds', starter: false, growth: true, scale: true },
        { name: 'Supplier Management & Balances', starter: false, growth: true, scale: true },
        { name: 'Purchase Invoices & Bills', starter: false, growth: true, scale: true },
        { name: 'Stock Movement History & Valuation', starter: false, growth: false, scale: true },
      ],
    },
    {
      category: 'Team & Multi-Location',
      items: [
        { name: 'Included Users / Staff Seats', starter: '1 User (Owner)', growth: '3 Users', scale: '10 Users' },
        { name: 'Active Business Locations', starter: '1 Location', growth: '1 Location', scale: 'Up to 3 Locations' },
        { name: 'Staff Roles & Access Control', starter: false, growth: 'Standard (RBAC)', scale: 'Granular Custom' },
        { name: 'Consolidated Multi-Location Reports', starter: false, growth: false, scale: true },
        { name: 'Expanded Audit Trail', starter: false, growth: false, scale: true },
      ],
    },
    {
      category: 'Reports & Exports',
      items: [
        { name: 'Sales & Collection Summary', starter: 'Basic', growth: 'Advanced', scale: 'Consolidated' },
        { name: 'Expense Recording & Breakdown', starter: true, growth: true, scale: true },
        { name: 'Bulk Excel/CSV Data Export', starter: false, growth: true, scale: true },
        { name: 'Priority Support Policy', starter: 'Standard', growth: 'Standard', scale: 'Priority SLA' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F6F9FC] text-slate-800 selection:bg-[#EA580C]/20 selection:text-[#071F38]">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-auto flex items-center">
              <img src="/pakka-chittha-logo.png" alt="Pakka Chittha" className="h-9 w-auto object-contain" />
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-semibold text-[#071F38] hover:text-[#EA580C] px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#EA580C] hover:bg-[#D94E00] shadow-xs transition-all"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Page Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-xs font-bold text-[#EA580C] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#EA580C]" />
            <span>Honest & Transparent Subscription Plans</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#071F38] tracking-tight leading-tight">
            Plans Built for Every Stage of <span className="text-[#EA580C]">Your Business</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            All plans include unlimited invoices, GST compliance, secure cloud storage, and a 7-day full feature free trial.
          </p>

          {/* Billing Interval Selector */}
          <div className="pt-4 flex justify-center">
            <div className="inline-flex p-1.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
              {BILLING_INTERVALS.map((item) => {
                const isSelected = interval === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setInterval(item.key)}
                    className={`relative px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#071F38] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.key === 'YEARLY' && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-[#EA580C] text-white uppercase tracking-wider">
                        Best Value
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3 Pricing Cards */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          {(['STARTER', 'GROWTH', 'SCALE'] as PlanKey[]).map((key) => {
            const plan = OFFICIAL_PLANS[key];
            const pricing = plan.pricing[interval];
            const isGrowth = key === 'GROWTH';

            return (
              <div
                key={key}
                className={`rounded-3xl flex flex-col justify-between transition-all duration-200 relative ${
                  isGrowth
                    ? 'bg-white border-2 border-[#EA580C] shadow-xl shadow-orange-500/10 lg:-translate-y-2'
                    : 'bg-white border border-slate-200/90 shadow-md hover:border-slate-300'
                }`}
              >
                {/* Recommended Badge on Growth */}
                {isGrowth && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#EA580C] text-white px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>RECOMMENDED BY PAKKA CHITTHA</span>
                  </div>
                )}

                {/* Card Top */}
                <div className="p-6 sm:p-8">
                  {/* Plan Name & Tagline */}
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-[#071F38]">
                      {plan.name}
                    </h2>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        key === 'STARTER'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : key === 'GROWTH'
                          ? 'bg-orange-50 text-[#EA580C] border border-orange-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {plan.limits.maxUsers === 1 ? 'Solo Owner' : `${plan.limits.maxUsers} Users`}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1 min-h-[32px] leading-relaxed">
                    {plan.tagline}
                  </p>

                  {/* Pricing Display */}
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black text-[#071F38]">
                        ₹{pricing.totalPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">
                        / {pricing.durationMonths === 1 ? 'month' : `${pricing.durationMonths} months`}
                      </span>
                    </div>

                    {/* Effective Monthly Rate & Savings */}
                    <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                      <span className="text-slate-600 font-medium">
                        Effective:{' '}
                        <strong className="text-[#071F38] font-bold">
                          ₹{pricing.monthlyEquivalent.toLocaleString('en-IN')}/mo
                        </strong>
                      </span>

                      {pricing.savingsAmount > 0 && (
                        <span className="bg-orange-50 text-[#EA580C] border border-orange-200/80 px-2 py-0.5 rounded font-bold text-[11px]">
                          Save ₹{pricing.savingsAmount.toLocaleString('en-IN')} ({pricing.savingsPercent}%)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Limits Badge Grid */}
                  <div className="mt-5 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Maximum Users:</span>
                      </span>
                      <strong className="text-[#071F38] font-bold">
                        {plan.limits.maxUsers} {plan.limits.maxUsers === 1 ? '(Owner only)' : 'seats'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-slate-400" />
                        <span>Active Locations:</span>
                      </span>
                      <strong className="text-[#071F38] font-bold">
                        {plan.limits.maxLocations} {plan.limits.maxLocations === 1 ? 'location' : 'branches'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#EA580C]" />
                        <span>Monthly Invoices:</span>
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-orange-100 text-[#EA580C] font-black text-[10px] uppercase">
                        UNLIMITED
                      </span>
                    </div>
                  </div>

                  {/* Included Features List */}
                  <div className="mt-6 space-y-2.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {key === 'STARTER'
                        ? 'STARTER FEATURES'
                        : key === 'GROWTH'
                        ? 'EVERYTHING IN STARTER, PLUS:'
                        : 'EVERYTHING IN GROWTH, PLUS:'}
                    </p>

                    <ul className="space-y-2 text-xs text-slate-600">
                      {plan.features.slice(0, 7).map((feat, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" />
                          <span className="leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Bottom: Action Buttons */}
                <div className="p-6 sm:p-8 pt-0 space-y-2.5">
                  <Link
                    href={`/register?plan=${key}`}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all text-center ${
                      isGrowth
                        ? 'bg-[#EA580C] hover:bg-[#D94E00] text-white shadow-md shadow-orange-500/20'
                        : 'bg-[#071F38] hover:bg-[#0D2C4D] text-white shadow-xs'
                    }`}
                  >
                    <span>Start 7-Day Free Trial</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href={`/login?redirect=${encodeURIComponent('/subscription')}`}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-[#071F38] text-xs font-bold transition-all text-center block"
                  >
                    <span>Existing user? Upgrade</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Feature Matrix */}
        <section className="mt-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-[#071F38]">
              Comprehensive Feature Comparison
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Compare exact features, entitlements, and limits across all three official plans.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[#071F38]">
                    <th className="py-4 px-6 font-bold text-slate-500 text-xs uppercase tracking-wider w-2/5">
                      Feature / Capability
                    </th>
                    <th className="py-4 px-4 font-black text-center w-1/5">
                      <div>Pakka Chittha Starter</div>
                      <div className="text-[11px] font-normal text-slate-500">₹199 / mo</div>
                    </th>
                    <th className="py-4 px-4 font-black text-center w-1/5 bg-orange-50/50 text-[#EA580C]">
                      <div>Pakka Chittha Growth</div>
                      <div className="text-[11px] font-normal text-slate-500">₹499 / mo</div>
                    </th>
                    <th className="py-4 px-4 font-black text-center w-1/5">
                      <div>Pakka Chittha Scale</div>
                      <div className="text-[11px] font-normal text-slate-500">₹999 / mo</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {featureMatrix.map((section, sIdx) => (
                    <React.Fragment key={sIdx}>
                      <tr className="bg-slate-50/60">
                        <td
                          colSpan={4}
                          className="py-2.5 px-6 font-black text-xs text-[#071F38] uppercase tracking-wider"
                        >
                          {section.category}
                        </td>
                      </tr>
                      {section.items.map((item, iIdx) => (
                        <tr key={iIdx} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-3 px-6 text-slate-700 font-medium">{item.name}</td>

                          {/* Starter Value */}
                          <td className="py-3 px-4 text-center">
                            {typeof item.starter === 'boolean' ? (
                              item.starter ? (
                                <Check className="w-4 h-4 text-[#EA580C] mx-auto" />
                              ) : (
                                <X className="w-4 h-4 text-slate-300 mx-auto" />
                              )
                            ) : (
                              <span className="font-semibold text-slate-700">{item.starter}</span>
                            )}
                          </td>

                          {/* Growth Value */}
                          <td className="py-3 px-4 text-center bg-orange-50/20">
                            {typeof item.growth === 'boolean' ? (
                              item.growth ? (
                                <Check className="w-4 h-4 text-[#EA580C] mx-auto" />
                              ) : (
                                <X className="w-4 h-4 text-slate-300 mx-auto" />
                              )
                            ) : (
                              <span className="font-semibold text-slate-800">{item.growth}</span>
                            )}
                          </td>

                          {/* Scale Value */}
                          <td className="py-3 px-4 text-center">
                            {typeof item.scale === 'boolean' ? (
                              item.scale ? (
                                <Check className="w-4 h-4 text-[#EA580C] mx-auto" />
                              ) : (
                                <X className="w-4 h-4 text-slate-300 mx-auto" />
                              )
                            ) : (
                              <span className="font-semibold text-slate-800">{item.scale}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 7-Day Free Trial Callout Banner */}
        <section className="mt-16 bg-gradient-to-r from-[#071F38] via-[#0D2C4D] to-[#071F38] rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden shadow-xl">
          <div className="max-w-2xl relative z-10 space-y-3">
            <span className="px-3 py-1 rounded-full bg-[#EA580C] text-white font-extrabold text-[11px] uppercase tracking-wider">
              100% Risk-Free 7-Day Free Trial
            </span>
            <h3 className="text-2xl sm:text-3xl font-black">
              Start Your 7-Day Full Feature Free Trial Today
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              No credit card required upfront. Get full access to GST invoicing, inventory tracking,
              and customer ledgers for your business.
            </p>

            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <Link
                href="/register?plan=STARTER"
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all"
              >
                Start Starter (₹199/mo)
              </Link>
              <Link
                href="/register?plan=GROWTH"
                className="px-4 py-2 rounded-xl bg-[#EA580C] hover:bg-[#D94E00] text-white text-xs font-bold shadow-md transition-all"
              >
                Start Growth (₹499/mo)
              </Link>
              <Link
                href="/register?plan=SCALE"
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all"
              >
                Start Scale (₹999/mo)
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 mt-16 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Pakka Chittha. Built for Indian Businesses. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-slate-800">
              Sign In
            </Link>
            <Link href="/pricing" className="hover:text-slate-800 font-semibold text-[#EA580C]">
              Pricing & Plans
            </Link>
            <Link href="/register" className="hover:text-slate-800">
              Free Trial
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
