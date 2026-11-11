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
  Sparkles,
  Globe,
  ShoppingCart,
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

  const features = [
    {
      title: 'Fast GST Billing & Thermal Printing',
      description:
        'Generate professional GST & non-GST invoices with automatic CGST, SGST, and IGST tax calculation. Print instantly on 2-inch/3-inch thermal receipt printers or A4 sheets.',
      icon: FileText,
      iconBg: 'bg-orange-50 text-[#EA580C]',
      href: '/gst-billing-software',
      cta: 'Explore GST Billing',
    },
    {
      title: 'Smart Customer Ledger & Udhaar Management',
      description:
        'Maintain a clean customer-wise hisab-kitab ledger. Track pending udhaar, partial repayments, and advances in real time with complete transaction records.',
      icon: BookOpen,
      iconBg: 'bg-blue-50 text-[#0066FF]',
      href: '/udhaar-khata-management',
      cta: 'Explore Udhaar Khata',
    },
    {
      title: 'Real-Time Products & Stock Inventory',
      description:
        'Update stock quantities automatically with every sale and purchase bill. Get timely low-stock alerts and export daily or monthly inventory reports.',
      icon: Package,
      iconBg: 'bg-emerald-50 text-[#00B887]',
      href: '/inventory-stock-software',
      cta: 'Explore Stock Inventory',
    },
    {
      title: 'WhatsApp Automation & Digital Reports',
      description:
        'Send GST bills, PDF invoices, and courteous pending payment reminders directly on WhatsApp with a single tap to recover udhaar faster.',
      icon: MessageSquare,
      iconBg: 'bg-teal-50 text-teal-600',
      href: '/udhaar-khata-management',
      cta: 'See WhatsApp Tools',
    },
    {
      title: '100% Free Ghar Kharcha Tracker',
      description:
        'Keep daily household expenses completely separate from your shop books. Track groceries, bills, and family monthly budgets forever free.',
      icon: Home,
      iconBg: 'bg-amber-50 text-amber-600',
      href: '/ghar-kharcha-app',
      cta: 'Explore Free Ghar Kharcha',
    },
  ];

  const pillars = [
    {
      title: 'Simple & Easy English / Hinglish Interface',
      description:
        'Designed for everyday Indian shopkeepers and families with clear English and Hindi labels — zero accounting jargon required.',
      icon: Globe,
    },
    {
      title: 'Multi-Staff Access & Role Permissions',
      description:
        'Let counter staff create bills and check stock while owners keep full control over reports, settings, and multi-location data.',
      icon: Users,
    },
    {
      title: '100% Cloud Security & Instant Access',
      description:
        'Your bills, customer khata, and stock ledger stay safely encrypted in the cloud and accessible across mobile and desktop browsers.',
      icon: Cloud,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FCF8F5] text-slate-800 selection:bg-[#EA580C]/20 selection:text-[#071F38]">
      <JsonLdScript data={softwareJsonLd} />
      <JsonLdScript data={faqJsonLd} />

      <PublicNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#FFF9F5] via-[#FCF8F5] to-white pt-10 pb-14 sm:pt-16 sm:pb-20 border-b border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Left Copy & CTAs */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 text-xs font-bold text-[#EA580C]">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>7-Day Business Free Trial + 100% Free Ghar Kharcha</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#071F38] tracking-tight leading-[1.15]">
                  Smart GST Billing, Inventory &amp; Hisab-Kitab Software for Indian Businesses
                </h1>

                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                  Create fast <strong className="text-[#071F38]">GST invoices</strong>, track live{' '}
                  <strong className="text-[#071F38]">stock inventory</strong>, manage customer{' '}
                  <strong className="text-[#071F38]">udhaari</strong>, and send one-click{' '}
                  <strong className="text-[#071F38]">WhatsApp billing</strong> reminders — plus a
                  forever-free Ghar Kharcha &amp; Personal Khata tracker.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#EA580C] hover:bg-[#D94E00] text-white text-sm sm:text-base font-bold shadow-md shadow-orange-500/20 transition-all"
                  >
                    <span>Start 7-Day Free Trial</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-[#071F38] text-sm sm:text-base font-bold border border-slate-300 shadow-2xs transition-all"
                  >
                    <span>Login to Workspace</span>
                  </Link>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs sm:text-sm font-medium text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00B887]" />
                    No credit card needed
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00B887]" />
                    Thermal &amp; A4 print ready
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00B887]" />
                    English &amp; Hindi friendly
                  </span>
                </div>
              </div>

              {/* Right Quick-Access Mode Cards (Preserving Mera Vyapaar & Mera Ghar Identity) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="rounded-3xl bg-white border border-slate-200/90 shadow-lg p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-[#EA580C]">
                        Choose Your Mode
                      </p>
                      <p className="text-sm font-bold text-[#071F38]">
                        Built for Shops &amp; Homes
                      </p>
                    </div>
                    <ShieldCheck className="w-6 h-6 text-[#00B887]" />
                  </div>

                  {/* Mera Vyapaar Card */}
                  <div className="rounded-2xl bg-[#F6F9FC] border border-blue-100 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-blue-100 text-[#0066FF]">
                          <ShoppingCart className="w-4 h-4" />
                        </span>
                        <div>
                          <p className="text-sm font-black text-[#071F38]">Mera Vyapaar</p>
                          <p className="text-[11px] font-medium text-slate-500">
                            GST Billing, Stock &amp; Customer Udhaar
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                        7-Day Free Trial
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <Link
                        href="/pricing"
                        className="text-xs font-bold text-[#0066FF] hover:underline"
                      >
                        Compare Plans &rarr;
                      </Link>
                      <Link
                        href="/register"
                        className="text-xs font-bold text-[#071F38] bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:border-[#0066FF] transition-colors"
                      >
                        Try Business Mode
                      </Link>
                    </div>
                  </div>

                  {/* Mera Ghar Card */}
                  <div className="rounded-2xl bg-[#FFF9F5] border border-orange-100 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-orange-100 text-[#EA580C]">
                          <Home className="w-4 h-4" />
                        </span>
                        <div>
                          <p className="text-sm font-black text-[#071F38]">Mera Ghar</p>
                          <p className="text-[11px] font-medium text-slate-500">
                            Ghar Kharcha &amp; Personal Khata
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#00B887] text-white">
                        100% Free Forever
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <Link
                        href="/ghar-kharcha-app"
                        className="text-xs font-bold text-[#EA580C] hover:underline"
                      >
                        Explore Ghar Kharcha &rarr;
                      </Link>
                      <Link
                        href="/register?plan=ghar_kharcha"
                        className="text-xs font-bold text-white bg-[#EA580C] hover:bg-[#D94E00] px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Start Free Now
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5 Core Features Section */}
        <section className="py-14 sm:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#EA580C]">
                Complete Shop &amp; Home Platform
              </p>
              <h2 className="text-2xl sm:text-4xl font-black text-[#071F38] tracking-tight">
                Everything You Need to Run Your Business &amp; Daily Hisab
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                Built specifically for Indian kirana stores, wholesalers, retailers, service
                providers, and households.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feat) => {
                const Icon = feat.icon;
                return (
                  <article
                    key={feat.title}
                    className="rounded-3xl border border-slate-200/90 bg-[#FCF8F5]/50 hover:bg-white p-6 flex flex-col justify-between transition-all hover:shadow-md"
                  >
                    <div className="space-y-3.5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${feat.iconBg}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-extrabold text-[#071F38] leading-snug">
                        {feat.title}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {feat.description}
                      </p>
                    </div>
                    <div className="pt-5">
                      <Link
                        href={feat.href}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#EA580C] hover:text-[#D94E00]"
                      >
                        <span>{feat.cta}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="py-14 sm:py-20 bg-[#F6F9FC] border-y border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#00B887]">
                Why Businesses Trust Pakka Chittha
              </p>
              <h2 className="text-2xl sm:text-4xl font-black text-[#071F38] tracking-tight">
                Simple, Reliable &amp; Built for Real Indian Dukaans
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={pillar.title}
                    className="rounded-3xl bg-white border border-slate-200 p-6 space-y-3 shadow-2xs"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-[#071F38] text-white flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-[#071F38]">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-14 sm:py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-3 mb-10">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#EA580C]">
                Frequently Asked Questions
              </p>
              <h2 className="text-2xl sm:text-4xl font-black text-[#071F38] tracking-tight">
                Common Questions About Pakka Chittha
              </h2>
            </div>

            <FaqAccordion items={HOMEPAGE_FAQS} />
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="py-12 sm:py-16 bg-[#FCF8F5] border-t border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-gradient-to-r from-[#071F38] to-[#0E3156] p-8 sm:p-12 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl">
              <div className="space-y-2 max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Ready to Digitize Your Billing, Stock &amp; Udhaar Khata?
                </h2>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Start your 7-day full-feature business free trial today or use Ghar Kharcha free
                  forever.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#EA580C] hover:bg-[#D94E00] text-white text-sm font-bold shadow-md transition-all"
                >
                  <span>Start 7-Day Free Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold border border-white/20 transition-all"
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

