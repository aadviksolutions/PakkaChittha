'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LOCALE,
  COOKIE_LOCALE_KEY,
  isValidLocale,
  getLanguageMeta,
  getDirection,
  formatIndianCurrency,
  formatIndianNumber,
  LanguageMeta,
  TextDirection,
} from './config';
import { getDictionary, TranslationDictionary } from './dictionaries';
import { en } from './dictionaries/en';
import { useAuth } from '@/context/AuthContext';

interface I18nContextType {
  locale: string;
  language: LanguageMeta;
  dir: TextDirection;
  languages: LanguageMeta[];
  setLocale: (newLocale: string) => Promise<void>;
  t: (path: string, params?: Record<string, string | number>) => string;
  formatCurrency: (amount: number) => string;
  formatNumber: (value: number) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

function getNestedValue(obj: any, path: string): string | undefined {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: string;
}) {
  const { user } = useAuth();
  const [locale, setLocaleState] = useState<string>(() => {
    if (isValidLocale(initialLocale)) return initialLocale!;
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_LOCALE_KEY}=([^;]*)`));
      if (match && isValidLocale(match[1])) {
        return match[1];
      }
      try {
        const stored = localStorage.getItem(COOKIE_LOCALE_KEY);
        if (isValidLocale(stored)) return stored!;
      } catch {}
    }
    return DEFAULT_LOCALE;
  });

  // Keep synced if user preference from account profile arrives after auth hydration
  useEffect(() => {
    if (user?.preferredLanguage && isValidLocale(user.preferredLanguage) && user.preferredLanguage !== locale) {
      // If user hasn't explicitly set another cookie choice in this session
      const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_LOCALE_KEY}=([^;]*)`));
      if (!cookieMatch) {
        setLocaleState(user.preferredLanguage);
      }
    }
  }, [user?.preferredLanguage]);

  // Update HTML document attributes for accessibility and RTL rendering
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const dir = getDirection(locale);
      document.documentElement.lang = locale;
      document.documentElement.dir = dir;
      if (dir === 'rtl') {
        document.documentElement.classList.add('rtl-layout');
      } else {
        document.documentElement.classList.remove('rtl-layout');
      }
    }
  }, [locale]);

  const setLocale = useCallback(async (newLocale: string) => {
    if (!isValidLocale(newLocale)) return;
    setLocaleState(newLocale);

    // 1. Client cookie
    document.cookie = `${COOKIE_LOCALE_KEY}=${newLocale}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;

    // 2. Local storage
    try {
      localStorage.setItem(COOKIE_LOCALE_KEY, newLocale);
    } catch {}

    // 3. Document direction & lang attributes immediately
    const dir = getDirection(newLocale);
    document.documentElement.lang = newLocale;
    document.documentElement.dir = dir;
    if (dir === 'rtl') {
      document.documentElement.classList.add('rtl-layout');
    } else {
      document.documentElement.classList.remove('rtl-layout');
    }

    // 4. Asynchronously persist to user DB account if logged in
    try {
      await fetch('/api/user/locale', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: newLocale }),
      });
    } catch {}
  }, []);

  const dictionary: TranslationDictionary = useMemo(() => {
    return getDictionary(locale);
  }, [locale]);

  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      // 1. Lookup in current language dictionary
      let text = getNestedValue(dictionary, path);

      // 2. English fallback if missing key
      if (!text) {
        text = getNestedValue(en, path);
      }

      // 3. Return last segment of path if totally missing
      if (!text) {
        text = path.split('.').pop() || path;
      }

      // 4. Interpolate {param} placeholders
      if (params) {
        Object.entries(params).forEach(([key, val]) => {
          text = text!.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
        });
      }

      return text;
    },
    [dictionary]
  );

  const formatCurrency = useCallback(
    (amount: number) => formatIndianCurrency(amount, locale),
    [locale]
  );

  const formatNumber = useCallback(
    (value: number) => formatIndianNumber(value, locale),
    [locale]
  );

  const language = useMemo(() => getLanguageMeta(locale), [locale]);
  const dir = language.dir;

  const value = useMemo(
    () => ({
      locale,
      language,
      dir,
      languages: SUPPORTED_LANGUAGES,
      setLocale,
      t,
      formatCurrency,
      formatNumber,
    }),
    [locale, language, dir, setLocale, t, formatCurrency, formatNumber]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    // Graceful fallback for non-wrapped or server contexts
    return {
      locale: DEFAULT_LOCALE,
      language: SUPPORTED_LANGUAGES[0],
      dir: 'ltr' as TextDirection,
      languages: SUPPORTED_LANGUAGES,
      setLocale: async () => {},
      t: (path: string, params?: Record<string, string | number>) => {
        let text = getNestedValue(en, path) || path.split('.').pop() || path;
        if (params) {
          Object.entries(params).forEach(([key, val]) => {
            text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
          });
        }
        return text;
      },
      formatCurrency: (amount: number) => formatIndianCurrency(amount, DEFAULT_LOCALE),
      formatNumber: (value: number) => formatIndianNumber(value, DEFAULT_LOCALE),
    };
  }
  return context;
}
