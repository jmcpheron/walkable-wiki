# Seymour's Bay — a Bob's Burgers fan town & wiki

An isometric, voxel-style slice of Ocean Avenue in the browser — classic
tycoon-game vibes. Pan along the street, watch the townsfolk stroll, and click any
building or character to open its wiki entry. Pick an episode and watch it play out
as a walk across the map (Weekend at Mort's: out of Bob's, straight into the funeral
home next door).

> **Unofficial fan site.** This is a strictly noncommercial fan project and is **not
> affiliated with 20th Television, Fox, or Disney**. All art is original, procedural,
> low-poly homage — nothing is ripped from the show or games. No ads, no
> monetization, ever.

## Controls

- **Drag** (or arrow keys) — pan along the street
- **Scroll** — zoom between whole-block and storefront framing
- **Click** — open a building's or character's wiki panel (Esc or × closes)
- **⟲ Other side** — swing the camera 180° to face the far side's storefronts
- **📺 Episodes** — play an episode as a route across the map
- **🧱 Editor** (`#/editor`) — paint a building's front facade on a half-voxel grid
  with a live 3D preview, then copy the JSON into the location's manifest via PR

## Development

```sh
npm install
npm run dev        # local dev server
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build

# simulate the GitHub Pages subpath locally (BASE_PATH matters for BOTH commands —
# `vite preview` reads the same base config as the build):
BASE_PATH=/walkable-wiki/ npm run build && BASE_PATH=/walkable-wiki/ npm run preview
# then open http://localhost:4173/walkable-wiki/
```

The site is 100% static — no server, no database. It deploys to GitHub Pages via the
workflow in `.github/workflows/deploy.yml`, and works on Vercel with zero config.

## How the world is built

The world is data, not code — everything on screen is generated from JSON manifests:

- `content/locations/<slug>/manifest.json` — a building: voxel size, palette,
  awning/window/sign parameters, wiki text — plus an optional hand-painted
  `facade`: ASCII-art rows at half-voxel resolution with a `char → {color, depth}`
  legend (rows above the wall height shape the roofline; Bob's Victorian gable is
  drawn this way). Facades are easiest to make in the in-browser editor.
- `content/street.json` — where buildings sit on the street
- `content/characters/<slug>/manifest.json` — a clickable character standing in
  front of a location
- `content/episodes/<slug>/manifest.json` — an episode as an ordered route of
  locations with per-stop notes
- `content/tips.json` — the boot-screen tips

All content is zod-validated at load (`src/engine/manifest.ts`) with cross-reference
checks, so a bad manifest fails loudly. The renderer (`src/world/`) turns manifests
into merged voxel geometry — adding a building, character, or episode requires zero
engine changes. Deep links: `#/loc/<slug>`, `#/char/<slug>`, `#/ep/<slug>`.

Decisions are logged in `docs/` (`m1-notes.md` for the original first-person build —
preserved at tag `v0.1-first-person` — and `pivot-isometric.md` for the current
direction).
