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
  },
})
