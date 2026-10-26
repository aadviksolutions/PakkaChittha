import { cookies, headers } from 'next/headers';
import {
  COOKIE_LOCALE_KEY,
  DEFAULT_LOCALE,
  isValidLocale,
  getLanguageMeta,
  getDirection,
  formatIndianCurrency,
  formatIndianNumber,
  LanguageMeta,
  TextDirection,
} from './config';
import { getDictionary } from './dictionaries';
import { en } from './dictionaries/en';

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

export async function getServerLocale(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(COOKIE_LOCALE_KEY)?.value;
    if (isValidLocale(cookieLocale)) {
      return cookieLocale!;
    }
  } catch {}

  try {
    const headerStore = await headers();
    const acceptLang = headerStore.get('accept-language');
    if (acceptLang) {
      const primaryLang = acceptLang.split(',')[0]?.split('-')[0]?.toLowerCase();
      if (isValidLocale(primaryLang)) {
        return primaryLang;
      }
    }
  } catch {}

  return DEFAULT_LOCALE;
}

export async function getServerTranslation(customLocale?: string) {
  const locale = customLocale && isValidLocale(customLocale) ? customLocale : await getServerLocale();
  const dictionary = getDictionary(locale);
  const language: LanguageMeta = getLanguageMeta(locale);
  const dir: TextDirection = getDirection(locale);

  const t = (path: string, params?: Record<string, string | number>): string => {
    let text = getNestedValue(dictionary, path);
    if (!text) {
      text = getNestedValue(en, path);
    }
    if (!text) {
      text = path.split('.').pop() || path;
    }
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        text = text!.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
      });
    }
    return text;
  };

  return {
    locale,
    language,
    dir,
    t,
    formatCurrency: (amount: number) => formatIndianCurrency(amount, locale),
    formatNumber: (value: number) => formatIndianNumber(value, locale),
  };
}
