import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './', // Relative base for universal deployment on Cloudflare Pages or any subpath
  server: {
    port: 5173,
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('three')) {
            return 'three-core';
          }
          if (id.includes('lucide-react') || id.includes('canvas-confetti')) {
            return 'ui-vendor';
          }
        },
      },
    },
  },
});
