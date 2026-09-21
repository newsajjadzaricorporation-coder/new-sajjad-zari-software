import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

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
