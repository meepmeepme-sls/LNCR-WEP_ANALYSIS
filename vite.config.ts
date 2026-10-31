import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './', // relative base so it works on any domain/subpath or Cloudflare Pages
  server: {
    port: 5173
  }
});
