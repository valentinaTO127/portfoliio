import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const page = (file) => fileURLToPath(new URL(file, import.meta.url));

// GitHub Pages serves the site from /portfoliio/, so every asset URL needs that prefix
export default defineConfig({
  base: '/portfoliio/',
  // PORT comes from the preview launcher when 5173 is taken; plain `npm run dev` keeps 5173
  server: {
    port: Number(process.env.PORT) || 5173,
  },
  build: {
    // Multi-page build: without this, only index.html ends up in dist/
    rolldownOptions: {
      input: {
        main: page('./index.html'),
        project: page('./project.html'),
      },
    },
  },
});
