'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#172B4D] bg-white hover:bg-[#F8FAFC] border border-[#E1E7EF] rounded-full shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          aria-expanded={isOpen}
          aria-label="Change language"
        >
          <Globe className="w-3.5 h-3.5 text-[#2878CE] shrink-0" />
          <span className="font-semibold text-[#172B4D]">{language.name}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-[#64748B] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      ) : variant === 'settings' ? (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-[#F8FAFC] border border-[#E1E7EF] rounded-xl transition-all cursor-pointer shadow-2xs"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#E8F2FC] border border-[#E1E7EF] flex items-center justify-center text-[#2878CE]">
              <Globe className="w-5 h-5" />
            </div>
            <div className="text-start">
              <p className="text-xs font-bold text-[#172B4D]">
                {language.name}{' '}
                <span className="text-[#64748B] font-normal">({language.nativeName})</span>
              </p>
              <p className="text-[11px] text-[#64748B]">English / हिन्दी</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#2878CE] bg-[#E8F2FC] px-2.5 py-1 rounded-full border border-blue-200">
              Change / बदलें
            </span>
            <ChevronDown className={`w-4 h-4 text-[#64748B] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
      ) : (
        /* Header / Compact variant */
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#172B4D] bg-white hover:bg-[#F8FAFC] rounded-xl border border-[#E1E7EF] shadow-2xs transition-all cursor-pointer"
          aria-expanded={isOpen}
          title={`Select language: ${language.name}`}
          aria-label="Select language"
        >
          <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2878CE] shrink-0" />
          {/* Responsive label: compact abbreviation on mobile, full language name on desktop */}
          <span className="font-semibold text-[#172B4D] text-[11px] uppercase sm:hidden">
            {locale}
          </span>
          <span className="font-semibold text-[#172B4D] text-xs hidden sm:inline">
            {language.name}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-[#64748B] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Language selection"
          className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-[#E1E7EF] p-2 z-[80] animate-in fade-in slide-in-from-top-1.5"
        >
          <div className="px-2 py-1.5 border-b border-[#E1E7EF] text-[10px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-[#2878CE]" />
            <span>Select Language</span>
          </div>
          <div className="space-y-1 mt-1">
            {SUPPORTED_LANGUAGES.map((lang: LanguageMeta) => {
              const isSelected = locale === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-[#E8F2FC] text-[#2878CE] border border-blue-200 font-bold'
                      : 'text-[#172B4D] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div>
                    <span className="block">{lang.name}</span>
                    <span className="text-[10px] font-normal text-[#64748B]">{lang.nativeName}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#2878CE]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
