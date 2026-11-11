import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  FileText,
  Printer,
  MessageSquare,
  BookOpen,
  Users,
  Bell,
  Package,
  TrendingUp,
  BarChart3,
  Home,
  Wallet,
  Cloud,
  ShieldCheck,
} from 'lucide-react';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { FaqAccordion } from './FaqAccordion';
import { JsonLdScript } from './JsonLdScript';
import { buildFaqJsonLd, type FaqItem } from '@/lib/seo/constants';

export type FeatureIconKey =
  | 'file'
  | 'printer'
  | 'whatsapp'
  | 'book'
  | 'users'
  | 'bell'
  | 'package'
  | 'trending'
  | 'chart'
  | 'home'
  | 'wallet'
  | 'cloud'
  | 'shield';

const ICON_MAP: Record<FeatureIconKey, React.ComponentType<{ className?: string }>> = {
  file: FileText,
  printer: Printer,
  whatsapp: MessageSquare,
  book: BookOpen,
  users: Users,
  bell: Bell,
  package: Package,
  trending: TrendingUp,
  chart: BarChart3,
  home: Home,
  wallet: Wallet,
  cloud: Cloud,
  shield: ShieldCheck,
};

export interface FeatureBenefitCard {
  title: string;
  description: string;
  icon: FeatureIconKey;
}

export interface HowItWorksStep {
  step: string;
  title: string;
  description: string;
}

export interface RelatedSolutionLink {
  title: string;
  description: string;
  href: string;
}

export interface FeatureLandingContent {
  badge: string;
  breadcrumbLabel: string;
  h1: string;
  subheading: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  highlights: string[];
  sectionsHeading: string;
  sectionsSubheading: string;
  keySections: FeatureBenefitCard[];
  howItWorksHeading: string;
  howItWorksSteps: HowItWorksStep[];
  relatedSolutions: RelatedSolutionLink[];
  faqs: FaqItem[];
  bottomCtaHeading: string;
  bottomCtaBody: string;
}

export function FeatureLandingTemplate({ content }: { content: FeatureLandingContent }) {
  const faqSchema = buildFaqJsonLd(content.faqs);

  return (
    <div className="min-h-screen flex flex-col bg-[#FCF8F5] text-slate-800 selection:bg-[#EA580C]/20 selection:text-[#071F38]">
      <JsonLdScript data={faqSchema} />

      <PublicNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-[#FFF9F5] via-[#FCF8F5] to-white pt-8 pb-14 sm:pt-14 sm:pb-20 border-b border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Link href="/" className="hover:text-[#EA580C] transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[#071F38]">{content.breadcrumbLabel}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-xs font-bold text-[#EA580C]">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>{content.badge}</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#071F38] tracking-tight leading-[1.15]">
                  {content.h1}
                </h1>

                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                  {content.subheading}
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
                  <Link
                    href={content.primaryCtaHref}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#EA580C] hover:bg-[#D94E00] text-white text-sm sm:text-base font-bold shadow-md shadow-orange-500/20 transition-all"
                  >
                    <span>{content.primaryCtaLabel}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href={content.secondaryCtaHref}
                    className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-[#071F38] text-sm sm:text-base font-bold border border-slate-300 shadow-2xs transition-all"
                  >
                    {content.secondaryCtaLabel}
                  </Link>
                </div>
              </div>

              {/* Right Highlights Card */}
              <div className="lg:col-span-5">
                <div className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-7 shadow-lg space-y-4">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[#00B887]">
                    Included With Pakka Chittha
                  </p>
                  <ul className="space-y-3">
                    {content.highlights.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm font-medium text-[#071F38]">
                        <CheckCircle2 className="w-5 h-5 text-[#00B887] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Works on Desktop &amp; Mobile Browser</span>
                    <Link href="/pricing" className="font-bold text-[#EA580C] hover:underline">
                      View Plans &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Benefits Section */}
        <section className="py-14 sm:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
              <h2 className="text-2xl sm:text-4xl font-black text-[#071F38] tracking-tight">
                {content.sectionsHeading}
              </h2>
              <p className="text-sm sm:text-base text-slate-600">{content.sectionsSubheading}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {content.keySections.map((section) => {
                const Icon = ICON_MAP[section.icon] || CheckCircle2;
                return (
                  <article
                    key={section.title}
                    className="rounded-3xl border border-slate-200 bg-[#FCF8F5]/60 p-6 sm:p-7 space-y-3"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#EA580C] flex items-center justify-center">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-[#071F38]">
                      {section.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {section.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works Steps */}
        <section className="py-14 sm:py-20 bg-[#F6F9FC] border-y border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#EA580C]">
                Simple 3-Step Setup
              </p>
              <h2 className="text-2xl sm:text-4xl font-black text-[#071F38] tracking-tight">
                {content.howItWorksHeading}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {content.howItWorksSteps.map((step) => (
                <div
                  key={step.step}
                  className="rounded-3xl bg-white border border-slate-200 p-6 space-y-3 shadow-2xs"
                >
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#071F38] text-white text-sm font-black">
                    {step.step}
                  </span>
                  <h3 className="text-lg font-extrabold text-[#071F38]">{step.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Related Solutions Internal Cross-Links */}
        <section className="py-14 sm:py-16 bg-white border-b border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#00B887]">
                  Connected Workflows
                </p>
                <h2 className="text-2xl sm:text-3xl font-black text-[#071F38] tracking-tight mt-1">
                  Explore Related Pakka Chittha Solutions
                </h2>
              </div>
              <Link href="/" className="text-sm font-bold text-[#EA580C] hover:underline">
                Back to Homepage Overview &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {content.relatedSolutions.map((rel) => (
                <Link
                  key={rel.href}
                  href={rel.href}
                  className="group rounded-2xl border border-slate-200 hover:border-[#EA580C]/50 bg-[#FCF8F5]/50 hover:bg-white p-6 flex items-center justify-between gap-4 transition-all"
                >
                  <div className="space-y-1.5">
                    <h3 className="text-base sm:text-lg font-extrabold text-[#071F38] group-hover:text-[#EA580C] transition-colors">
                      {rel.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{rel.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#EA580C] shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-14 sm:py-20 bg-[#FCF8F5]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-3 mb-10">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#EA580C]">
                FAQs
              </p>
              <h2 className="text-2xl sm:text-3xl font-black text-[#071F38] tracking-tight">
                Frequently Asked Questions
              </h2>
            </div>

            <FaqAccordion items={content.faqs} />
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-12 sm:py-16 bg-white border-t border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-gradient-to-r from-[#071F38] to-[#0E3156] p-8 sm:p-12 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl">
              <div className="space-y-2 max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {content.bottomCtaHeading}
                </h2>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  {content.bottomCtaBody}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <Link
                  href={content.primaryCtaHref}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#EA580C] hover:bg-[#D94E00] text-white text-sm font-bold shadow-md transition-all"
                >
                  <span>{content.primaryCtaLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold border border-white/20 transition-all"
                >
                  Login to Workspace
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

