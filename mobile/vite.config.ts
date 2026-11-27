import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Local-first iOS bundle: built into mobile/dist and copied into the app by `npx cap sync ios`.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'safari16',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  server: { port: 5174 },
});
