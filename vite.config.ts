import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// בפריסה ל-GitHub Pages (project page) האפליקציה יושבת תחת נתיב-משנה
// כמו /mymenu/ במקום השורש. ה-workflow מגדיר GH_PAGES=true בזמן build
// כדי ש-base/start_url/scope יתאימו לנתיב הזה; בפיתוח/build מקומי base='/'.
const repoBase = process.env.GH_PAGES ? '/mymenu/' : '/';

// https://vite.dev/config/
export default defineConfig({
  base: repoBase,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon.svg',
        'icons/apple-touch-icon.png',
        'favicon-32.png',
      ],
      manifest: {
        name: 'MyMenu',
        short_name: 'MyMenu',
        description: 'תכנון ורישום תפריט יומי',
        dir: 'rtl',
        lang: 'he',
        theme_color: '#5B9BD5',
        background_color: '#FAFBFC',
        display: 'standalone',
        start_url: repoBase,
        scope: repoBase,
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
