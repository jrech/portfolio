export const locales = ['cs', 'en'] as const;
export type Locale = (typeof locales)[number];

export function getLocale(currentLocale?: string): Locale {
  return currentLocale === 'en' ? 'en' : 'cs';
}

export function translator(currentLocale?: string) {
  return (cs: string, en: string) => getLocale(currentLocale) === 'en' ? en : cs;
}

/** Čeština bez prefixu (/, /work/…), angličtina pod /en/. Staré /cs/… přesměrovává vercel.json. */
export function localeLinks(pathname: string) {
  const path = pathname.replace(/^\/(?:cs|en)(?=\/|$)/, '').replace(/^\/|\/$/g, '');
  const suffix = path ? path + '/' : '';
  return { cs: '/' + suffix, en: '/en/' + suffix };
}

/** Je to úvodní stránka (/ nebo /en/)? */
export const isHome = (pathname: string) => /^\/(?:en\/?)?$/.test(pathname);
