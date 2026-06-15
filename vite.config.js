import { defineConfig } from 'vite';

// Config base do scaffold (M0). `base: './'` facilita deploy estático
// (GitHub Pages/Netlify/Vercel) sem assumir a raiz do domínio.
export default defineConfig({
  base: './',
  server: {
    open: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
});
