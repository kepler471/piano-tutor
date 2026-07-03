/**
 * Downloads the Vosk model archive with determinate progress and caches it in
 * the Cache API (survives HTTP-cache eviction; the ~41 MB download happens
 * once). Returns an object URL that vosk-browser's worker can fetch.
 */

export const MODEL_URL = '/model-vosk/vosk-model-small-en-us-0.15.tar.gz'
const CACHE_NAME = 'piano-tutor.vosk-model'

export async function loadModelArchive(
  onProgress: (fraction: number | null) => void,
): Promise<string> {
  let cache: Cache | null = null
  try {
    cache = await caches.open(CACHE_NAME)
    const hit = await cache.match(MODEL_URL)
    if (hit) {
      onProgress(1)
      return URL.createObjectURL(await hit.blob())
    }
  } catch {
    // Cache API unavailable (e.g. some private modes) — plain fetch below.
  }

  const res = await fetch(MODEL_URL)
  if (!res.ok) throw new Error(`Model download failed: HTTP ${res.status}`)

  const total = Number(res.headers.get('Content-Length')) || 0
  const reader = res.body?.getReader()
  if (!reader) {
    const blob = await res.blob()
    onProgress(1)
    return URL.createObjectURL(blob)
  }

  const chunks: Uint8Array[] = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    onProgress(total ? Math.min(received / total, 1) : null)
  }
  const blob = new Blob(chunks as BlobPart[], { type: 'application/gzip' })
  // Cache only complete downloads.
  try {
    await cache?.put(MODEL_URL, new Response(blob, { headers: { 'Content-Type': 'application/gzip' } }))
  } catch {
    // Best-effort; quota errors just mean a re-download next visit.
  }
  onProgress(1)
  return URL.createObjectURL(blob)
}
