import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// 2025-12-10 13:45 CST - restore vitest jsdom config
// 2025-12-10 13:45 CST - restore vitest jsdom config
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_TARGET || env.VITE_API_BASE_URL || 'http://127.0.0.1:8001'
  const assetBase = process.env.VITE_ASSET_BASE || env.VITE_ASSET_BASE || '/'
  const isMobileAssetBuild = assetBase === './'

  // In Docker/build, envDir is '.' so .env created from build-args is used. Local dev uses repo root.
  const envDir = process.env.VITE_ENV_DIR || '../'
  return {
    plugins: [
      react(),
      {
        name: 'mobile-webview-index-fixups',
        transformIndexHtml(html) {
          if (!isMobileAssetBuild) return html
          const sanitized = html.replace(/\s+crossorigin(?=[\s>])/g, '')
          return sanitized.replace(
            /<script type="module" src="([^"]+)"><\/script>/,
            `<script>
              window.__JUALUMA_MOBILE_ENTRY__ = "$1";
              import(window.__JUALUMA_MOBILE_ENTRY__).catch((error) => {
                console.error('JuaLuma mobile entry import failed:', error);
                const root = document.getElementById('root');
                if (!root) return;
                const message = error instanceof Error ? error.message : String(error);
                root.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#050B14;color:#E2E8F0;font-family:system-ui,sans-serif;"><div style="width:min(100%,420px);display:flex;flex-direction:column;gap:16px;"><div style="font-size:20px;font-weight:700;">JuaLuma failed to start.</div><pre style="margin:0;white-space:pre-wrap;word-break:break-word;border-radius:16px;background:rgba(15,23,42,0.9);padding:16px;font-size:12px;line-height:1.5;color:#FCA5A5;">' + message + '</pre></div></div>';
              });
            </script>`,
          )
        },
      },
    ],
    envDir,
    base: assetBase,
    build: {
      // Web keeps a larger consolidated app chunk to avoid the circular vendor
      // split that broke production startup across most routes.
      chunkSizeWarningLimit: isMobileAssetBuild ? 1400 : 950,
      modulePreload: isMobileAssetBuild ? false : { polyfill: true },
      rollupOptions: {
        output: {
          inlineDynamicImports: isMobileAssetBuild,
          // Let Vite/Rollup choose safe shared chunks for the web build.
          // The previous custom vendor split created a circular chunk dependency
          // that left production routes blank outside maintenance mode.
          manualChunks: undefined,
        },
      },
    },
    server: {
      port: 5175,
      host: true,
      allowedHosts: true, // Allow Cloud Run domain
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          xfwd: true,
        }
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
  }
});
