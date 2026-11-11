import React from 'react';
import Link from 'next/link';
import { ShieldCheck, MessageSquare, Cloud, Users } from 'lucide-react';
import { PUBLIC_FEATURE_PAGES } from '@/lib/seo/constants';

export function PublicFooter() {
  return (
    <footer className="bg-white border-t border-slate-200 text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-4">
            <Link href="/" className="inline-flex items-center">
              <img
                src="/pakka-chittha-logo.png"
                alt="Pakka Chittha"
                className="h-9 w-auto object-contain"
              />
            </Link>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md">
              Smart GST billing, real-time stock inventory, customer udhaar khata, WhatsApp
              invoices, and a 100% free Ghar Kharcha app — built for Indian shopkeepers,
              traders, and families.
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#00B887]" />
                GST Compliant
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-[#0066FF]" />
                100% Cloud Backup
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[#00B887]" />
                WhatsApp Ready
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#EA580C]" />
                Multi-Staff Access
              </span>
            </div>
          </div>

          {/* Solutions Column */}
          <div className="md:col-span-4 space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#071F38]">
              Solutions
            </h2>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/" className="hover:text-[#EA580C] transition-colors font-medium">
                  Pakka Chittha Home
                </Link>
              </li>
              {PUBLIC_FEATURE_PAGES.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="hover:text-[#EA580C] transition-colors font-medium"
                  >
                    {item.shortTitle}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account & Pricing Column */}
          <div className="md:col-span-3 space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#071F38]">
              Get Started
            </h2>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/pricing" className="hover:text-[#EA580C] transition-colors font-medium">
                  Pricing &amp; Plans
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="hover:text-[#EA580C] transition-colors font-medium text-[#EA580C]"
                >
                  Start 7-Day Free Trial
                </Link>
              </li>
              <li>
                <Link
                  href="/register?plan=ghar_kharcha"
                  className="hover:text-[#EA580C] transition-colors font-medium"
                >
                  Free Ghar Kharcha Signup
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#EA580C] transition-colors font-medium">
                  Login to Workspace
                </Link>
              </li>
              <li>
                <Link
                  href="/select-mode"
                  className="hover:text-[#EA580C] transition-colors font-medium"
                >
                  Choose App Mode
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Pakka Chittha. Built for Indian Businesses. All rights reserved.</p>
          <p className="font-medium text-slate-400">Har paise ka hisaab, bilkul aasaan.</p>
        </div>
      </div>
    </footer>
  );
}

