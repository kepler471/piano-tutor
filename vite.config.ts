import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Deployed to GitHub Pages at https://kepler471.github.io/piano-tutor/.
  // Unconditional so dev/preview serve the same subpath — a missed
  // root-absolute asset path 404s immediately instead of only in prod.
  // Source code prefixes public/ URLs via src/lib/assetUrl.ts.
  base: '/piano-tutor/',
  plugins: [
    svelte(),
    // Installable + offline-capable. The app shell is precached; the big model
    // and WASM assets (~70 MB total) are runtime-cached on first use instead —
    // precaching them would download everything up front. The Vosk archive is
    // deliberately NOT service-worker-cached: modelLoader.ts already streams it
    // into its own Cache with a progress bar, and an SW route would both
    // double-store 41 MB and break that progress UI. model-minilm is likewise
    // left to transformers.js's own Cache-API caching.
    VitePWA({
      registerType: 'autoUpdate',
      // Dev serves ort-wasm from node_modules (see embedder.ts) — a dev SW
      // would interfere; keep it prod-only.
      devOptions: { enabled: false },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Piano Tutor',
        short_name: 'Piano Tutor',
        description:
          'Practice companion for your piano — it listens through the microphone (or MIDI) and the score waits for you.',
        display: 'standalone',
        // No explicit start_url/scope: vite-plugin-pwa defaults both to the
        // Vite base, and an explicit value here would override that.
        background_color: '#f8fafc',
        theme_color: '#1d4ed8',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        globIgnores: [
          'model/**',
          'model-vosk/**',
          'model-minilm/**',
          'tfjs-wasm/**',
          'ort-wasm/**',
          'worklets/**',
          // The lazy vosk chunk is ~6 MB — too big to precache on every first
          // visit; the assets runtime route below picks it up on first use.
          'assets/vosk-*.js',
        ],
        // Model/WASM dirs are only re-copied on package upgrades; bump this
        // cache name when re-copying them (see CLAUDE.md "Static assets").
        // ⚠️ workbox inlines these urlPattern functions into the generated SW
        // via .toString() — they must stay closure-free (no captured
        // variables, e.g. the base path), hence the base-agnostic matching.
        runtimeCaching: [
          {
            // Hash-named build assets skipped by the precache (the vosk
            // chunk) — immutable, so cache-first is safe.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.includes('/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'piano-tutor.sw-assets',
              expiration: { maxEntries: 20 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Trailing slash keeps model-vosk/ and model-minilm/ excluded
            // (they self-cache; see the plugin comment above).
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && /\/(model|tfjs-wasm|ort-wasm|worklets)\//.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'piano-tutor.sw-static',
              expiration: { maxEntries: 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Salamander piano samples (Tone.js) so demo playback works offline.
            urlPattern: ({ url }) => url.hostname === 'tonejs.github.io' && url.pathname.includes('/audio/salamander/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'piano-tutor.sw-samples',
              expiration: { maxEntries: 40 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    // Pre-bundling breaks transformers.js's import.meta.url-based WASM loading.
    exclude: ['@huggingface/transformers'],
    // Deps first imported inside workers / dynamic imports aren't discovered on
    // server start; without this, first use triggers a re-optimize + full page
    // reload (e.g. the chord model worker appearing to hang).
    include: ['@tensorflow/tfjs', '@tensorflow/tfjs-backend-wasm', '@spotify/basic-pitch', 'vosk-browser'],
  },
})
