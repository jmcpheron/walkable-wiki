# M1 decisions & notes

Running log of decisions that deviate from or refine the kickoff doc. (This file plays
the `DECISIONS.md` role for M1.)

## Decided with the project owner

- **First-person camera** is the default. The rig is the last two lines of the
  `useFrame` loop in `src/engine/Player.tsx` — third-person later means replacing only
  that camera-follow code, not the movement.
- **GitHub Pages** is the M1 deploy target (`.github/workflows/deploy.yml`,
  `BASE_PATH=/walkable-wiki/`). Vercel works with zero config (`vite build` → `dist/`).
- **Hand-authored coordinates** in `content/street.json` (`position: [x, z]`,
  `rotationY` in degrees). A slot system can layer on top in M2 without changing
  location manifests.
- **Door travel is a loading screen, not just a fade** (owner decision, post-M1): fade
  out ~450 ms → hold at black ≥2.2 s with a "Now entering …" card + one rotating tip →
  fade in ~650 ms. Tips live in `content/tips.json` (content, not code) and teach
  site abilities / roadmap items; the `loading` store phase is the seam where real
  GLB downloads will gate the reveal in M2+ instead of a fixed timer.

## Engine decisions

- **Scene travel remounts the physics world** (`<Physics key={scene}>` in
  `SceneRoot.tsx`). Clean collider rebuild + respawn beats teleporting through a
  persistent world while scenes are procedural graybox.
- **Doors are sensor + explicit E** (no auto-enter): walking past a door never yanks
  you through it. Exit spawns sit 1.8 m outside the sensor so you can't re-trigger the
  door you just came out of. Gotcha encoded in `Door.tsx`: fixed sensors need
  `activeCollisionTypes` to include `KINEMATIC_FIXED` to see the kinematic player.
- **Hotspot hover is a camera-center raycast**, not R3F pointer events — pointer lock
  pins the cursor so normal hover can't work. Crosshair = cursor.
- **Wiki panels open outside pointer lock** (panel needs a scrollable, clickable DOM),
  close with Esc/E/×, then a click re-captures the mouse. Esc conflicts with pointer
  lock's own Esc handling by design of the browser; since the pointer is already
  unlocked while reading, Esc cleanly means "close panel".
- **Movement constants** live at the top of `Player.tsx` (`WALK_SPEED 3.2 m/s`,
  exponential accel smoothing, eye height 1.6 m) — tuned for a museum stroll, retune
  freely.
- **Movement works even without pointer lock.** Harmless (page can't scroll) and makes
  keyboard-only inspection possible; revisit if it confuses anyone.
- **zod v4 in `src/engine/manifest.ts` is the entire M1 schema system.** Manifests are
  bundled via `import.meta.glob` and `.parse()`d at module load, so a malformed
  manifest fails loudly in dev and at build. JSON Schema + CI check is M2.
- **React pinned to ~19.2**: `@react-three/fiber@9` requires `>=19 <19.3`.
- **No separate rapier install**: `@react-three/rapier` bundles `rapier3d-compat`
  with the WASM inlined as base64 — zero Vite config, fully static-deploy safe.

## Known debts (intentional, for M2+)

- Bundle is one ~3.5 MB chunk (1.2 MB gzip) — three.js + inlined Rapier WASM. Fine for
  M1; M2 should code-split (e.g. lazy-load Physics/Rapier after first paint) and add
  Draco/meshopt when real GLBs arrive.
- drei `<Text>` (troika) fetches its default font at runtime; replace with a bundled
  font when the toon/art pass happens.
- No touch/gamepad controls; desktop keyboard + mouse only, per kickoff.
