'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BookOpen, 
  Search, 
  HelpCircle, 
  Layers, 
  FileText, 
  Globe, 
  Menu, 
  X, 
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import { useTranslation } from '@/i18n/context';

export function KnowledgeHeader() {
  const pathname = usePathname();
  const { locale, setLocale } = useTranslation();
  const isHi = locale === 'hi';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleLanguage = () => {
    setLocale(isHi ? 'en' : 'hi');
  };

  const navLinks = [
    {
      name: isHi ? 'होम' : 'Home',
      href: '/knowledge',
      active: pathname === '/knowledge',
    },
    {
      name: isHi ? 'श्रेणियां' : 'Categories',
      href: '/knowledge/categories',
      active: pathname.startsWith('/knowledge/category') || pathname === '/knowledge/categories',
    },
    {
      name: isHi ? 'सवाल-जवाब' : 'Q&A',
      href: '/knowledge/questions',
      active: pathname.startsWith('/knowledge/questions'),
    },
    {
      name: isHi ? 'गाइड व लेख' : 'Guides & Articles',
      href: '/knowledge/articles',
      active: pathname.startsWith('/knowledge/articles'),
    },
    {
      name: isHi ? 'सवाल पूछें' : 'Ask a Question',
      href: '/knowledge/ask',
      active: pathname === '/knowledge/ask',
      highlight: true,
    },
    {
      name: isHi ? 'हमारे बारे में' : 'About',
      href: '/knowledge/about',
      active: pathname === '/knowledge/about',
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md transition-all shadow-xs">
      {/* Top Banner: Free Public Knowledge & Awareness */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white text-xs py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />
        <span>
          {isHi
            ? 'पक्काचिट्ठा ज्ञान केंद्र: 100% निशुल्क जन-जागरूकता व व्यापारिक शिक्षा पोर्टल'
            : 'PakkaChittha Knowledge Hub: 100% Free Public Awareness & Business Education'}
        </span>
        <span className="hidden sm:inline-block bg-white/20 px-2 py-0.2 rounded text-[10px] uppercase font-bold tracking-wider">
          {isHi ? 'हर सवाल का जवाब' : 'No Login Required'}
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-4">
            <Link href="/knowledge" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black tracking-tight text-slate-900">
                    Pakka<span className="text-emerald-600">Chittha</span>
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {isHi ? 'ज्ञान केंद्र' : 'Knowledge Hub'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {isHi ? 'हर सवाल का जवाब, अब एक ही जगह!' : 'Learn • Understand • Grow • Stay Aware'}
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  link.active
                    ? 'text-emerald-700 bg-emerald-50'
                    : link.highlight
                    ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/60 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              title={isHi ? 'Switch to English' : 'हिंदी में बदलें'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isHi ? 'EN' : 'हिं'}</span>
            </button>

            {/* Search Quick Link */}
            <Link
              href="/knowledge/search"
              aria-label="Search Knowledge Hub"
              className="p-2 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-slate-100 transition-colors"
            >
              <Search className="w-4 h-4" />
            </Link>

            {/* Back to App / Login */}
            <Link
              href="/"
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xs"
            >
              <span>{isHi ? 'बिलिंग सॉफ्टवेयर' : 'PakkaChittha App'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Open Mobile Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {isHi ? 'नेविगेशन' : 'Menu'}
            </span>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-xs font-bold text-slate-700"
            >
              <Globe className="w-3 h-3 text-emerald-600" />
              <span>{isHi ? 'English' : 'हिंदी'}</span>
            </button>
          </div>

          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                link.active
                  ? 'bg-emerald-50 text-emerald-700 font-bold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{link.name}</span>
              {link.highlight && (
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  FREE
                </span>
              )}
            </Link>
          ))}

          <div className="pt-3 border-t border-slate-100">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold shadow-md"
            >
              <span>{isHi ? 'मुख्य बिलिंग ऐप पर जाएं' : 'Open PakkaChittha App'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

