import { buildHash, parseRoute } from './lib/routing'

/**
 * Minimal hash router. Routes are plain strings like '/', '/scales', '/practice',
 * optionally followed by a query string: '#/practice?lesson=scale-C-major'.
 * currentRoute() always returns the bare path so exact-match checks keep working.
 * Pure parsing/building lives in src/lib/routing.ts.
 */

let current = $state(parseRoute(window.location.hash))

window.addEventListener('hashchange', () => {
  current = parseRoute(window.location.hash)
})

export function currentRoute(): string {
  return current.path
}

export function currentParams(): Readonly<Record<string, string>> {
  return current.params
}

export function navigate(to: string, params?: Record<string, string>): void {
  window.location.hash = buildHash(to, params)
}
