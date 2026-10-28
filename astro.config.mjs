// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// Static output; deploy target: Vercel (deployment configured in a later phase).
export default defineConfig({
  site: 'https://jonasrech.com',
  integrations: [mdx()],
  devToolbar: { enabled: false },
});
