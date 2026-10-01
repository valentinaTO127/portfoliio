import { defineConfig } from 'vite';

// GitHub Pages serves the site from /portfoliio/, so every asset URL needs that prefix
export default defineConfig({
  base: '/portfoliio/',
});
