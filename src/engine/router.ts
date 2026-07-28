import { locations } from './content'

// Hash-based deep links (#/loc/<slug>) rather than path routing: GitHub Pages serves
// from a subpath and cannot rewrite arbitrary paths to index.html, but hashes always work.

export function parseHash(hash: string): string | null {
  return hash.match(/^#\/loc\/([\w-]+)/)?.[1] ?? null
}

export function hashForScene(scene: string): string {
  return scene === 'street' ? '#/' : `#/loc/${scene}`
}

export function initialSceneFromHash(): { scene: string; spawnId: string } {
  const slug = parseHash(window.location.hash)
  if (slug && locations[slug]?.interior) return { scene: slug, spawnId: 'entry' }
  return { scene: 'street', spawnId: 'street-entry' }
}
