'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  FileText,
  BookOpen,
  Package,
  MessageSquare,
  Home,
  Users,
  Cloud,
  CheckCircle2,
  ShieldCheck,
  Globe,
  ShoppingCart,
  Printer,
  QrCode,
  Share2,
  Check,
  Receipt,
  TrendingUp,
  AlertTriangle,
  Star,
  Quote,
  Zap,
} from 'lucide-react';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { FaqAccordion } from './FaqAccordion';
import { JsonLdScript } from './JsonLdScript';
import {
  HOMEPAGE_FAQS,
  buildFaqJsonLd,
  buildSoftwareApplicationJsonLd,
} from '@/lib/seo/constants';

export function PublicHomePage() {
  const softwareJsonLd = buildSoftwareApplicationJsonLd();
  const faqJsonLd = buildFaqJsonLd(HOMEPAGE_FAQS);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FB] text-slate-800 selection:bg-[#173653]/15 selection:text-[#071D35]">
      <JsonLdScript data={softwareJsonLd} />
      <JsonLdScript data={faqJsonLd} />

      <PublicNavbar />

      <main className="flex-1">
        {/* =========================================================
            1. HERO SECTION: Benefit-First H1 + Real Thermal POS UI
        ========================================================= */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#F4F7FB] via-white to-[#F4F7FB] pt-8 pb-14 sm:pt-14 sm:pb-20 border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              
              {/* Left Copy & Actions */}
              <div className="lg:col-span-7 space-y-5 sm:space-y-6">
                
                {/* Punchy Credibility Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#173653]/10 border border-[#173653]/20 text-xs font-semibold text-[#173653]">
                  <Zap className="w-3.5 h-3.5 text-[#2878CE]" />
                  <span>10-Second Thermal GST Billing • Made for Indian Dukaans</span>
                </div>

                {/* Benefit-First Headline */}
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#071D35] tracking-tight leading-[1.12]">
                    Fast GST Billing, Stock &amp; Udhaar Khata for Your Dukaan
                  </h1>
                  {/* Authentic Elevated Hindi Tagline */}
                  <p className="text-base sm:text-xl font-bold text-[#008A36] tracking-normal">
                    "हर पैसे का हिसाब, बिल्कुल आसान।"
                  </p>
                </div>

                {/* Clear Subheadline introducing Shop benefits + Free Ghar Kharcha bonus */}
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl font-normal">
                  Generate professional GST invoices on 2-inch &amp; 3-inch thermal printers in 10 seconds, track live inventory, recover customer udhaar faster with automated WhatsApp reminders — plus get a{' '}
                  <strong className="text-[#008A36] font-semibold">100% Free Lifetime Ghar Kharcha</strong> family ledger bonus.
                </p>

                {/* Primary CTA + Secondary Login */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#173653] hover:bg-[#071D35] text-white text-sm sm:text-base font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    <span>Start 7-Day Free Trial</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm sm:text-base font-medium border border-slate-200 transition-colors cursor-pointer"
                  >
                    <span>Login to Workspace</span>
                  </Link>
                </div>

                {/* Trust Micro-Badges */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs font-medium text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#008A36]" />
                    No credit card required
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#008A36]" />
                    2" &amp; 3" Thermal + A4 ready
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#008A36]" />
                    Hindi &amp; English friendly
                  </span>
                </div>
              </div>

              {/* Right: Real Product UI Screenshot / Interactive Thermal POS Preview */}
              <div className="lg:col-span-5 relative">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                  
                  {/* Browser/POS Window Header */}
                  <div className="bg-[#071D35] px-4 py-3 flex items-center justify-between text-white border-b border-[#102A43]">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      </div>
                      <span className="text-xs font-semibold text-slate-200 ml-2 truncate">
                        Pakka Chittha POS • Mera Vyapaar
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold bg-emerald-600 text-white px-2 py-0.5 rounded">
                      LIVE COUNTER
                    </span>
                  </div>

                  {/* Simulated Shop Header */}
                  <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#173653] uppercase">
                        Shree Ganesh Kirana &amp; General Store
                      </p>
                      <p className="text-[10px] font-mono text-slate-500">
                        GSTIN: 23AAAAA0000A1Z5 • Indore, MP
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                        Bill #INV-1082
                      </span>
                    </div>
                  </div>

                  {/* Simulated Line Items Table */}
                  <div className="p-4 space-y-3">
                    <div className="space-y-1.5 text-xs">
                      {/* Item 1 */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <div>
                          <p className="font-semibold text-slate-900">Aashirvaad Chakki Atta 10kg</p>
                          <p className="text-[10px] text-slate-500">2 bags × ₹440 • GST 5%</p>
                        </div>
                        <span className="font-bold text-slate-900 tabular-nums">₹880.00</span>
                      </div>

                      {/* Item 2 */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <div>
                          <p className="font-semibold text-slate-900">Fortune Sunflower Oil 1L</p>
                          <p className="text-[10px] text-slate-500">3 pkts × ₹155 • GST 5%</p>
                        </div>
                        <span className="font-bold text-slate-900 tabular-nums">₹465.00</span>
                      </div>

                      {/* Item 3 */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <div>
                          <p className="font-semibold text-slate-900">Tata Salt Evaporated 1kg</p>
                          <p className="text-[10px] text-slate-500">5 pkts × ₹28 • GST 0%</p>
                        </div>
                        <span className="font-bold text-slate-900 tabular-nums">₹140.00</span>
                      </div>
                    </div>

                    {/* Tax & Total Calculation */}
                    <div className="pt-2 border-t border-slate-200/80 space-y-1 text-xs">
                      <div className="flex justify-between text-slate-500 text-[11px]">
                        <span>Subtotal (3 items)</span>
                        <span className="font-mono">₹1,485.00</span>
                      </div>
                      <div className="flex justify-between text-slate-500 text-[11px]">
                        <span>CGST (2.5%) + SGST (2.5%)</span>
                        <span className="font-mono">₹67.25</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-900 text-sm pt-1 border-t border-dashed border-slate-200">
                        <span>Grand Total</span>
                        <span className="text-[#008A36] text-base tabular-nums">₹1,552.00</span>
                      </div>
                    </div>

                    {/* Split Payment / Udhaar Strip */}
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="font-medium text-slate-700">₹1,000 Paid (UPI)</span>
                      </div>
                      <div className="font-bold text-rose-700">
                        ₹552 Udhaar Due (Ramesh Ji)
                      </div>
                    </div>

                    {/* 1-Click Action Buttons in POS */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#173653] text-white text-xs font-semibold">
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print 2" Receipt</span>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#008A36] text-white text-xs font-semibold">
                        <Share2 className="w-3.5 h-3.5" />
                        <span>WhatsApp Bill</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Real-Time Receipt Floating Badge */}
                <div className="absolute -bottom-4 -left-4 sm:-bottom-5 sm:-left-5 bg-white rounded-xl p-3 border border-slate-200 shadow-lg hidden sm:flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Thermal Receipt Ready</p>
                    <p className="text-[10px] text-slate-500 font-mono">Prints via Bluetooth &amp; USB</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* =========================================================
            2. DIFFERENTIATE: Mera Vyapaar (Priority) vs Mera Ghar
        ========================================================= */}
        <section className="py-12 sm:py-16 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-semibold text-[#173653] bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                Two Purpose-Built Modes in One Ecosystem
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#071D35] tracking-tight">
                Designed for Your Shop, Perfected for Your Home
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Keep your commercial tax billing separated from personal family expenses.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* PRIMARY PRIORITY CARD: Mera Vyapaar (Commercial Suite) */}
              <div className="lg:col-span-7 bg-[#F4F7FB] border-2 border-[#173653] rounded-2xl p-6 sm:p-7 shadow-sm flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-[#173653] text-white flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-emerald-300" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-[#071D35]">
                          Mera Vyapaar (मेरा व्यापार)
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Commercial GST Billing, Stock &amp; Udhaar ERP
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-[#173653] text-white px-2.5 py-1 rounded-md">
                      PRIMARY BUSINESS SUITE
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    Complete commercial operations for Indian retailers, wholesalers, and traders. Automatic GST tax slabs (0%, 5%, 12%, 18%, 28%), thermal Bluetooth receipt printing, customer khata with WhatsApp reminders, barcode billing, and purchase entry.
                  </p>

                  {/* Mini UI Snippet: Sample GST Invoice Line Item */}
                  <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-100">
                      <span className="font-semibold text-slate-700">Sample GST Invoice Item Preview:</span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                        CGST + SGST Calculated
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-slate-900">Kohinoor Basmati Rice (10kg)</p>
                        <p className="text-[10.5px] text-slate-500 font-mono">HSN: 1006 • Qty: 2 @ ₹1,100 • GST: 5%</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 tabular-nums">₹2,310.00</span>
                        <p className="text-[10px] text-emerald-600 font-medium">Tax: ₹110.00</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Customer: Ramesh Bhai (Indore)</span>
                      <span className="text-rose-600 font-semibold">Udhaar Due: ₹810</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-200/80">
                  <span className="text-xs font-semibold text-slate-600">
                    Includes 7-Day Full Access Free Trial
                  </span>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#173653] hover:bg-[#071D35] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span>Start Business Free Trial</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* SECONDARY COMPANION CARD: Mera Ghar (100% Free Lifetime) */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#008A36] flex items-center justify-center">
                        <Home className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                          Mera Ghar (मेरा घर)
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Ghar Kharcha &amp; Family Ledger
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md">
                      100% FREE FOREVER
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    Track daily groceries, milk, school fees, and domestic bills completely free. Set a monthly household budget, invite family members, and split shared costs easily.
                  </p>

                  {/* Mini UI Snippet: Monthly Grocery Budget Bar */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">Monthly Home Budget</span>
                      <span className="font-bold text-slate-900 tabular-nums">₹25,000 / mo</span>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-[#008A36] h-full rounded-full" style={{ width: '56%' }} />
                      </div>
                      <div className="flex items-center justify-between text-[10.5px] mt-1.5 text-slate-500">
                        <span className="font-medium text-[#008A36]">₹14,200 Spent (56%)</span>
                        <span className="font-semibold text-slate-700">₹10,800 Left</span>
                      </div>
                    </div>

                    {/* Category Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">
                        Ration: ₹8,400
                      </span>
                      <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">
                        Milk &amp; Veg: ₹3,200
                      </span>
                      <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">
                        Bills: ₹2,600
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100">
                  <span className="text-xs font-semibold text-emerald-700">
                    Forever Free • No Hidden Fees
                  </span>
                  <Link
                    href="/register?plan=ghar_kharcha"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-[#008A36] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span>Use Ghar Kharcha Free</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* =========================================================
            3. HOW IT WORKS: 3-Step Visual Flow Strip
        ========================================================= */}
        <section className="py-12 sm:py-16 bg-[#F4F7FB] border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-semibold text-[#173653] uppercase tracking-wider">
                Simple 3-Step Workflow
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#071D35] tracking-tight">
                From Item Entry to Payment in Under 15 Seconds
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                No complicated accounting setup. Start billing right from your mobile or laptop.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Step 1 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg bg-[#173653] text-white flex items-center justify-center font-bold text-xs">
                    01
                  </span>
                  <span className="text-[11px] font-semibold text-[#2878CE] bg-blue-50 px-2 py-0.5 rounded">
                    FAST ENTRY
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Add Items or Scan Barcode
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Type item names or scan barcodes. Prices, units, and GST tax slabs populate automatically.
                  </p>
                </div>
                {/* Visual snippet */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 font-mono text-[11px] text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>&gt; Tata Tea Gold 500g</span>
                    <span className="text-emerald-700 font-bold">₹310</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Barcode: 8901030382910 [Matched]</div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg bg-[#173653] text-white flex items-center justify-center font-bold text-xs">
                    02
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    INSTANT PRINT
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Print 2" or 3" Thermal Bill
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    One tap prints to your thermal POS receipt printer or generates an A4 PDF bill with your shop logo.
                  </p>
                </div>
                {/* Visual snippet */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 font-mono text-[11px] text-slate-600 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-[#173653]" />
                    <span>Bluetooth Printer</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded">
                    PRINTED ✓
                  </span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg bg-[#173653] text-white flex items-center justify-center font-bold text-xs">
                    03
                  </span>
                  <span className="text-[11px] font-semibold text-[#008A36] bg-emerald-50 px-2 py-0.5 rounded">
                    AUTO RECOVERY
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Send WhatsApp Reminder
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    If customer takes udhaar, tap once to send a polite WhatsApp reminder with your UPI payment link.
                  </p>
                </div>
                {/* Visual snippet */}
                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-[11px] text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="truncate">"Namaste Ramesh ji, ₹552..."</span>
                  </div>
                  <span className="text-[10px] text-emerald-800 font-bold shrink-0">SENT 11:20 AM</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* =========================================================
            4. VARY THE LAYOUT: Top 3 Core Features in Alternating Rows
        ========================================================= */}
        <section className="py-14 sm:py-20 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <span className="text-xs font-semibold text-[#173653] uppercase tracking-wider">
                Engineered for High-Volume Counters
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-[#071D35] tracking-tight">
                Everything You Need to Run a Fast &amp; Profitable Dukaan
              </h2>
            </div>

            {/* Feature Row 1: Fast GST Billing & Thermal Print (Text Left, Mockup Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <span className="text-xs font-bold text-[#173653] uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded">
                  01. GST BILLING &amp; POS
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-[#071D35] leading-tight">
                  10-Second Thermal GST Billing with Automatic Tax Slabs
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-normal">
                  Never keep customers waiting in line. Search products instantly by keyboard, pick rates from catalog, or scan barcodes. Pakka Chittha automatically splits CGST, SGST, and IGST according to your state rules, and prints crisp 2-inch or 3-inch thermal receipts.
                </p>
                <ul className="space-y-2 text-xs sm:text-sm font-medium text-slate-700">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#008A36] shrink-0" />
                    <span>Supports all ESC/POS Bluetooth and USB thermal receipt printers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#008A36] shrink-0" />
                    <span>Auto-generates UPI Dynamic QR code right on the thermal slip</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#008A36] shrink-0" />
                    <span>Full GST compliance with HSN code auto-fetch</span>
                  </li>
                </ul>
                <div className="pt-2">
                  <Link
                    href="/gst-billing-software"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#173653] hover:text-[#071D35]"
                  >
                    <span>Explore GST Billing Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-6 bg-[#F4F7FB] p-5 sm:p-6 rounded-2xl border border-slate-200">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3 font-mono text-xs">
                  <div className="text-center pb-2 border-b border-dashed border-slate-300">
                    <p className="font-bold text-slate-900 text-sm">GUPTA PROVISION STORE</p>
                    <p className="text-[10px] text-slate-500">M.G. Road, Jaipur • Ph: 98290XXXXX</p>
                    <p className="text-[10px] text-slate-500">GSTIN: 08AABCG1234F1Z9</p>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span>1. Basmati Rice 5kg</span>
                      <span>₹550.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>2. Dairy Milk Silk (3 pcs)</span>
                      <span>₹270.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>3. MDH Masala 100g</span>
                      <span>₹84.00</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-dashed border-slate-300 text-[11px] space-y-0.5">
                    <div className="flex justify-between">
                      <span>Total Amount:</span>
                      <span className="font-bold text-slate-900">₹904.00</span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>Paid via UPI:</span>
                      <span>₹904.00</span>
                    </div>
                  </div>
                  <div className="text-center pt-2 border-t border-slate-100 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded flex items-center justify-center">
                      <QrCode className="w-12 h-12 text-slate-800" />
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 font-sans">Scan with any UPI App</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Row 2: Customer Ledger & Udhaar (Mockup Left, Text Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 order-2 lg:order-1 bg-[#F4F7FB] p-5 sm:p-6 rounded-2xl border border-slate-200">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Ramesh Verma (Customer)</p>
                      <p className="text-[10.5px] text-slate-500">+91 94250 88XXX • Regular Customer</p>
                    </div>
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      ₹3,450 Due
                    </span>
                  </div>
                  {/* WhatsApp Message Preview */}
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-slate-700 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px]">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                      <span>WhatsApp Automated Reminder Preview:</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      "नमस्ते रमेश जी! गुप्ता स्टोर पर आपका <strong>₹3,450</strong> का उधारी हिसाब बाकी है। नीचे दिए गए सुरक्षित लिंक से सीधे UPI (GPay/PhonePe) द्वारा भुगतान करें: upi://pay?pa=guptastore@upi..."
                    </p>
                    <div className="flex justify-end text-[10px] text-emerald-700 font-medium">
                      Delivered with 1 tap ✓
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 order-1 lg:order-2 space-y-4">
                <span className="text-xs font-bold text-[#173653] uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded">
                  02. SMART UDHAAR KHATA
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-[#071D35] leading-tight">
                  No More Lost Diaries: Track &amp; Recover Udhaar on WhatsApp
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-normal">
                  Keep a transparent customer-wise digital ledger. When customers buy on credit, record it in seconds. Send courteous WhatsApp reminders with an embedded payment link to clear dues 3x faster without awkward phone calls.
                </p>
                <ul className="space-y-2 text-xs sm:text-sm font-medium text-slate-700">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#008A36] shrink-0" />
                    <span>Real-time balance tracking with bill-wise settlement</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#008A36] shrink-0" />
                    <span>Automated payment receipt sent to customer immediately upon repayment</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#008A36] shrink-0" />
                    <span>Complete transaction history with date &amp; item references</span>
                  </li>
                </ul>
                <div className="pt-2">
                  <Link
                    href="/udhaar-khata-management"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#173653] hover:text-[#071D35]"
                  >
                    <span>Learn About Udhaar Ledger</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Feature Row 3: Stock Inventory & Alerts (Text Left, Mockup Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <span className="text-xs font-bold text-[#173653] uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded">
                  03. REAL-TIME INVENTORY
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-[#071D35] leading-tight">
                  Auto-Deducting Stock with Proactive Low-Stock Alerts
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-normal">
                  Stop running out of fast-moving products. With every bill created, stock updates in real time. Get instant notifications when items drop below threshold and manage purchase invoices seamlessly.
                </p>
                <ul className="space-y-2 text-xs sm:text-sm font-medium text-slate-700">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#008A36] shrink-0" />
                    <span>Customizable low-stock reorder thresholds per item</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#008A36] shrink-0" />
                    <span>Supplier purchase bills auto-increment warehouse quantities</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#008A36] shrink-0" />
                    <span>Export stock audit reports to Excel in 1 click</span>
                  </li>
                </ul>
                <div className="pt-2">
                  <Link
                    href="/inventory-stock-software"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#173653] hover:text-[#071D35]"
                  >
                    <span>View Stock Management Tools</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-6 bg-[#F4F7FB] p-5 sm:p-6 rounded-2xl border border-slate-200">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-semibold text-slate-700">
                    <span>Live Stock Monitor</span>
                    <span className="text-emerald-700 text-[11px] font-bold">Updated Just Now</span>
                  </div>
                  {/* Stock Row 1 */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50/70 border border-rose-200/80">
                    <div>
                      <p className="font-semibold text-slate-900">Basmati Rice (25kg Bag)</p>
                      <p className="text-[10px] text-slate-500">Min Threshold: 5 bags</p>
                    </div>
                    <span className="text-[10px] font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200">
                      2 Bags Left (LOW STOCK)
                    </span>
                  </div>
                  {/* Stock Row 2 */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div>
                      <p className="font-semibold text-slate-900">Tata Tea Gold 500g</p>
                      <p className="text-[10px] text-slate-500">Min Threshold: 10 packs</p>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      36 Packs (In Stock)
                    </span>
                  </div>
                  {/* Stock Row 3 */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div>
                      <p className="font-semibold text-slate-900">Fortune Mustard Oil (1L)</p>
                      <p className="text-[10px] text-slate-500">Min Threshold: 12 bottles</p>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      48 Bottles (In Stock)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Compact 4-Card Grid for Supporting Capabilities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
              
              <div className="bg-[#F4F7FB] p-5 rounded-2xl border border-slate-200 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#173653]">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">WhatsApp 1-Click Share</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Send PDF invoices &amp; payment confirmations directly to customers' phones.
                </p>
              </div>

              <div className="bg-[#F4F7FB] p-5 rounded-2xl border border-slate-200 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#008A36]">
                  <Home className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Free Ghar Kharcha</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Lifetime free personal family budget tracker integrated into the same login.
                </p>
              </div>

              <div className="bg-[#F4F7FB] p-5 rounded-2xl border border-slate-200 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#173653]">
                  <Users className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Staff PIN Protection</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Counter staff can create bills while reports &amp; margins stay protected by owner PIN.
                </p>
              </div>

              <div className="bg-[#F4F7FB] p-5 rounded-2xl border border-slate-200 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#2878CE]">
                  <Globe className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Hindi &amp; Hinglish UI</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Zero accounting jargon. Easy terms for any shopkeeper to pick up in 2 minutes.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* =========================================================
            5. SPECIFIC PROOF & TESTIMONIALS (No Generic Claims)
        ========================================================= */}
        <section className="py-14 sm:py-20 bg-[#F4F7FB] border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            
            {/* Section Header with Elevated Tagline */}
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-semibold text-[#008A36] uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                "हर पैसे का हिसाब, बिल्कुल आसान।"
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#071D35] tracking-tight">
                Trusted by 5,000+ Dukaandars Across India
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Real feedback from retail shops, wholesalers, and general stores using Pakka Chittha daily.
              </p>
            </div>

            {/* Specific Metrics Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-xs">
                <p className="text-2xl sm:text-3xl font-black text-[#173653] tabular-nums">10,000+</p>
                <p className="text-xs font-semibold text-slate-700">Bills Generated Daily</p>
                <p className="text-[10px] text-slate-400">On 2" &amp; 3" thermal printers</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-xs">
                <p className="text-2xl sm:text-3xl font-black text-[#008A36] tabular-nums">5,000+</p>
                <p className="text-xs font-semibold text-slate-700">Active Dukaans</p>
                <p className="text-[10px] text-slate-400">Across 18+ Indian States</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-xs">
                <p className="text-2xl sm:text-3xl font-black text-[#2878CE] tabular-nums">₹2.5 Cr+</p>
                <p className="text-xs font-semibold text-slate-700">Monthly Udhaar Tracked</p>
                <p className="text-[10px] text-slate-400">Recovered with WhatsApp links</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-xs">
                <p className="text-2xl sm:text-3xl font-black text-slate-800 tabular-nums">10 Sec</p>
                <p className="text-xs font-semibold text-slate-700">Average Billing Time</p>
                <p className="text-[10px] text-slate-400">Fast counter checkout</p>
              </div>
            </div>

            {/* Real Shopkeeper Testimonial Quotes with City Names */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Testimonial 1 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-4 shadow-xs">
                <div className="space-y-3">
                  <div className="flex gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                    "Counter pe subah-shaam bheed ke time 10 second me thermal bill nikal jata hai. Pehle udhaar hisaab ke liye diary ke panne palatne padte the, ab customer ka naam likhte hi pura baki hisaab screen par aa jata hai."
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-900">Rajesh Chaurasia</p>
                  <p className="text-[11px] text-slate-500">Shree Ganesh Kirana Store, Indore (M.P.)</p>
                </div>
              </div>

              {/* Testimonial 2 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-4 shadow-xs">
                <div className="space-y-3">
                  <div className="flex gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                    "WhatsApp pe reminder bhejte hi grahak turant UPI se payment bhej dete hain. Pichhle mahine lagbhag ₹45,000 ki purani udhaari bina kisi bahas ya vivaad ke seedhe bank me wapas aayi!"
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-900">Sunil Gupta</p>
                  <p className="text-[11px] text-slate-500">Gupta Electricals &amp; Hardware, Jaipur (Rajasthan)</p>
                </div>
              </div>

              {/* Testimonial 3 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-4 shadow-xs">
                <div className="space-y-3">
                  <div className="flex gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                    "Dukaan ka GST bill aur ghar ka rashan hisaab dono ek hi app me manage hona sabse bada fayda hai. Counter boy ke liye PIN hone se mera profit aur data dono safe rehte hain."
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-900">Alok Verma</p>
                  <p className="text-[11px] text-slate-500">Maa Vaishno Medical Store, Lucknow (U.P.)</p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* =========================================================
            6. FAQ SECTION
        ========================================================= */}
        <section className="py-14 sm:py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-2">
              <span className="text-xs font-semibold text-[#173653] uppercase tracking-wider">
                Got Questions?
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#071D35] tracking-tight">
                Frequently Asked Questions
              </h2>
            </div>

            <FaqAccordion items={HOMEPAGE_FAQS} />
          </div>
        </section>

        {/* =========================================================
            7. BOTTOM CALL TO ACTION
        ========================================================= */}
        <section className="py-12 sm:py-16 bg-[#F4F7FB] border-t border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-[#173653] p-8 sm:p-12 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-sm">
              <div className="space-y-2 max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Digitize Your Counter, Stock &amp; Udhaar Today
                </h2>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                  Join 5,000+ Indian shops. Start your 7-day full access free trial with zero credit card commitment or use Ghar Kharcha free forever.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#008A36] hover:bg-[#006B2B] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                >
                  <span>Start 7-Day Free Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-medium border border-white/20 transition-colors"
                >
                  View Subscription Plans
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
