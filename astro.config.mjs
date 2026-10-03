// @ts-check
import { defineConfig } from 'astro/config';

import { unified } from '@astrojs/markdown-remark';
import remarkGithubAlerts from 'remark-github-alerts';

import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://danmanners.com',
  trailingSlash: 'always',
  integrations: [sitemap()],

  markdown: {
    processor: unified({
      // Match Sätteri's default (off) so switching processors doesn't change typography.
      smartypants: false,
      remarkPlugins: [remarkGithubAlerts],
    }),
  },

  vite: {
    plugins: [tailwindcss()],
  },

  build: {
    inlineStylesheets: 'auto',
  },
});
