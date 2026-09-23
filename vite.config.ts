import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Custom Vite Plugin to gracefully intercept and handle WebSocket closed / disconnect
 * notifications in sandboxed container and cloud proxy environments.
 */
function viteHmrErrorSuppressor(): Plugin {
  return {
    name: 'vite-hmr-error-suppressor',
    transformIndexHtml(html) {
      const script = `
        <script>
          (function() {
            if (typeof window === 'undefined') return;
            // Intercept unhandled WebSocket errors from Vite dev client early
            window.addEventListener('error', function(e) {
              if (e && e.message && (
                e.message.indexOf('WebSocket') !== -1 ||
                e.message.indexOf('websocket') !== -1 ||
                e.message.indexOf('closed without opened') !== -1
              )) {
                e.preventDefault && e.preventDefault();
                e.stopPropagation && e.stopPropagation();
                window.dispatchEvent(new CustomEvent('ws-error-detected', { detail: { message: e.message } }));
              }
            }, true);
          })();
        </script>
      `;
      return html.replace('<head>', '<head>' + script);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      viteHmrErrorSuppressor(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'New Sajjad Zari Corporation',
          short_name: 'Sajjad Zari',
          description: 'Offline-first Retail POS, Inventory, Khata Ledger & Thermal Printing System',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              // Google Fonts Stylesheets (Plus Jakarta Sans, Noto Nastaliq Urdu, JetBrains Mono)
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Google Fonts Webfonts
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Static Images and Media Assets
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'static-images-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Static CSS & JS Assets
              urlPattern: /\.(?:js|css)$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'static-resources-cache',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'recharts', 'lucide-react', 'canvas-confetti'],
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      hmr: {
        clientPort: 443,
      },
      watch: {
        ignored: ['**/dist/**', '**/.git/**', '**/node_modules/**', '**/*.log', '**/tmp/**'],
      },
    },
  };
});
