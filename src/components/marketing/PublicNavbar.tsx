'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, X, ArrowRight } from 'lucide-react';
import { PUBLIC_FEATURE_PAGES } from '@/lib/seo/constants';

export function PublicNavbar() {
  const pathname = usePathname();
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFeaturesOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFeaturesOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const isFeatureRoute = PUBLIC_FEATURE_PAGES.some((f) => f.href === pathname);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="Pakka Chittha Home">
          <img
            src="/pakka-chittha-logo.png"
            alt="Pakka Chittha"
            className="h-9 sm:h-10 w-auto object-contain"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className={`text-sm font-semibold transition-colors ${
              pathname === '/' ? 'text-[#EA580C]' : 'text-[#071F38] hover:text-[#EA580C]'
            }`}
          >
            Home
          </Link>

          {/* Features Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              aria-expanded={featuresOpen}
              aria-haspopup="true"
              onClick={() => setFeaturesOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1 text-sm font-semibold transition-colors cursor-pointer py-2 ${
                isFeatureRoute || featuresOpen ? 'text-[#EA580C]' : 'text-[#071F38] hover:text-[#EA580C]'
              }`}
            >
              <span>Features</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-150 ${
                  featuresOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {featuresOpen && (
              <div className="absolute left-0 top-full mt-1 w-80 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50">
                <div className="space-y-1">
                  {PUBLIC_FEATURE_PAGES.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block rounded-xl p-3 transition-colors ${
                          active ? 'bg-orange-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs font-bold ${
                              active ? 'text-[#EA580C]' : 'text-[#071F38]'
                            }`}
                          >
                            {item.shortTitle}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {item.description}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <Link
            href="/pricing"
            className={`text-sm font-semibold transition-colors ${
              pathname === '/pricing' ? 'text-[#EA580C]' : 'text-[#071F38] hover:text-[#EA580C]'
            }`}
          >
            Pricing
          </Link>

          <Link
            href="/ghar-kharcha-app"
            className={`text-sm font-semibold transition-colors ${
              pathname === '/ghar-kharcha-app'
                ? 'text-[#EA580C]'
                : 'text-[#071F38] hover:text-[#EA580C]'
            }`}
          >
            Free Ghar Kharcha
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-[#071F38] hover:text-[#EA580C] transition-colors"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#EA580C] hover:bg-[#D94E00] shadow-xs transition-all"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-xl border border-slate-200 text-[#071F38] hover:bg-slate-50 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 shadow-lg">
          <Link
            href="/"
            className="block px-3 py-2 rounded-xl text-sm font-bold text-[#071F38] hover:bg-slate-50"
          >
            Home
          </Link>
          <div className="px-3 pt-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Solutions & Features
            </p>
            <div className="space-y-1">
              {PUBLIC_FEATURE_PAGES.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                    pathname === item.href
                      ? 'bg-orange-50 text-[#EA580C]'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.shortTitle}
                </Link>
              ))}
            </div>
          </div>
          <Link
            href="/pricing"
            className="block px-3 py-2 rounded-xl text-sm font-bold text-[#071F38] hover:bg-slate-50"
          >
            Pricing & Plans
          </Link>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
            <Link
              href="/login"
              className="flex-1 text-center py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-[#071F38]"
            >
              Login to Workspace
            </Link>
            <Link
              href="/register"
              className="flex-1 text-center py-2.5 rounded-xl bg-[#EA580C] text-xs font-bold text-white"
            >
              Start 7-Day Trial
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

