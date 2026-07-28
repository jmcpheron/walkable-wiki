import { z } from 'zod'
import {
  characterManifest,
  episodeManifest,
  locationManifest,
  schemeColors,
  streetRegistry,
  type CharacterManifest,
  type EpisodeManifest,
  type LocationManifest,
  type SchemeColors,
} from './manifest'
import streetJson from '../../content/street.json'
import tipsJson from '../../content/tips.json'
import schemesJson from '../../content/schemes.json'

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

// Named building color schemes — content, not code.
export const schemes: Record<string, SchemeColors> = z
  .record(z.string(), schemeColors)
  .parse(schemesJson)

// Loading/boot-screen tips (markdown-ish inline **bold** allowed) — content, not code.
export const tips = z.array(z.string().min(1)).parse(tipsJson)

// ── Cross-reference validation: fail loudly at load, not weirdly at runtime ──

for (const p of street.placements) {
  if (!locations[p.slug]) throw new Error(`street.json places unknown location "${p.slug}"`)
}
for (const loc of Object.values(locations)) {
  if (!schemes[loc.exterior.scheme]) {
    throw new Error(`Location "${loc.slug}" uses unknown color scheme "${loc.exterior.scheme}"`)
  }
  if (loc.interior) {
    const ids = new Set<string>()
    for (const room of loc.interior.rooms) {
      if (ids.has(room.id)) throw new Error(`Location "${loc.slug}" has duplicate room id "${room.id}"`)
      ids.add(room.id)
    }
    for (const room of loc.interior.rooms) {
      for (const door of room.doors) {
        if (door.to !== 'street' && !ids.has(door.to)) {
          throw new Error(`Location "${loc.slug}" room "${room.id}" has a door to unknown room "${door.to}"`)
        }
      }
      for (const prop of room.props) {
        if (prop.at[0] > room.size[0] || prop.at[1] > room.size[1]) {
          console.warn(`[content] "${loc.slug}" room "${room.id}": ${prop.type} at [${prop.at}] is outside the ${room.size[0]}x${room.size[1]} room`)
        }
      }
    }
  }
}
for (const c of Object.values(characters)) {
  if (!street.placements.some((p) => p.slug === c.at.location)) {
    throw new Error(`Character "${c.slug}" stands at "${c.at.location}", which is not placed on the street`)
  }
}
for (const e of Object.values(episodes)) {
  for (const [i, scene] of e.scenes.entries()) {
    if (!street.placements.some((p) => p.slug === scene.location)) {
      throw new Error(`Episode "${e.slug}" scene ${i + 1} is at "${scene.location}", which is not placed on the street`)
    }
    for (const slug of scene.characters) {
      if (!characters[slug]) {
        console.warn(`[content] episode "${e.slug}" scene ${i + 1} casts unknown character "${slug}" — rendering generic`)
      }
    }
    if (scene.interior) {
      const rooms = locations[scene.location]?.interior?.rooms
      if (!rooms?.some((r) => r.id === scene.interior)) {
        console.warn(`[content] episode "${e.slug}" scene ${i + 1} references unknown room "${scene.interior}" in "${scene.location}"`)
      }
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
