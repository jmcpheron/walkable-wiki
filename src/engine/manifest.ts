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

// Named color schemes live in content/schemes.json; a manifest picks one by name
// and may override individual colors inline.
export const schemeColors = z.object({
  wall: z.string(),
  trim: z.string(),
  accent: z.string(),
  glass: z.string(),
  door: z.string(),
  roof: z.string(),
  metal: z.string(), // fire escapes, conduit, gratings
  sign: z.string(),
})
export type SchemeColors = z.infer<typeof schemeColors>

export const paletteOverride = z.object({
  wall: z.string().optional(),
  trim: z.string().optional(),
  accent: z.string().optional(),
  glass: z.string().optional(),
  door: z.string().optional(),
  roof: z.string().optional(),
  metal: z.string().optional(),
  sign: z.string().optional(),
})
export type PaletteOverride = z.infer<typeof paletteOverride>

// Real-world detail elements, stamped onto a building at sub-voxel precision.
// Positions are in voxels from the front-face center (x) unless noted.
export const featureDef = z.discriminatedUnion('type', [
  // Victorian box window protruding from an upper floor
  z.object({
    type: z.literal('bay-window'),
    x: z.number(),
    floor: z.number().int().min(1).default(1),
    width: z.number().min(3).default(5),
  }),
  // zigzag platforms + railings + drop ladder on the facade
  z.object({
    type: z.literal('fire-escape'),
    x: z.number(),
    width: z.number().min(2.5).default(4),
  }),
  // electrical conduit run with a junction box
  z.object({
    type: z.literal('conduit'),
    face: z.enum(['front', 'left', 'right']).default('right'),
    x: z.number().default(0), // along width for front, along depth for sides
  }),
  z.object({
    type: z.literal('doorway'),
    x: z.number(),
    kind: z.enum(['shop', 'apartment']).default('shop'),
  }),
  // big ground-floor display window with bulkhead + sill
  z.object({
    type: z.literal('retail-window'),
    from: z.number(),
    to: z.number(),
  }),
  z.object({
    type: z.literal('awning'),
    from: z.number(),
    to: z.number(),
  }),
])
export type FeatureDef = z.infer<typeof featureDef>

export const buildingStyle = z.enum(['victorian', 'brick', 'shopfront'])
export type BuildingStyle = z.infer<typeof buildingStyle>

// Hand-painted front facade at HALF-voxel resolution (2 cells per voxel).
// rows are top-to-bottom strings, drawn as seen from the street; legend maps each
// character to a color and a proudness depth (0 = flush panel, 1 = trim, 2 =
// cornice, 3 = awning...). ' ' and '.' are empty — rows above the wall height
// with cells form the shaped roofline (gables, parapets).
export const facadeDef = z
  .object({
    // cells per voxel: 2 (default, 0.25m cells) or 4 (0.125m cells for fine detail)
    resolution: z.union([z.literal(2), z.literal(4)]).default(2),
    legend: z.record(
      z.string(),
      z.object({
        color: z.string(),
        depth: z.number().int().min(-1).max(4).default(0),
      })
    ),
    rows: z.array(z.string()).min(1),
  })
  .superRefine((facade, ctx) => {
    for (const key of Object.keys(facade.legend)) {
      if (key.length !== 1) ctx.addIssue({ code: 'custom', message: `legend key "${key}" must be a single character` })
    }
    for (const [i, row] of facade.rows.entries()) {
      for (const ch of row) {
        if (ch !== ' ' && ch !== '.' && !facade.legend[ch]) {
          ctx.addIssue({ code: 'custom', message: `row ${i} uses "${ch}" which is not in the legend` })
        }
      }
    }
  })
export type FacadeDef = z.infer<typeof facadeDef>

export const exteriorDef = z.object({
  // [width, depth, height] in voxels (1 voxel = 0.5 world units)
  size: z.tuple([z.number().int().min(4), z.number().int().min(4), z.number().int().min(6)]),
  // Neighborhood style: generates shell, roofline, story windows, sign band.
  style: buildingStyle.default('shopfront'),
  scheme: z.string().default('plaster'), // name from content/schemes.json
  palette: paletteOverride.optional(), // per-color overrides on top of the scheme
  signText: z.string().optional(), // defaults to the location name
  signY: z.number().optional(), // sign-text height in voxels (default 5.5)
  features: z.array(featureDef).default([]),
  // Hand-painted front grid (advanced): replaces the style's front-face details;
  // structure and features still apply. door.offsetX always drives doorstep layout.
  facade: facadeDef.optional(),
  door: z
    .object({
      offsetX: z.number().default(0), // voxels from front-face center
      width: z.number().min(1).default(2),
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
