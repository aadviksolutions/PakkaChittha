'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, ShieldCheck, HelpCircle, Heart, ArrowUpRight } from 'lucide-react';
import { useTranslation } from '@/i18n/context';

export function KnowledgeFooter() {
  const { locale } = useTranslation();
  const isHi = locale === 'hi';

  return (
    <footer className="border-t border-slate-200 bg-slate-900 text-slate-300">
      {/* Top Banner: Public Mission */}
      <div className="border-b border-slate-800 bg-slate-950/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isHi ? 'हर भारतीय के लिए निशुल्क जन-जागरूकता' : '100% Free Public Education & Awareness'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                {isHi
                  ? 'पक्काचिट्ठा का लक्ष्य आम नागरिकों, छोटे दुकानदारों और उद्यमियों को जीएसटी, बैंकिंग, सरकारी योजनाओं और कानूनी अधिकारों की सही जानकारी देना है।'
                  : 'PakkaChittha empowers Indian citizens, shopkeepers, and micro-enterprises with clear, verified knowledge on taxation, banking, MSME schemes, and consumer rights.'}
              </p>
            </div>
          </div>
          <Link
            href="/knowledge/ask"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/10 whitespace-nowrap"
          >
            <HelpCircle className="w-4 h-4" />
            <span>{isHi ? 'अपना सवाल पूछें (निशुल्क)' : 'Ask Your Question (Free)'}</span>
          </Link>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand info */}
          <div className="col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-xl font-black text-white">
                Pakka<span className="text-emerald-400">Chittha</span>{' '}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {isHi ? 'ज्ञान केंद्र' : 'Knowledge Hub'}
                </span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed max-w-sm">
              {isHi
                ? 'हर सवाल का जवाब, अब एक ही जगह! सीखें • समझें • आगे बढ़ें • जागरूक रहें।'
                : 'Every question answered in one trusted place. Learn • Understand • Grow • Stay Aware.'}
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <span>Made with</span>
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <span>for Indian Businesses & Families</span>
            </div>
          </div>

          {/* Quick Categories */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              {isHi ? 'प्रमुख विषय' : 'Key Categories'}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/knowledge/category/gst-taxation" className="hover:text-emerald-400 transition-colors">
                  GST & Taxation
                </Link>
              </li>
              <li>
                <Link href="/knowledge/category/billing-invoicing" className="hover:text-emerald-400 transition-colors">
                  Billing & Invoicing
                </Link>
              </li>
              <li>
                <Link href="/knowledge/category/udhar-credit-recovery" className="hover:text-emerald-400 transition-colors">
                  Udhar & Recovery
                </Link>
              </li>
              <li>
                <Link href="/knowledge/category/government-schemes-subsidies" className="hover:text-emerald-400 transition-colors">
                  Government Schemes
                </Link>
              </li>
              <li>
                <Link href="/knowledge/category/cyber-fraud-digital-safety" className="hover:text-emerald-400 transition-colors">
                  Cyber Fraud Safety
                </Link>
              </li>
              <li>
                <Link href="/knowledge/categories" className="text-emerald-400 font-semibold hover:underline">
                  {isHi ? 'सभी 15 श्रेणियां देखें →' : 'View All 15 Categories →'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Explore Portal */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              {isHi ? 'एक्सप्लोर करें' : 'Explore Hub'}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/knowledge/questions" className="hover:text-emerald-400 transition-colors">
                  {isHi ? 'सवाल और जवाब (Q&A)' : 'Questions & Answers'}
                </Link>
              </li>
              <li>
                <Link href="/knowledge/articles" className="hover:text-emerald-400 transition-colors">
                  {isHi ? 'विस्तृत लेख और गाइड' : 'In-depth Articles'}
                </Link>
              </li>
              <li>
                <Link href="/knowledge/search" className="hover:text-emerald-400 transition-colors">
                  {isHi ? 'खोजें (Search)' : 'Search Knowledge'}
                </Link>
              </li>
              <li>
                <Link href="/knowledge/ask" className="hover:text-emerald-400 transition-colors">
                  {isHi ? 'सवाल सबमिट करें' : 'Submit Question'}
                </Link>
              </li>
              <li>
                <Link href="/knowledge/about" className="hover:text-emerald-400 transition-colors">
                  {isHi ? 'पोर्टल के बारे में' : 'About the Mission'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Main PakkaChittha Product */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              {isHi ? 'पक्काचिट्ठा सॉफ्टवेयर' : 'PakkaChittha App'}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <span>GST Billing Software</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-500" />
                </Link>
              </li>
              <li>
                <Link href="/udhaar-khata-management" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <span>Free Udhar Khata</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-500" />
                </Link>
              </li>
              <li>
                <Link href="/inventory-stock-software" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <span>Stock & Inventory</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-500" />
                </Link>
              </li>
              <li>
                <Link href="/ghar-kharcha-app" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <span>Ghar Kharcha App</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-500" />
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <span>Pricing Plans</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-500" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer Notice */}
        <div className="mt-10 pt-6 border-t border-slate-800 text-[11px] text-slate-500 leading-relaxed space-y-2">
          <p>
            <strong className="text-slate-400">{isHi ? 'कानूनी एवं शैक्षणिक अस्वीकरण:' : 'Legal & Educational Disclaimer:'}</strong>{' '}
            {isHi
              ? 'पक्काचिट्ठा ज्ञान केंद्र एक जन-जागरूकता और शैक्षणिक पहल है। यहां प्रकाशित सामग्री केवल सामान्य जानकारी के लिए है और इसे किसी कानूनी, वित्तीय या कर संबंधी पेशेवर सलाह का विकल्प नहीं माना जाना चाहिए। किसी भी विशेष मामले में कृपया योग्य चार्टर्ड अकाउंटेंट (CA) या कानूनी सलाहकार से परामर्श करें।'
              : 'The PakkaChittha Knowledge Hub is an open educational and public awareness initiative. The information provided is for general educational awareness only and does not constitute formal legal, financial, or tax counsel. For specific circumstances, always consult a licensed Chartered Accountant, Tax Practitioner, or Legal Expert.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 text-xs text-slate-500">
            <div>
              © {new Date().getFullYear()} PakkaChittha. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <Link href="/knowledge/about" className="hover:text-slate-300">Privacy & Terms</Link>
              <span>•</span>
              <Link href="/knowledge/ask" className="hover:text-slate-300">Contact Team</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

