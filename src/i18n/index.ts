/**
 * CZ is the default locale at `/`, EN lives under `/en/` (astro.config.mjs → i18n).
 * Every string a visitor reads goes through these dictionaries; cs.json mirrors en.json key for key.
 */
import cs from './cs.json';
import en from './en.json';

export const locales = ['cs', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'cs';

export type Dict = typeof en;

/**
 * Czech typography: one-letter prepositions and conjunctions (v, k, s, z, o, u, a, i)
 * must not end a line, so they get a non-breaking space to the next word.
 */
export const bindSingleLetters = <T>(value: T): T => {
  if (typeof value === 'string')
    return value.replace(/(?<=^|[\s(„])([kvszouiaKVSZOUIA]) /g, '$1\u00A0') as T;
  if (Array.isArray(value)) return value.map(bindSingleLetters) as T;
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, bindSingleLetters(v)])) as T;
  return value;
};

const dicts: Record<Locale, Dict> = { cs: bindSingleLetters(cs), en };


/** `<html lang>` value and the label the language switch shows. */
export const localeMeta: Record<Locale, { htmlLang: string; label: string }> = {
  cs: { htmlLang: 'cs', label: 'CZ' },
  en: { htmlLang: 'en', label: 'EN' },
};

export const getLocale = (astro: { currentLocale?: string }): Locale =>
  astro.currentLocale === 'en' ? 'en' : 'cs';

export const useT = (astro: { currentLocale?: string }) => dicts[getLocale(astro)];

/** Prefix a root-relative path ("/", "/#work", "/work/x") for the locale. */
export function localePath(locale: Locale, path: string): string {
  if (locale === defaultLocale) return path;
  return path === '/' ? '/en/' : `/en${path.startsWith('/') ? path : `/${path}`}`;
}

/** The same page in the other locale, from the current pathname. */
export function switchLocalePath(pathname: string, to: Locale): string {
  const bare = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  return localePath(to, bare);
}
