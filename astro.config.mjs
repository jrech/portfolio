// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Statický web na Vercelu (www.jonasrech.com). Formulář: Vercel funkce api/contact.ts,
// jazykové přesměrování: middleware.ts, staré adresy: vercel.json.
export default defineConfig({
  site: 'https://www.jonasrech.com',
  trailingSlash: 'ignore',
  // Čeština v kořeni (/, /work/…), angličtina pod /en/ – stejně jako na předchozím webu.
  i18n: {
    defaultLocale: 'cs',
    locales: ['cs', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  // 404 stránky do sitemapy nepatří.
  integrations: [
    sitemap({
      filter: (page) => !/\/404\/?$/.test(page),
      // cs/en varianty jako xhtml:link alternates (stejné páry jako hreflang v <head>)
      i18n: { defaultLocale: 'cs', locales: { cs: 'cs', en: 'en' } },
    }),
  ],
  build: { inlineStylesheets: 'auto' },
  devToolbar: { enabled: false },
});
