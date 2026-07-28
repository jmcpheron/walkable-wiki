# Renderers

Each subfolder is one presentation of the same world model (`src/model/`): manifests,
registries, street layout semantics (doorsteps, lanes, route polylines), colors,
character appearances, and app-level state (selection, wiki, episode playback).

Boundary rules:

- `src/model/` imports **nothing** from `src/renderers/` and never imports three.js.
- Renderers import model freely; renderers **never** import each other.
- Renderer-specific presentation state (camera, zoom, hover) lives inside the
  renderer (see `iso/isoStore.ts`), not in the model store.

Current renderers:

- `iso/` — the isometric voxel town (React Three Fiber). Extrudes facade grids and
  feature specs into merged voxel geometry.
- `vignette/` — the retro episode viewer (pure canvas/DOM, zero three.js). Draws the
  same facade grids as 2D pixel-art elevations with character sprites.

Future renderers (Sierra-style 3D vignettes, free-roam 3D…) should slot in the same
way: a new folder that reads the model and presents it.
