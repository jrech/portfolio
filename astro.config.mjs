// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// Static output, deployed on Vercel (www.jonasrech.com).
export default defineConfig({
  site: 'https://www.jonasrech.com',
  // Case studies stay out of the sitemap while they are unpublished (noindex).
  integrations: [mdx(), sitemap({ filter: (page) => !/\/work\//.test(page) })],
  // Czech at `/`, English under `/en/`. Geo redirect for first visits: middleware.ts (Vercel).
  i18n: {
    locales: ['cs', 'en'],
    defaultLocale: 'cs',
    routing: { prefixDefaultLocale: false },
  },
  devToolbar: { enabled: false },
});
