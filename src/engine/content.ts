import { z } from 'zod'
import {
  characterManifest,
  episodeManifest,
  locationManifest,
  streetRegistry,
  type CharacterManifest,
  type EpisodeManifest,
  type LocationManifest,
} from './manifest'
import streetJson from '../../content/street.json'
import tipsJson from '../../content/tips.json'

// All content is bundled at build time via glob imports — no fetches, no absolute
// paths, so the build stays GitHub Pages subpath-safe by construction. zod .parse()
// here means malformed content crashes loudly in dev instead of misrendering silently.

function loadRegistry<T extends { slug: string }>(
  modules: Record<string, { default: unknown }>,
  schema: z.ZodType<T>,
  kind: string
): Record<string, T> {
  const registry: Record<string, T> = {}
  for (const [path, mod] of Object.entries(modules)) {
    const parsed = schema.parse(mod.default)
    const dirSlug = path.match(/\/([^/]+)\/manifest\.json$/)?.[1]
    if (parsed.slug !== dirSlug) {
      throw new Error(`${kind} manifest slug "${parsed.slug}" does not match its folder "${dirSlug}"`)
    }
    registry[parsed.slug] = parsed
  }
  return registry
}

export const locations = loadRegistry<LocationManifest>(
  import.meta.glob('/content/locations/*/manifest.json', { eager: true }) as Record<string, { default: unknown }>,
  locationManifest,
  'Location'
)

export const characters = loadRegistry<CharacterManifest>(
  import.meta.glob('/content/characters/*/manifest.json', { eager: true }) as Record<string, { default: unknown }>,
  characterManifest,
  'Character'
)

export const episodes = loadRegistry<EpisodeManifest>(
  import.meta.glob('/content/episodes/*/manifest.json', { eager: true }) as Record<string, { default: unknown }>,
  episodeManifest,
  'Episode'
)

export const street = streetRegistry.parse(streetJson)

// Loading/boot-screen tips (markdown-ish inline **bold** allowed) — content, not code.
export const tips = z.array(z.string().min(1)).parse(tipsJson)

// ── Cross-reference validation: fail loudly at load, not weirdly at runtime ──

for (const p of street.placements) {
  if (!locations[p.slug]) throw new Error(`street.json places unknown location "${p.slug}"`)
}
for (const c of Object.values(characters)) {
  if (!street.placements.some((p) => p.slug === c.at.location)) {
    throw new Error(`Character "${c.slug}" stands at "${c.at.location}", which is not placed on the street`)
  }
}
for (const e of Object.values(episodes)) {
  for (const stop of e.route) {
    if (!street.placements.some((p) => p.slug === stop.location)) {
      throw new Error(`Episode "${e.slug}" routes through "${stop.location}", which is not placed on the street`)
    }
  }
}

export function getLocation(slug: string): LocationManifest {
  const loc = locations[slug]
  if (!loc) throw new Error(`Unknown location: ${slug}`)
  return loc
}

export function getPlacement(slug: string) {
  const placement = street.placements.find((p) => p.slug === slug)
  if (!placement) throw new Error(`Location "${slug}" is not placed on the street`)
  return placement
}
