export type TextDirection = 'ltr' | 'rtl';

export interface LanguageMeta {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  dir: TextDirection;
  englishSubtext?: string;
  region?: string;
}

export const COOKIE_LOCALE_KEY = 'pc_locale';
export const DEFAULT_LOCALE = 'en';

/**
 * PakkaChittha Supported Languages: Strictly English and Hindi (हिन्दी)
 */
export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    script: 'Latin',
    dir: 'ltr',
    englishSubtext: 'English',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    script: 'Devanagari',
    dir: 'ltr',
    englishSubtext: 'Hindi',
  },
];

export const SUPPORTED_LOCALE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

export function isValidLocale(code: string | null | undefined): boolean {
  if (!code) return false;
  return SUPPORTED_LOCALE_CODES.includes(code.toLowerCase());
}

export function getLanguageMeta(code: string | null | undefined): LanguageMeta {
  if (!code) return SUPPORTED_LANGUAGES[0];
  const matched = SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase() === code.toLowerCase());
  return matched || SUPPORTED_LANGUAGES[0];
}

export function getDirection(code: string | null | undefined): TextDirection {
  return getLanguageMeta(code).dir;
}

export function isRtlLocale(code: string | null | undefined): boolean {
  return getDirection(code) === 'rtl';
}

/**
 * Format currency with Indian Rupee formatting standard
 */
export function formatIndianCurrency(amount: number, localeCode: string = 'en'): string {
  try {
    const intlLocale = getIntlLocale(localeCode);
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }
}

/**
 * Format numbers according to the Indian numbering system (Lakhs, Crores)
 */
export function formatIndianNumber(value: number, localeCode: string = 'en'): string {
  try {
    const intlLocale = getIntlLocale(localeCode);
    return new Intl.NumberFormat(intlLocale, {
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toLocaleString('en-IN');
  }
}

/**
 * Maps local language code to standard BCP-47 locale code for Intl formatters
 */
export function getIntlLocale(code: string): string {
  switch (code) {
    case 'hi': return 'hi-IN';
    default: return 'en-IN';
  }
}
