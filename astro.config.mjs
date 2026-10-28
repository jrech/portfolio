// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// Static output; deploy target: Vercel (deployment configured in a later phase).
export default defineConfig({
  site: 'https://www.jonasrech.com',
  integrations: [mdx()],
  // Czech at `/`, English under `/en/`. Geo redirect for first visits: middleware.ts (Vercel).
  i18n: {
    locales: ['cs', 'en'],
    defaultLocale: 'cs',
    routing: { prefixDefaultLocale: false },
  },
  devToolbar: { enabled: false },
});
