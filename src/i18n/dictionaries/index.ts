import { TranslationDictionary, en } from './en';
import { hi } from './hi';
import { bn } from './bn';
import { mr } from './mr';
import { ta } from './ta';
import { te } from './te';
import { ur } from './ur';
import { gu } from './gu';
import { kn, ml, pa, or, as, mai, sa, ne, kok, ks, sd, doi, mni, brx, sat } from './indic';

export type { TranslationDictionary };

export const DICTIONARIES: Record<string, TranslationDictionary> = {
  en,
  hi,
  bn,
  mr,
  ta,
  te,
  ur,
  gu,
  kn,
  ml,
  pa,
  or,
  as,
  mai,
  sa,
  ne,
  kok,
  ks,
  sd,
  doi,
  mni,
  brx,
  sat,
};

/**
 * Returns the dictionary for the requested locale code with fallback to English
 */
export function getDictionary(locale: string | null | undefined): TranslationDictionary {
  if (!locale) return en;
  const cleanCode = locale.toLowerCase().trim();
  return DICTIONARIES[cleanCode] || en;
}
