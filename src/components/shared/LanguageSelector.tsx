'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Languages, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from '@/i18n/context';
import { SUPPORTED_LANGUAGES, LanguageMeta } from '@/i18n/config';

interface LanguageSelectorProps {
  variant?: 'header' | 'compact' | 'pill' | 'settings';
  className?: string;
}

export function LanguageSelector({ variant = 'header', className = '' }: LanguageSelectorProps) {
  const { locale, language, setLocale } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectLanguage = (code: string) => {
    setLocale(code);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block text-start ${className}`}>
      {/* Trigger Button based on variant */}
      {variant === 'pill' ? (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white/90 hover:bg-white border border-slate-200/90 rounded-full shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          aria-expanded={isOpen}
          aria-label="Change language"
        >
          <Languages className="w-3.5 h-3.5 text-[#EA580C]" />
          <span className="font-medium text-slate-800">{language.nativeName}</span>
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      ) : variant === 'settings' ? (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#EA580C]">
              <Languages className="w-5 h-5" />
            </div>
            <div className="text-start">
              <p className="text-xs font-bold text-slate-900">
                {language.nativeName}{' '}
                <span className="text-slate-400 font-normal">({language.name})</span>
              </p>
              <p className="text-[11px] text-slate-500">English / हिन्दी</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#EA580C] bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
              Switch / बदलें
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
      ) : (
        /* Header / Compact variant */
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
          aria-expanded={isOpen}
          title="Select language (English / हिन्दी)"
          aria-label="Select language"
        >
          <Languages className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#EA580C] shrink-0" />
          <span className="font-bold text-slate-800 text-[11px] uppercase sm:hidden">
            {locale}
          </span>
          <span className="font-bold text-slate-800 text-[11px] hidden sm:inline">
            {language.nativeName}
          </span>
          <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform hidden sm:block ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-black/10 sm:bg-transparent cursor-default"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-label="Language selection"
            className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-[80] animate-in fade-in slide-in-from-top-1.5"
          >
            <div className="px-2 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Choose Language / भाषा चुनें
            </div>
            <div className="space-y-1 mt-1">
              {SUPPORTED_LANGUAGES.map((lang: LanguageMeta) => {
                const isSelected = locale === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-orange-50 text-[#EA580C] border border-orange-200'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="block">{lang.nativeName}</span>
                      <span className="text-[10px] font-normal text-slate-400">{lang.name}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#EA580C]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
