# Pivot: isometric voxel town (2026-07-27)

Owner decision after shipping the first-person M1 (preserved at tag
`v0.1-first-person`): reimagine the site as a **RollerCoaster Tycoon / classic
SimCity-style isometric scene** — more zoomed-in than SimCity, voxel-ish, alive with
walking characters — rather than a first-person walkable world.

## What changed

- First-person engine deleted (player controller, doors/sensors, pointer lock,
  interiors, @react-three/rapier — bundle dropped 3.5 MB → ~1.2 MB).
- Same stack otherwise: R3F + drei + zustand + zod, static build, Pages workflow
  untouched.
- Everything on screen is **procedural voxel geometry from manifests**: buildings
  (merged BufferGeometry with vertex colors, one draw call each), ground strip,
  box-people. No asset files.
- Fixed camera: yaw 45°, elevation 30°, orthographic; drag/arrow pan with derived
  bounds; wheel zoom with derived clamps; **⟲ view flip** swings 180° so the far
  side's storefronts (Jimmy Pesto's) are visible — the fixed-iso answer to
  "buildings across the street show their backs."
- New content types: `characters` (clickable, idling in front of their buildings)
  and `episodes` (ordered location routes played back by a walking courier with
  per-stop captions). Cross-references validated at load.
- Router grew `#/char/` and `#/ep/` alongside `#/loc/`; selection focuses the camera.
- The door-travel loading screen became a one-shot **BootOverlay** (same visual
  language, still tip-driven from `content/tips.json`); it's the natural gate for
  real asset loading later.

## Notable implementation decisions

- Merged voxel meshes never raycast; every clickable gets an invisible bounding box.
- Vertex colors are written via `Color.setStyle` so sRGB→linear conversion applies.
- Character animation is imperative (refs + one `useFrame` per system); React only
  re-renders on walker spawn/despawn.
- Episode playback runs are keyed by a `runId` so replays remount a fresh courier
  (fixed a bug where a second play of the same episode finished instantly).
- Ambient walkers derive lanes/extent from `street.json` via `src/world/layout.ts` —
  the single source of derived street geometry.

## Facade format + editor (added same day)

- Locations may carry `exterior.facade`: ASCII rows (top-to-bottom, drawn as seen
  from the street) + a `char → {color, depth}` legend, at **2 cells per voxel**.
  Depth is proudness in quarter-voxels (trim 1, cornice 2, awning 3). Rows above
  the wall height become the shaped roofline — Bob's Victorian gable is grid rows.
  A facade replaces all parametric front-face features; structure stays parametric,
  and `door.offsetX` still drives doorstep/route layout.
- `#/editor` is an in-browser facade painter (grid + palette + live 3D preview +
  copy/import JSON, localStorage autosave). Export is pasted into a manifest and
  PR'd — no server, the repo remains the moderation queue.
- Street order corrected to canon: funeral home left of Bob's, the perpetually
  for-lease gag storefront right, Jimmy Pesto's directly across.

## Style/scheme/feature system (added after the facade grids)

- Buildings are now composed from three layers: a **style** (victorian / brick /
  shopfront — shell, roofline, story windows, sign band), a named **color scheme**
  from `content/schemes.json` (+ inline overrides), and **features** — typed preset
  elements (doorway, retail-window, bay-window, fire-escape, conduit, awning)
  emitted at sub-voxel precision (pipes ~8 cm, railings ~5 cm). This supersedes the
  old windows/awning parametrics; the painted `facade` grid remains as the
  advanced custom-art layer (now with an optional 4-cells-per-voxel resolution)
  and overrides the style's front details when present.
- The editor gained a **Build tab** (style + scheme pickers, feature list with
  param inputs, live preview, exterior JSON export/import); the painter moved to
  the **Paint tab** with a one-way "double resolution" upscale.

## Model/renderer abstraction (same arc, later)

- `src/model/` is the renderer-agnostic world description: schemas, registries,
  street-layout semantics, color/appearance resolution, app store, router.
  `src/renderers/iso/` (voxel town) and `src/renderers/vignette/` (retro pixel
  theater at `#/retro/<episode>`) both present it; boundary rules in
  `src/renderers/README.md`.
- Episodes became **scenes** (title/location/note/cast/interior room) played as a
  cast group-walk in iso and as CRT vignettes in retro. Unknown cast slugs render
  as seeded generics with a console warning.
- Interiors exist as semantic room/prop data (Bob's authored), surfaced in wiki
  panels; rendering them is a future renderer's job.

## Known debts / next

- drei `<Text>` (troika) still fetches its font at runtime; bundle a font later.
- Walkers clip through named characters and curb lips — charming for now.
- Bundle is a single ~1.2 MB chunk; code-splitting is still worth doing.
- Episode routes assume all stops are on this one street; districts (Wonder Wharf)
  will need a scene/travel notion — the BootOverlay + episode machinery are the
  seams for that.
