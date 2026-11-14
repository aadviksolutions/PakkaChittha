'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, HelpCircle, FileText, X, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/i18n/context';

interface SearchResultItem {
  type: 'question' | 'article';
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  categoryName?: string;
}

export function KnowledgeSearchBar({
  placeholder,
  initialQuery = '',
  large = false,
}: {
  placeholder?: string;
  initialQuery?: string;
  large?: boolean;
}) {
  const router = useRouter();
  const { locale } = useTranslation();
  const isHi = locale === 'hi';

  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const defaultPlaceholder = isHi
    ? 'जीएसटी, बिलिंग, उधारी, सरकारी योजनाएं या कोई भी सवाल खोजें...'
    : 'Search GST, billing, udhari recovery, government schemes, or any question...';

  // Debounced auto-suggest
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ q: query.trim() });
        const res = await fetch(`/api/v1/knowledge/search?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          const items: SearchResultItem[] = [];
          if (data.results?.questions) {
            data.results.questions.slice(0, 4).forEach((q: any) => {
              items.push({
                type: 'question',
                id: q.id,
                slug: q.slug,
                title: isHi && q.titleHi ? q.titleHi : q.titleEn,
                subtitle: isHi && q.shortAnswerHi ? q.shortAnswerHi.slice(0, 90) + '...' : q.shortAnswerEn?.slice(0, 90) + '...',
                categoryName: isHi && q.category?.nameHi ? q.category.nameHi : q.category?.nameEn,
              });
            });
          }
          if (data.results?.articles) {
            data.results.articles.slice(0, 3).forEach((a: any) => {
              items.push({
                type: 'article',
                id: a.id,
                slug: a.slug,
                title: isHi && a.titleHi ? a.titleHi : a.titleEn,
                subtitle: isHi && a.summaryHi ? a.summaryHi.slice(0, 90) + '...' : a.summaryEn?.slice(0, 90) + '...',
                categoryName: isHi && a.category?.nameHi ? a.category.nameHi : a.category?.nameEn,
              });
            });
          }
          setSuggestions(items);
          setIsOpen(items.length > 0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query, isHi]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setIsOpen(false);
    const params = new URLSearchParams({ q: query.trim() });
    router.push(`/knowledge/search?${params.toString()}`);
  };

  return (
    <div ref={wrapperRef} className="w-full relative">
      <form onSubmit={handleSearchSubmit} className="relative w-full">
        <div
          className={`relative flex items-center w-full rounded-2xl bg-white border border-slate-200 shadow-md shadow-slate-200/50 hover:border-emerald-500 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all ${large ? 'p-2 sm:p-2.5' : 'p-1.5'
            }`}
        >
          <div className="pl-3 pr-2 text-slate-400">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            ) : (
              <Search className={`w-5 h-5 ${large ? 'sm:w-6 sm:h-6' : ''} text-emerald-600`} />
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setIsOpen(true)}
            placeholder={placeholder || defaultPlaceholder}
            className={`w-full bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none ${large ? 'text-base sm:text-lg font-medium' : 'text-sm'
              }`}
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                setIsOpen(false);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            className={`shrink-0 flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-colors shadow-sm ${large ? 'px-4 sm:px-6 py-2.5 text-sm sm:text-base' : 'px-3 py-1.5 text-xs'
              }`}
          >
            <span>{isHi ? 'खोजें' : 'Search'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Auto-suggest dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden divide-y divide-slate-100">
          <div className="p-3 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5 text-emerald-800 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              {isHi ? 'शीघ्र परिणाम' : 'Quick Suggestions'}
            </span>
            <span>{suggestions.length} items</span>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {suggestions.map((item) => (
              <Link
                key={`${item.type}-${item.id}`}
                href={
                  item.type === 'question'
                    ? `/knowledge/questions/${item.slug}`
                    : `/knowledge/articles/${item.slug}`
                }
                onClick={() => setIsOpen(false)}
                className="p-3.5 flex items-start gap-3 hover:bg-emerald-50/50 transition-colors group"
              >
                <div
                  className={`p-2 rounded-lg shrink-0 mt-0.5 ${item.type === 'question'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                    }`}
                >
                  {item.type === 'question' ? (
                    <HelpCircle className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {item.type === 'question' ? (isHi ? 'सवाल' : 'Q&A') : (isHi ? 'गाइड' : 'Guide')}
                    </span>
                    {item.categoryName && (
                      <span className="text-xs text-slate-400 font-medium truncate">
                        {item.categoryName}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 mt-1 line-clamp-1">
                    {item.title}
                  </h4>
                  {item.subtitle && (
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{item.subtitle}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <div className="p-2.5 bg-slate-50 text-center">
            <button
              onClick={() => handleSearchSubmit()}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              {isHi
                ? `"${query}" के लिए सभी परिणाम देखें →`
                : `View all results for "${query}" →`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
