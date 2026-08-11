import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.jonasrech.com',
  integrations: [sitemap()],
  i18n: {
    defaultLocale: 'en',
    locales: ['cs', 'en'],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
});
