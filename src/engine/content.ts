import {
  locationManifest,
  streetRegistry,
  type LocationManifest,
  type SpawnDef,
} from './manifest'
import streetJson from '../../content/street.json'

// All manifests are bundled at build time via glob import — no fetches, no absolute
// paths, so the build is GitHub Pages subpath-safe by construction. zod .parse() here
// means a malformed manifest crashes loudly in dev instead of misrendering silently.
const manifestModules = import.meta.glob('/content/locations/*/manifest.json', {
  eager: true,
}) as Record<string, { default: unknown }>

export const locations: Record<string, LocationManifest> = {}
for (const [path, mod] of Object.entries(manifestModules)) {
  const parsed = locationManifest.parse(mod.default)
  const dirSlug = path.match(/locations\/([^/]+)\//)?.[1]
  if (parsed.slug !== dirSlug) {
    throw new Error(`Manifest slug "${parsed.slug}" does not match its folder "${dirSlug}"`)
  }
  locations[parsed.slug] = parsed
}

export const street = streetRegistry.parse(streetJson)

export function getLocation(slug: string): LocationManifest {
  const loc = locations[slug]
  if (!loc) throw new Error(`Unknown location: ${slug}`)
  return loc
}

const DOOR_EXIT_OFFSET = 1.8 // metres outside the door sensor, so exiting can't re-trigger it

// Resolve a named spawn point to world coordinates for the given scene.
// Street spawns: 'street-entry' (street.json) or 'door-<slug>' (just outside that
// building's front door, facing away from it). Interior spawns come from the manifest.
export function resolveSpawn(scene: string, spawnId: string): SpawnDef {
  if (scene === 'street') {
    const slug = spawnId.match(/^door-(.+)$/)?.[1]
    const placement = slug ? street.placements.find((p) => p.slug === slug) : undefined
    const loc = placement && locations[placement.slug]
    if (placement && loc) {
      const rot = (placement.rotationY * Math.PI) / 180
      const [lx, , lz] = loc.exterior.door.position
      const cos = Math.cos(rot)
      const sin = Math.sin(rot)
      // door position and its outward normal (local +Z), rotated into world space
      const wx = placement.position[0] + lx * cos + lz * sin
      const wz = placement.position[1] - lx * sin + lz * cos
      return {
        position: [wx + sin * DOOR_EXIT_OFFSET, 0, wz + cos * DOOR_EXIT_OFFSET],
        yaw: placement.rotationY + 180, // face away from the building
      }
    }
    return street.spawn
  }
  const interior = getLocation(scene).interior
  const spawn = interior?.spawns[spawnId] ?? interior?.spawns['entry']
  if (!spawn) throw new Error(`Location "${scene}" has no interior spawn "${spawnId}"`)
  return spawn
}
