# Seymour's Bay 3D — a walkable Bob's Burgers fan wiki

A browser-based, walkable 3D fan wiki of the Bob's Burgers universe. Open the site, land
on the street in Seymour's Bay, and walk around: past the restaurants, through doors into
interiors, and up to clickable hotspots that open wiki panels with episode appearances
and trivia.

> **Unofficial fan site.** This is a strictly noncommercial fan project and is **not
> affiliated with 20th Television, Fox, or Disney**. All 3D assets are original,
> hand-made, low-poly homages — nothing is ripped from the show or games. No ads, no
> monetization, ever.

## Status

**M1 — Walkable slice.** Graybox street with two placeholder buildings, first-person
walk controls, one enterable interior, one hotspot wiki panel, deployable as a fully
static site.

## Controls

- **WASD / arrow keys** — walk
- **Mouse** — look (click the page to capture the mouse, Esc to release)
- **E** (or click on a hotspot) — interact: open doors, read wiki panels

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

The world is data, not code. Each location lives in `content/locations/<slug>/` as a
JSON manifest (name, geometry parameters, doors, hotspots, wiki content), and
`content/street.json` places locations on the street. The engine in `src/engine/` is
generic — adding a building requires no engine changes. The manifest format is validated
with zod at load time (`src/engine/manifest.ts`); formal JSON Schema + CI validation
lands in M2, along with `CONTRIBUTING.md`.

Deviations and decisions are logged in `docs/m1-notes.md`.
