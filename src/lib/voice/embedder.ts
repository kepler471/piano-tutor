/**
 * Lazy singleton around the transformers.js feature-extraction pipeline
 * (quantized all-MiniLM-L6-v2 on the WASM backend). Fully offline: model
 * files come from public/model-minilm and the onnxruntime WASM runtime from
 * public/ort-wasm — nothing is fetched from HF hub or jsDelivr. Dynamically
 * imported by voice.svelte.ts so none of this lands in the main bundle.
 */

export interface Embedder {
  embed(texts: string[]): Promise<Float32Array[]>
}

let instance: Promise<Embedder> | null = null

export function getEmbedder(): Promise<Embedder> {
  return (instance ??= create())
}

async function create(): Promise<Embedder> {
  const { pipeline, env } = await import('@huggingface/transformers')
  env.allowRemoteModels = false
  env.allowLocalModels = true // browser builds default this to false
  env.localModelPath = '/model-minilm/'
  env.useBrowserCache = true
  // Must be set AFTER import: transformers.js defaults this to a CDN path.
  // ORT appends its own filename choice (plain vs .asyncify pair — all four
  // files are vendored). In dev, public/ files can't be import()ed as modules
  // (Vite forbids it), so the runtime is served from node_modules instead.
  if (env.backends.onnx.wasm) {
    env.backends.onnx.wasm.wasmPaths = import.meta.env.DEV
      ? '/node_modules/onnxruntime-web/dist/'
      : '/ort-wasm/'
  }

  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    dtype: 'q8',
    device: 'wasm',
  })

  return {
    async embed(texts: string[]): Promise<Float32Array[]> {
      const out = await extractor(texts, { pooling: 'mean', normalize: true })
      const [n, dim] = out.dims as [number, number]
      const data = out.data as Float32Array
      return Array.from({ length: n }, (_, i) => data.slice(i * dim, (i + 1) * dim))
    },
  }
}
