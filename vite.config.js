import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`         -> dist/ (normal multi-file static site, code-split)
// `npm run build:single`  -> dist-single/index.html (everything inlined; handy for sharing one file)
export default defineConfig(({ mode }) => ({
  base: './',
  build: {
    target: 'es2020',
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 900,
  },
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  server: { host: true },
}));
