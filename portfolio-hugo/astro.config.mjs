// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

const isProd = process.env.NODE_ENV === 'production' || process.env.CI === 'true';

// https://astro.build/config
export default defineConfig({
  site: 'https://hugoretail.github.io',
  base: isProd ? '/Portfolio' : '/',
  integrations: [svelte(), react()],

  vite: {
    plugins: [tailwindcss()]
  }
});