/**
 * The SW runtime cache for the public/ model/WASM dirs is named after a
 * content hash of those dirs (see staticAssetsRevision in vite.config.ts),
 * so re-copied assets land in a fresh cache. workbox generateSW has no hook
 * for cleaning up renamed runtime caches, so the app deletes the outdated
 * generations itself at startup. Also matches the pre-hash cache name
 * ('piano-tutor.sw-static', no suffix) from early deploys.
 */
export function cleanupOutdatedStaticCaches(): void {
  if (typeof caches === 'undefined') return
  void caches
    .keys()
    .then((names) =>
      Promise.all(
        names
          .filter((n) => n.startsWith('piano-tutor.sw-static') && n !== __SW_STATIC_CACHE__)
          .map((n) => caches.delete(n)),
      ),
    )
    .catch(() => {
      // Storage errors (private browsing, etc.) — stale caches are only a
      // disk-space concern, never a correctness one.
    })
}
