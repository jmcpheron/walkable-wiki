import type { ExteriorDef, FacadeDef } from '../engine/manifest'
import type { VoxelBox } from '../engine/voxel'

const CELL = 0.5 // facade resolution: half a voxel per grid cell

// Pure function: manifest exterior spec → voxel box list. Building-local coords:
// x centered, y up from 0, z centered with the storefront at +d/2. All the visual
// vocabulary (parapets, sign bands, awnings, window grids) lives here — adding a
// new building feature means extending this file, never the renderer.

const SIGN_BAND = { y: 4.5, height: 2 }
const DOOR_HEIGHT = 4
const GROUND_WINDOW = { y: 1, height: 3 }
const UPPER_WINDOW_START = 7.5

export function buildingBoxes(exterior: ExteriorDef): VoxelBox[] {
  const [w, d, h] = exterior.size
  const p = exterior.palette
  const boxes: VoxelBox[] = []

  // wall shell
  boxes.push({ min: [-w / 2, 0, -d / 2], size: [w, h, d], color: p.wall })

  if (exterior.facade) {
    // Hand-painted front: the grid replaces every parametric front-face feature.
    boxes.push(...facadeBoxes(exterior.facade, w, h, d))
    // roof + parapet on the other three sides only (the facade owns the front line)
    boxes.push({ min: [-w / 2, h, -d / 2], size: [w, 1, 1], color: p.trim })
    boxes.push({ min: [-w / 2, h, -d / 2 + 1], size: [1, 1, d - 1], color: p.trim })
    boxes.push({ min: [w / 2 - 1, h, -d / 2 + 1], size: [1, 1, d - 1], color: p.trim })
    boxes.push({ min: [-w / 2 + 1, h, -d / 2 + 1], size: [w - 2, 0.4, d - 1.2], color: p.roof })
    boxes.push({ min: [w / 2 - 4.5, h + 0.4, -d / 2 + 2], size: [3, 1.4, 2], color: p.trim })
    return boxes
  }

  // parapet ring + inset flat roof (the SimCity flat-top)
  boxes.push({ min: [-w / 2, h, -d / 2], size: [w, 1, 1], color: p.trim })
  boxes.push({ min: [-w / 2, h, d / 2 - 1], size: [w, 1, 1], color: p.trim })
  boxes.push({ min: [-w / 2, h, -d / 2 + 1], size: [1, 1, d - 2], color: p.trim })
  boxes.push({ min: [w / 2 - 1, h, -d / 2 + 1], size: [1, 1, d - 2], color: p.trim })
  boxes.push({ min: [-w / 2 + 1, h, -d / 2 + 1], size: [w - 2, 0.4, d - 2], color: p.roof })
  // rooftop unit, slightly off-center — pure charm
  boxes.push({ min: [w / 2 - 4.5, h + 0.4, -d / 2 + 2], size: [3, 1.4, 2], color: p.trim })

  // door (proud of the front face) + step
  const doorLeft = exterior.door.offsetX - exterior.door.width / 2
  boxes.push({ min: [doorLeft, 0, d / 2], size: [exterior.door.width, DOOR_HEIGHT, 0.3], color: p.door })
  boxes.push({ min: [doorLeft - 0.5, 0, d / 2 + 0.3], size: [exterior.door.width + 1, 0.35, 0.9], color: p.trim })

  // ground-floor shop windows flanking the door
  for (const [from, to] of [
    [-w / 2 + 1, doorLeft - 1],
    [doorLeft + exterior.door.width + 1, w / 2 - 1],
  ]) {
    const width = to - from
    if (width < 1.5) continue
    boxes.push({ min: [from - 0.3, GROUND_WINDOW.y - 0.3, d / 2], size: [width + 0.6, GROUND_WINDOW.height + 0.6, 0.12], color: p.trim })
    boxes.push({ min: [from, GROUND_WINDOW.y, d / 2], size: [width, GROUND_WINDOW.height, 0.22], color: p.window })
  }

  // sign band between floors
  boxes.push({ min: [-w / 2, SIGN_BAND.y, d / 2], size: [w, SIGN_BAND.height, 0.2], color: p.sign })

  // upper window grid (auto-derived unless the manifest pins it)
  const cols = exterior.windows?.cols ?? Math.max(1, Math.floor((w - 2) / 3))
  const rows = exterior.windows?.rows ?? Math.max(1, Math.floor((h - UPPER_WINDOW_START - 0.5) / 3))
  const gridWidth = cols * 2 + (cols - 1)
  const startX = -gridWidth / 2
  for (let row = 0; row < rows; row++) {
    const y = UPPER_WINDOW_START + row * 3
    if (y + 2 > h - 0.5) break
    for (let col = 0; col < cols; col++) {
      const x = startX + col * 3
      boxes.push({ min: [x - 0.3, y - 0.3, d / 2], size: [2.6, 2.6, 0.12], color: p.trim })
      boxes.push({ min: [x, y, d / 2], size: [2, 2, 0.22], color: p.window })
    }
  }

  // striped awning over the ground floor, stepped for a sloped read
  if (exterior.awning && p.awning) {
    const awningWidth = w - 1
    let stripe = 0
    for (let x = -awningWidth / 2; x < awningWidth / 2; x += 2, stripe++) {
      const segment = Math.min(2, awningWidth / 2 - x)
      const color = stripe % 2 === 0 ? p.awning : p.trim
      boxes.push({ min: [x, 4.2, d / 2 + 0.2], size: [segment, 0.5, 1], color })
      boxes.push({ min: [x, 3.8, d / 2 + 1.2], size: [segment, 0.5, 1], color })
    }
  }

  return boxes
}

// Facade grid → boxes. Bottom row sits at ground level; rows above the wall top
// (h voxels) become the shaped roofline and get a full-voxel thickness so gables
// read from the side. Consecutive same-character cells merge into one box per run.
function facadeBoxes(facade: FacadeDef, w: number, h: number, d: number): VoxelBox[] {
  const boxes: VoxelBox[] = []
  const rowCount = facade.rows.length
  for (let r = 0; r < rowCount; r++) {
    const row = facade.rows[r]
    const y = (rowCount - 1 - r) * CELL // bottom of this row, in voxels
    const aboveWall = y >= h
    let c = 0
    while (c < row.length) {
      const ch = row[c]
      if (ch === ' ' || ch === '.' || !facade.legend[ch]) {
        c++
        continue
      }
      let run = 1
      while (c + run < row.length && row[c + run] === ch) run++
      const { color, depth } = facade.legend[ch]
      const x = -w / 2 + c * CELL
      const proud = 0.25 + depth * 0.25
      boxes.push(
        aboveWall
          ? { min: [x, y, d / 2 - 1], size: [run * CELL, CELL, 1 + proud], color }
          : { min: [x, y, d / 2], size: [run * CELL, CELL, proud], color }
      )
      c += run
    }
  }
  return boxes
}
