/**
 * Pure hash-route helpers shared by the reactive router (src/router.svelte.ts)
 * and the learning guide's link builder. No DOM/Svelte imports so vitest
 * covers them directly.
 */

export interface ParsedRoute {
  path: string
  params: Readonly<Record<string, string>>
}

/** Hash → {path, params}; accepts with or without the leading '#'. */
export function parseRoute(hash: string): ParsedRoute {
  const h = hash.startsWith('#') ? hash.slice(1) : hash
  const qIndex = h.indexOf('?')
  const rawPath = qIndex === -1 ? h : h.slice(0, qIndex)
  const query = qIndex === -1 ? '' : h.slice(qIndex + 1)
  const path = rawPath === '' ? '/' : rawPath
  const params: Record<string, string> = {}
  for (const pair of query.split('&')) {
    if (!pair) continue
    const eq = pair.indexOf('=')
    const key = eq === -1 ? pair : pair.slice(0, eq)
    const value = eq === -1 ? '' : pair.slice(eq + 1)
    params[decodeURIComponent(key)] = decodeURIComponent(value)
  }
  return { path, params }
}

/** {path, params} → hash string (no leading '#'). */
export function buildHash(path: string, params?: Record<string, string>): string {
  const entries = Object.entries(params ?? {})
  if (entries.length === 0) return path
  const query = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  return `${path}?${query}`
}
