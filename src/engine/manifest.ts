import { z } from 'zod'

// The location-manifest shape is the project's most important API: contributors add
// buildings by writing these JSON files, never by touching engine code. M1 validates
// with zod at load time; M2 formalizes this as JSON Schema + a CI check (see schemas/).

export const vec3 = z.tuple([z.number(), z.number(), z.number()])
export type Vec3 = z.infer<typeof vec3>

export const wikiContent = z.object({
  title: z.string(),
  // Markdown-ish: blank-line paragraphs, "## " headings, "- " lists, **bold**
  body: z.string(),
})
export type WikiContent = z.infer<typeof wikiContent>

// yaw is in degrees; 0 faces -Z (the three.js camera default), 180 faces +Z
export const spawnDef = z.object({ position: vec3, yaw: z.number() })
export type SpawnDef = z.infer<typeof spawnDef>

// A door either travels somewhere (`target`) or opens a wiki panel (`wiki`) —
// exterior-only buildings use the latter as a "coming soon" placeholder.
export const doorDef = z.object({
  id: z.string(),
  position: vec3, // local to the location; y = floor level at the door's center
  label: z.string().optional(),
  target: z
    .object({
      scene: z.string(), // 'street' or a location slug
      spawn: z.string(), // spawn id in the target scene
    })
    .optional(),
  wiki: wikiContent.optional(),
})
export type DoorDef = z.infer<typeof doorDef>

export const hotspotDef = z.object({
  id: z.string(),
  position: vec3,
  wiki: wikiContent,
})
export type HotspotDef = z.infer<typeof hotspotDef>

export const locationManifest = z.object({
  slug: z.string(),
  name: z.string(),
  wiki: wikiContent,
  exterior: z.object({
    footprint: vec3, // [width, depth, height] of the graybox exterior
    color: z.string(),
    door: doorDef, // on the front (+Z) face in local space
  }),
  interior: z
    .object({
      size: vec3, // [width, depth, height] of the room
      color: z.string(),
      spawns: z.record(z.string(), spawnDef), // must include 'entry'
      doors: z.array(doorDef),
      hotspots: z.array(hotspotDef),
    })
    .optional(),
})
export type LocationManifest = z.infer<typeof locationManifest>

export const streetRegistry = z.object({
  spawn: spawnDef, // where first-time visitors appear
  placements: z.array(
    z.object({
      slug: z.string(),
      position: z.tuple([z.number(), z.number()]), // world [x, z]; buildings face +Z at rotationY 0
      rotationY: z.number(), // degrees
    })
  ),
})
export type StreetRegistry = z.infer<typeof streetRegistry>
