import { z } from 'zod'

// The manifest shapes are the project's most important API: contributors add
// buildings, characters, and episodes by writing these JSON files, never by touching
// engine code. All content is zod-validated loudly at load time (see content.ts).

export const wikiContent = z.object({
  title: z.string(),
  // Markdown-ish: blank-line paragraphs, "## " headings, "- " lists, **bold**
  body: z.string(),
})
export type WikiContent = z.infer<typeof wikiContent>

// ── Locations ────────────────────────────────────────────────────────────────

export const buildingPalette = z.object({
  wall: z.string(),
  trim: z.string(),
  roof: z.string(),
  door: z.string(),
  sign: z.string(),
  window: z.string().default('#9fc3d9'),
  awning: z.string().optional(),
})
export type BuildingPalette = z.infer<typeof buildingPalette>

export const exteriorDef = z.object({
  // [width, depth, height] in voxels (1 voxel = 0.5 world units)
  size: z.tuple([z.number().int().min(4), z.number().int().min(4), z.number().int().min(6)]),
  palette: buildingPalette,
  signText: z.string().optional(), // defaults to the location name
  windows: z.object({ rows: z.number().int().min(0), cols: z.number().int().min(0) }).optional(),
  awning: z.boolean().default(false),
  door: z
    .object({
      offsetX: z.number().int().default(0), // voxels from front-face center
      width: z.number().int().min(1).default(2),
    })
    .prefault({}),
})
export type ExteriorDef = z.infer<typeof exteriorDef>

export const locationManifest = z.object({
  slug: z.string(),
  name: z.string(),
  wiki: wikiContent,
  exterior: exteriorDef,
})
export type LocationManifest = z.infer<typeof locationManifest>

export const streetRegistry = z.object({
  placements: z.array(
    z.object({
      slug: z.string(),
      position: z.tuple([z.number(), z.number()]), // world [x, z]
      rotationY: z.number(), // degrees; 0 = storefront faces +Z, 180 = faces -Z
    })
  ),
})
export type StreetRegistry = z.infer<typeof streetRegistry>

// ── Characters ───────────────────────────────────────────────────────────────

export const characterManifest = z.object({
  slug: z.string(),
  name: z.string(),
  wiki: wikiContent,
  appearance: z.object({
    palette: z.object({
      skin: z.string(),
      top: z.string(),
      bottom: z.string(),
      hair: z.string(),
      hat: z.string().optional(),
    }),
    heightVoxels: z.number().default(4), // adults ~4, kids ~3
  }),
  at: z.object({
    location: z.string(), // placement slug this character stands near
    offset: z.tuple([z.number(), z.number()]).prefault([0, 0]), // world units [along-front, out-from-front]
  }),
})
export type CharacterManifest = z.infer<typeof characterManifest>

// ── Episodes ─────────────────────────────────────────────────────────────────

export const episodeManifest = z.object({
  slug: z.string(),
  title: z.string(),
  wiki: wikiContent,
  // Ordered stops; playback walks a courier from stop to stop along the sidewalks.
  route: z
    .array(
      z.object({
        location: z.string(),
        note: z.string().optional(), // caption shown on arrival (markdown-ish inline)
      })
    )
    .min(2),
})
export type EpisodeManifest = z.infer<typeof episodeManifest>
