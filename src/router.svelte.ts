/**
 * Minimal hash router. Routes are plain strings like '/', '/scales', '/practice'.
 */

function parseHash(): string {
  const h = window.location.hash.slice(1)
  return h === '' ? '/' : h
}

let current = $state(parseHash())

window.addEventListener('hashchange', () => {
  current = parseHash()
})

export function currentRoute(): string {
  return current
}

export function navigate(to: string): void {
  window.location.hash = to
}
