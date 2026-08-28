import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist/site',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
