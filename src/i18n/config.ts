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
 * English and all 22 Official Scheduled Languages of the Republic of India
 * (Eighth Schedule of the Constitution of India)
 */
export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    script: 'Latin',
    dir: 'ltr',
    englishSubtext: 'India Standard',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    script: 'Devanagari',
    dir: 'ltr',
    englishSubtext: 'Hindi',
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    script: 'Eastern Nagari (Bengali)',
    dir: 'ltr',
    englishSubtext: 'Bengali',
  },
  {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    script: 'Telugu',
    dir: 'ltr',
    englishSubtext: 'Telugu',
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    script: 'Devanagari',
    dir: 'ltr',
    englishSubtext: 'Marathi',
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    script: 'Tamil',
    dir: 'ltr',
    englishSubtext: 'Tamil',
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    script: 'Perso-Arabic (Nastaliq)',
    dir: 'rtl',
    englishSubtext: 'Urdu (RTL)',
  },
  {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    script: 'Gujarati',
    dir: 'ltr',
    englishSubtext: 'Gujarati',
  },
  {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    script: 'Kannada',
    dir: 'ltr',
    englishSubtext: 'Kannada',
  },
  {
    code: 'or',
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    script: 'Odia',
    dir: 'ltr',
    englishSubtext: 'Odia',
  },
  {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    script: 'Malayalam',
    dir: 'ltr',
    englishSubtext: 'Malayalam',
  },
  {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    script: 'Gurmukhi',
    dir: 'ltr',
    englishSubtext: 'Punjabi',
  },
  {
    code: 'as',
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    script: 'Eastern Nagari (Assamese)',
    dir: 'ltr',
    englishSubtext: 'Assamese',
  },
  {
    code: 'mai',
    name: 'Maithili',
    nativeName: 'मैथिली',
    script: 'Devanagari / Mithilakshar',
    dir: 'ltr',
    englishSubtext: 'Maithili',
  },
  {
    code: 'sa',
    name: 'Sanskrit',
    nativeName: 'संस्कृतम्',
    script: 'Devanagari',
    dir: 'ltr',
    englishSubtext: 'Sanskrit',
  },
  {
    code: 'ks',
    name: 'Kashmiri',
    nativeName: 'कॉशुर / كٲشُر',
    script: 'Perso-Arabic / Devanagari',
    dir: 'rtl',
    englishSubtext: 'Kashmiri',
  },
  {
    code: 'kok',
    name: 'Konkani',
    nativeName: 'कोंकणी',
    script: 'Devanagari',
    dir: 'ltr',
    englishSubtext: 'Konkani',
  },
  {
    code: 'ne',
    name: 'Nepali',
    nativeName: 'नेपाली',
    script: 'Devanagari',
    dir: 'ltr',
    englishSubtext: 'Nepali',
  },
  {
    code: 'sd',
    name: 'Sindhi',
    nativeName: 'सिन्धी / سنڌي',
    script: 'Perso-Arabic / Devanagari',
    dir: 'rtl',
    englishSubtext: 'Sindhi',
  },
  {
    code: 'doi',
    name: 'Dogri',
    nativeName: 'डोगरी',
    script: 'Devanagari',
    dir: 'ltr',
    englishSubtext: 'Dogri',
  },
  {
    code: 'mni',
    name: 'Manipuri (Meitei)',
    nativeName: 'মৈতৈলোন্ / মণিপুরী',
    script: 'Bengali-Assamese / Meetei Mayek',
    dir: 'ltr',
    englishSubtext: 'Manipuri',
  },
  {
    code: 'brx',
    name: 'Bodo',
    nativeName: 'बड़ो',
    script: 'Devanagari',
    dir: 'ltr',
    englishSubtext: 'Bodo',
  },
  {
    code: 'sat',
    name: 'Santali',
    nativeName: 'संताली / ᱥᱟᱱᱛᱟᱲᱤ',
    script: 'Ol Chiki / Devanagari',
    dir: 'ltr',
    englishSubtext: 'Santali',
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
    case 'bn': return 'bn-IN';
    case 'te': return 'te-IN';
    case 'mr': return 'mr-IN';
    case 'ta': return 'ta-IN';
    case 'ur': return 'ur-IN';
    case 'gu': return 'gu-IN';
    case 'kn': return 'kn-IN';
    case 'or': return 'or-IN';
    case 'ml': return 'ml-IN';
    case 'pa': return 'pa-IN';
    case 'as': return 'as-IN';
    case 'mai': return 'mai-IN';
    case 'sa': return 'sa-IN';
    case 'ks': return 'ks-IN';
    case 'kok': return 'kok-IN';
    case 'ne': return 'ne-NP';
    case 'sd': return 'sd-IN';
    case 'doi': return 'doi-IN';
    case 'mni': return 'mni-IN';
    case 'brx': return 'brx-IN';
    case 'sat': return 'sat-IN';
    default: return 'en-IN';
  }
}
