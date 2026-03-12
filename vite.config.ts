import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // УБРАЛ allowedHosts - это и есть решение проблемы
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          workbox: {
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5MB
          },
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
          manifest: {
            name: 'Lumia Quantum Terminal',
            short_name: 'Lumia',
            description: 'Institutional-grade market intelligence terminal',
            theme_color: '#050505',
            background_color: '#050505',
            display: 'standalone',
            icons: [
              {
                src: 'https://picsum.photos/seed/lumia/192/192',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'https://picsum.photos/seed/lumia/512/512',
                sizes: '512x512',
                type: 'image/png'
              }
            ]
          }
        })
      ],

      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});