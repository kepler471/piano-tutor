/**
 * Prefix a public/-served path with Vite's base URL (guaranteed to end
 * with '/'). Pass paths WITHOUT a leading slash: assetUrl('worklets/x.js').
 * Needed because the app deploys under a subpath (GitHub Pages), so
 * root-absolute '/model/...' URLs would miss. Works in module workers too.
 */
export function assetUrl(path: string): string {
  return import.meta.env.BASE_URL + path
}
