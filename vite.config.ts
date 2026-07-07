import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
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
