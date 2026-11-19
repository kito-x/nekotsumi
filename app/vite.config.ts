import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  appType: 'mpa',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0
  },
  server: {
    host: '127.0.0.1',
    port: 5177,
    strictPort: true
  },
  preview: {
    host: '127.0.0.1',
    port: 4177,
    strictPort: true
  }
});
