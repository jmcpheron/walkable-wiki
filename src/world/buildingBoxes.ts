import type { ExteriorDef } from '../engine/manifest'
import type { VoxelBox } from '../engine/voxel'

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
