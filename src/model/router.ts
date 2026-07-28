import { characters, episodes, locations } from './content'
import type { Selection, SelectionKind } from './store'

// Hash-based deep links (#/loc|char|ep/<slug>) rather than path routing: GitHub Pages
// serves from a subpath and cannot rewrite arbitrary paths to index.html.

const PREFIXES: Record<string, SelectionKind> = {
  loc: 'location',
  char: 'character',
  ep: 'episode',
}

export function parseHash(hash: string): Selection {
  const m = hash.match(/^#\/(loc|char|ep)\/([\w-]+)/)
  if (!m) return null
  return { kind: PREFIXES[m[1]], slug: m[2] }
}

export function hashFor(selection: Selection): string {
  if (!selection) return '#/'
  const prefix = selection.kind === 'location' ? 'loc' : selection.kind === 'character' ? 'char' : 'ep'
  return `#/${prefix}/${selection.slug}`
}

// #/retro/<slug> switches to the vignette renderer for that episode.
export function parseRetroHash(hash: string): string | null {
  return hash.match(/^#\/retro\/([\w-]+)/)?.[1] ?? null
}

export function initialRouteFromHash(): Selection {
  const route = parseHash(window.location.hash)
  if (!route) return null
  const registry =
    route.kind === 'location' ? locations : route.kind === 'character' ? characters : episodes
  return registry[route.slug] ? route : null
}
