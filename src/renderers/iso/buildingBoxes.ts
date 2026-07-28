import type { ExteriorDef, FacadeDef } from '../../model/manifest'
import type { VoxelBox } from './voxel'
import { resolveColors } from '../../model/colors'
import { styleBoxes } from './styles'
import { featureBoxes } from './features'

// Manifest exterior → voxel box list. Three layers compose:
//   1. style: shell, roofline, story windows, sign band (styles.ts)
//   2. features: doorways, retail windows, bay windows, fire escapes, conduit,
//      awnings — sub-voxel real-world detail (features.ts)
//   3. facade (advanced): a hand-painted grid replacing the style's front details
export function buildingBoxes(exterior: ExteriorDef): VoxelBox[] {
  const colors = resolveColors(exterior)
  const boxes = styleBoxes(exterior.style, exterior, colors, {
    frontDetails: !exterior.facade,
  })
  if (exterior.facade) {
    const [w, , h] = exterior.size
    boxes.push(...facadeBoxes(exterior.facade, w, h, exterior.size[1]))
  }
  for (const feature of exterior.features) {
    boxes.push(...featureBoxes(feature, exterior, colors))
  }
  return boxes
}

// Facade grid → boxes. Bottom row sits at ground level; rows above the wall top
// (h voxels) become the shaped roofline and get a full-voxel thickness so gables
// read from the side. Consecutive same-character cells merge into one box per run.
function facadeBoxes(facade: FacadeDef, w: number, h: number, d: number): VoxelBox[] {
  const cell = 1 / facade.resolution
  const boxes: VoxelBox[] = []
  const rowCount = facade.rows.length
  for (let r = 0; r < rowCount; r++) {
    const row = facade.rows[r]
    const y = (rowCount - 1 - r) * cell // bottom of this row, in voxels
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
      const x = -w / 2 + c * cell
      const proud = 0.25 + depth * 0.25
      boxes.push(
        aboveWall
          ? { min: [x, y, d / 2 - 1], size: [run * cell, cell, 1 + proud], color }
          : { min: [x, y, d / 2], size: [run * cell, cell, proud], color }
      )
      c += run
    }
  }
  return boxes
}
