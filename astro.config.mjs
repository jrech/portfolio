// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync } from 'node:fs';

/** Slugs of case studies with `status: published` in any locale (unpublished ones are noindex). */
const publishedCases = new Set(
  ['cs', 'en'].flatMap((locale) => {
    const dir = new URL(`./src/content/projects/${locale}/`, import.meta.url);
    return readdirSync(dir)
      .filter((file) => /^status:\s*published\s*$/m.test(readFileSync(new URL(file, dir), 'utf8')))
      .map((file) => file.replace(/\.mdx?$/, ''));
  }),
);

// Static output, deployed on Vercel (www.jonasrech.com).
export default defineConfig({
  site: 'https://www.jonasrech.com',
  // Unpublished case studies (noindex) stay out of the sitemap; published ones go in.
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => {
        const slug = page.match(/\/work\/([^/]+)\/?$/)?.[1];
        return !/\/work\//.test(page) || (slug !== undefined && publishedCases.has(slug));
      },
    }),
  ],
  // Czech at `/`, English under `/en/`. Geo redirect for first visits: middleware.ts (Vercel).
  i18n: {
    locales: ['cs', 'en'],
    defaultLocale: 'cs',
    routing: { prefixDefaultLocale: false },
  },
  // Every <Image> asks for quality={100}; the service also keeps lossless sources lossless.
  image: { service: { entrypoint: './src/lib/image-service.ts' } },
  devToolbar: { enabled: false },
});
