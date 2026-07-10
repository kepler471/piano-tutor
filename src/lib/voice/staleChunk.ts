/**
 * Detects a failed dynamic import() of a hash-named build chunk. This happens
 * on GitHub Pages when a deploy replaces the hashed assets while a client is
 * still running the previous app shell (served from the SW precache): the
 * vosk chunk is excluded from the precache (vite.config.ts globIgnores), so
 * its first use after a deploy 404s. Browsers phrase the TypeError
 * differently:
 *   Chrome:  "Failed to fetch dynamically imported module: …"
 *   Firefox: "error loading dynamically imported module: …"
 *   Safari:  "Importing a module script failed."
 */
export function isStaleChunkError(err: unknown): boolean {
  return (
    err instanceof TypeError &&
    /dynamically imported module|module script failed/i.test(err.message)
  )
}
