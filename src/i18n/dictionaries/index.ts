import { TranslationDictionary, en } from './en';
import { hi } from './hi';

export type { TranslationDictionary };

export const DICTIONARIES: Record<string, TranslationDictionary> = {
  en,
  hi,
};

/**
 * Returns the dictionary for the requested locale code with fallback to English
 */
export function getDictionary(locale: string | null | undefined): TranslationDictionary {
  if (!locale) return en;
  const cleanCode = locale.toLowerCase().trim();
  return DICTIONARIES[cleanCode] || en;
}
