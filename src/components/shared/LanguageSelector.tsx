'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Languages, Check, ChevronDown, Search, X } from 'lucide-react';
import { useTranslation } from '@/i18n/context';
import { LanguageMeta } from '@/i18n/config';

interface LanguageSelectorProps {
  variant?: 'header' | 'compact' | 'pill' | 'settings';
  className?: string;
}

export function LanguageSelector({ variant = 'header', className = '' }: LanguageSelectorProps) {
  const { locale, language, languages, setLocale } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
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

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelectLanguage = (code: string) => {
    setLocale(code);
    setIsOpen(false);
    setSearchQuery('');
  };

  const filteredLanguages = languages.filter((lang: LanguageMeta) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      lang.name.toLowerCase().includes(q) ||
      lang.nativeName.toLowerCase().includes(q) ||
      (lang.englishSubtext && lang.englishSubtext.toLowerCase().includes(q)) ||
      lang.code.toLowerCase().includes(q)
    );
  });

  return (
    <div ref={dropdownRef} className={`relative inline-block text-start ${className}`}>
      {/* Trigger Button based on variant */}
      {variant === 'pill' ? (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white/90 hover:bg-white border border-slate-200/90 rounded-full shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label="Change application language"
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
          aria-haspopup="dialog"
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
              <p className="text-[11px] text-slate-500">{language.script} • {language.dir.toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#EA580C] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
              Change
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
      ) : (
        /* Header / Compact variant */
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200/80 transition-all cursor-pointer"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          title="Select language (भाषा चुनें)"
          aria-label="Select language"
        >
          <Languages className="w-4 h-4 text-[#EA580C] shrink-0" />
          <span className="hidden sm:inline font-semibold text-slate-800 text-[11px] max-w-[80px] truncate">
            {language.nativeName}
          </span>
          <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Dropdown Modal Menu */}
      {isOpen && (
        <>
          {/* Invisible mobile backdrop */}
          <div
            className="fixed inset-0 z-[70] bg-black/10 sm:bg-transparent cursor-default"
            onClick={() => {
              setIsOpen(false);
              setSearchQuery('');
            }}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-label="Language selection modal"
            className="absolute right-0 top-full mt-2 w-[310px] sm:w-[360px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-3 z-[80] animate-in fade-in slide-in-from-top-1.5"
          >
            {/* Header & Search */}
            <div className="pb-2.5 mb-2 border-b border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Languages className="w-4 h-4 text-[#EA580C]" />
                  <span className="text-xs font-bold text-slate-900">
                    22 Indian Scheduled Languages
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                  aria-label="Close language selector"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search language / भाषा खोजें..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#EA580C] focus:border-[#EA580C]"
                />
              </div>
            </div>

            {/* Language List */}
            <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
              {filteredLanguages.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No matching language found.
                </div>
              ) : (
                filteredLanguages.map((lang: LanguageMeta) => {
                  const isSelected = lang.code === locale;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleSelectLanguage(lang.code)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-start transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-orange-50/90 text-orange-950 font-semibold border border-orange-200/80 shadow-2xs'
                          : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] uppercase shrink-0 ${
                            isSelected
                              ? 'bg-[#EA580C] text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {lang.code}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight truncate">
                            {lang.nativeName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-normal leading-tight truncate">
                            {lang.name} {lang.dir === 'rtl' ? '• RTL' : ''}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-[#EA580C] shrink-0 ms-2" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Bottom info badge */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span>Automatic persistence enabled</span>
              <span className="font-semibold text-slate-600">
                {languages.length} Languages
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
