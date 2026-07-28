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

## Known debts / next

- drei `<Text>` (troika) still fetches its font at runtime; bundle a font later.
- Walkers clip through named characters and curb lips — charming for now.
- Bundle is a single ~1.2 MB chunk; code-splitting is still worth doing.
- Episode routes assume all stops are on this one street; districts (Wonder Wharf)
  will need a scene/travel notion — the BootOverlay + episode machinery are the
  seams for that.
