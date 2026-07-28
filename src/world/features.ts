import type { ExteriorDef, FeatureDef, SchemeColors } from '../engine/manifest'
import type { VoxelBox } from '../engine/voxel'

// Real-world detail elements at sub-voxel precision — conduit pipes are ~8cm,
// railings ~5cm. Boxes take any fractional voxel size, so features are far finer
// than the paintable grid. All positions in voxels; front face sits at z = d/2.

// Upper-floor baselines for a building of height h (ground floor is 0..~6.5).
export function floorLines(h: number): number[] {
  const lines: number[] = []
  for (let y = 6.5; y <= h - 3; y += 3.5) lines.push(y)
  return lines
}

export function featureBoxes(
  feature: FeatureDef,
  exterior: ExteriorDef,
  colors: SchemeColors
): VoxelBox[] {
  const [w, d, h] = exterior.size
  const FZ = d / 2
  const boxes: VoxelBox[] = []

  switch (feature.type) {
    case 'retail-window': {
      const { from, to } = feature
      const width = to - from
      if (width <= 0.8) break
      boxes.push({ min: [from, 0, FZ], size: [width, 1.1, 0.3], color: colors.accent }) // bulkhead
      boxes.push({ min: [from - 0.2, 1.05, FZ], size: [width + 0.4, 0.25, 0.55], color: colors.trim }) // sill
      boxes.push({ min: [from, 1.3, FZ], size: [width, 3.1, 0.25], color: colors.glass })
      boxes.push({ min: [from - 0.2, 4.4, FZ], size: [width + 0.4, 0.3, 0.4], color: colors.trim }) // head
      // mullions every ~2.4 voxels
      for (let x = from + 2.4; x < to - 0.3; x += 2.4) {
        boxes.push({ min: [x - 0.06, 1.3, FZ + 0.05], size: [0.12, 3.1, 0.28], color: colors.trim })
      }
      break
    }

    case 'doorway': {
      const { x, kind } = feature
      const width = kind === 'shop' ? 2.4 : 1.8
      const left = x - width / 2
      // frame
      boxes.push({ min: [left - 0.3, 0, FZ], size: [0.3, 4.9, 0.4], color: colors.trim })
      boxes.push({ min: [left + width, 0, FZ], size: [0.3, 4.9, 0.4], color: colors.trim })
      boxes.push({ min: [left - 0.3, 4.9, FZ], size: [width + 0.6, 0.35, 0.45], color: colors.trim })
      if (kind === 'shop') {
        boxes.push({ min: [left, 0.05, FZ], size: [width, 4, 0.28], color: colors.glass }) // glass door
        boxes.push({ min: [left + width / 2 - 0.05, 0.05, FZ + 0.15], size: [0.1, 4, 0.2], color: colors.metal }) // stile
        boxes.push({ min: [left, 0.05, FZ + 0.1], size: [width, 0.7, 0.25], color: colors.metal }) // kick plate
        boxes.push({ min: [left, 4.15, FZ], size: [width, 0.75, 0.26], color: colors.glass }) // transom
      } else {
        boxes.push({ min: [left, 0.05, FZ], size: [width, 4.4, 0.3], color: colors.door })
        boxes.push({ min: [left + width / 2 - 0.4, 2.7, FZ + 0.15], size: [0.8, 0.8, 0.22], color: colors.glass }) // peep window
        boxes.push({ min: [left + width - 0.35, 2.1, FZ + 0.2], size: [0.12, 0.35, 0.16], color: colors.metal }) // handle
      }
      boxes.push({ min: [left - 0.4, 0, FZ + 0.4], size: [width + 0.8, 0.22, 0.9], color: colors.trim }) // step
      break
    }

    case 'awning': {
      const { from, to } = feature
      let stripe = 0
      for (let x = from; x < to; x += 2, stripe++) {
        const seg = Math.min(2, to - x)
        const color = stripe % 2 === 0 ? colors.accent : colors.trim
        boxes.push({ min: [x, 4.15, FZ + 0.25], size: [seg, 0.45, 1], color })
        boxes.push({ min: [x, 3.8, FZ + 1.25], size: [seg, 0.45, 1], color })
      }
      break
    }

    case 'bay-window': {
      const { x, floor, width } = feature
      const yBase = floorLines(h)[floor - 1] ?? 6.5
      const top = yBase + 3
      const left = x - width / 2
      boxes.push({ min: [left - 0.2, yBase, FZ], size: [width + 0.4, 0.35, 1.7], color: colors.trim }) // base slab
      boxes.push({ min: [left + 0.3, yBase - 0.6, FZ], size: [0.35, 0.6, 0.9], color: colors.trim }) // brackets
      boxes.push({ min: [left + width - 0.65, yBase - 0.6, FZ], size: [0.35, 0.6, 0.9], color: colors.trim })
      boxes.push({ min: [left, yBase + 0.35, FZ], size: [width, top - yBase - 0.35, 1.5], color: colors.wall }) // body
      boxes.push({ min: [left + 0.7, yBase + 0.7, FZ + 1.5], size: [width - 1.4, 2, 0.12], color: colors.glass }) // front glass
      boxes.push({ min: [left + 0.15, yBase + 0.7, FZ + 0.35], size: [0.12, 2, 1], color: colors.glass }) // side glass
      boxes.push({ min: [left + width - 0.27, yBase + 0.7, FZ + 0.35], size: [0.12, 2, 1], color: colors.glass })
      boxes.push({ min: [left - 0.3, top, FZ], size: [width + 0.6, 0.4, 1.9], color: colors.trim }) // cap roof
      break
    }

    case 'fire-escape': {
      const { x, width } = feature
      const left = x - width / 2
      const lines = floorLines(h)
      const OUT = 1.5 // platform depth off the wall
      for (const y of lines) {
        // platform grate + frame
        boxes.push({ min: [left, y, FZ], size: [width, 0.12, OUT], color: colors.metal })
        boxes.push({ min: [left, y - 0.15, FZ + OUT - 0.15], size: [width, 0.15, 0.15], color: colors.metal })
        // railing: posts + top/mid rails on the outer edge and sides
        for (const px of [left, left + width / 2 - 0.04, left + width - 0.08]) {
          boxes.push({ min: [px, y, FZ + OUT - 0.08], size: [0.08, 1.5, 0.08], color: colors.metal })
        }
        boxes.push({ min: [left, y + 1.42, FZ + OUT - 0.08], size: [width, 0.08, 0.08], color: colors.metal })
        boxes.push({ min: [left, y + 0.75, FZ + OUT - 0.08], size: [width, 0.06, 0.06], color: colors.metal })
        // side rails back to the wall
        boxes.push({ min: [left, y + 1.42, FZ], size: [0.08, 0.08, OUT], color: colors.metal })
        boxes.push({ min: [left + width - 0.08, y + 1.42, FZ], size: [0.08, 0.08, OUT], color: colors.metal })
      }
      // stepped stair run between floors (or up from the first platform)
      for (let i = 0; i < lines.length; i++) {
        const yLow = i === 0 ? lines[0] : lines[i - 1]
        const yHigh = i === 0 ? lines[0] : lines[i]
        if (i > 0 && yHigh - yLow > 0.1) {
          const steps = 7
          for (let s = 0; s < steps; s++) {
            boxes.push({
              min: [left + 0.3 + (s * (width - 1.6)) / steps, yLow + ((s + 1) * (yHigh - yLow)) / (steps + 1), FZ + 0.35],
              size: [0.55, 0.09, 0.8],
              color: colors.metal,
            })
          }
        }
      }
      // drop ladder below the lowest platform
      const yFirst = lines[0] ?? 6.5
      for (const lx of [left + width / 2 - 0.7, left + width / 2 + 0.55]) {
        boxes.push({ min: [lx, yFirst - 3, FZ + OUT - 0.4], size: [0.1, 3, 0.1], color: colors.metal })
      }
      for (let ry = yFirst - 2.7; ry < yFirst - 0.2; ry += 0.6) {
        boxes.push({ min: [left + width / 2 - 0.6, ry, FZ + OUT - 0.38], size: [1.2, 0.09, 0.09], color: colors.metal })
      }
      break
    }

    case 'dumpster': {
      const { side, x } = feature
      const BODY_W = 3.6
      const BODY_H = 1.5
      const BODY_D = 1.8
      const GREEN = '#3f5a3c'
      const LID = '#324a30'
      const DARK = '#26302a'
      // axis-aligned placement against the chosen wall, sitting just off it
      const along = x - BODY_W / 2
      const emit = (ax: number, ay: number, az: number, sx: number, sy: number, sz: number, color: string) => {
        if (side === 'back') boxes.push({ min: [along + ax, ay, -d / 2 - 0.4 - BODY_D + az], size: [sx, sy, sz], color })
        else if (side === 'right') boxes.push({ min: [w / 2 + 0.4 + az, ay, along + ax], size: [sz, sy, sx], color })
        else boxes.push({ min: [-w / 2 - 0.4 - BODY_D + az, ay, along + ax], size: [sz, sy, sx], color })
      }
      emit(0, 0.35, 0, BODY_W, BODY_H, BODY_D, GREEN) // body
      emit(-0.15, 1.1, -0.1, 0.15, 0.5, BODY_D + 0.2, GREEN) // side pockets
      emit(BODY_W, 1.1, -0.1, 0.15, 0.5, BODY_D + 0.2, GREEN)
      emit(0.1, 1.85, 0, BODY_W / 2 - 0.15, 0.14, BODY_D - 0.1, LID) // closed lid half
      emit(BODY_W / 2 + 0.05, 1.95, 0.35, BODY_W / 2 - 0.15, 0.14, BODY_D - 0.45, LID) // ajar lid half
      emit(BODY_W / 2 + 0.05, 1.6, 0.05, BODY_W / 2 - 0.15, 0.35, 0.3, DARK) // gap under ajar lid
      for (const wx of [0.3, BODY_W - 0.55]) {
        emit(wx, 0, 0.2, 0.35, 0.35, 0.35, DARK) // wheels
        emit(wx, 0, BODY_D - 0.55, 0.35, 0.35, 0.35, DARK)
      }
      emit(-0.75, 0, 0.3, 0.7, 0.6, 0.7, '#4a4438') // trash bag beside it
      emit(-0.7, 0.55, 0.4, 0.45, 0.3, 0.45, '#54503f')
      break
    }

    case 'conduit': {
      const { face, x } = feature
      const PIPE = 0.16
      if (face === 'front') {
        boxes.push({ min: [x - PIPE / 2, 0, FZ + 0.1], size: [PIPE, h - 0.4, PIPE], color: colors.metal })
        boxes.push({ min: [x - 0.4, 2.4, FZ + 0.08], size: [0.8, 1.1, 0.3], color: colors.metal }) // junction box
        boxes.push({ min: [x - 0.28, h - 0.6, FZ + 0.06], size: [0.56, 0.5, 0.24], color: colors.metal }) // weatherhead
      } else {
        const side = face === 'left' ? -1 : 1
        const wx = side === 1 ? w / 2 + 0.08 : -w / 2 - 0.08 - PIPE
        boxes.push({ min: [wx, 0, x - PIPE / 2], size: [PIPE, h - 0.4, PIPE], color: colors.metal })
        boxes.push({ min: [side === 1 ? w / 2 + 0.04 : -w / 2 - 0.34, 2.4, x - 0.4], size: [0.3, 1.1, 0.8], color: colors.metal })
        boxes.push({ min: [side === 1 ? w / 2 + 0.02 : -w / 2 - 0.26, h - 0.6, x - 0.28], size: [0.24, 0.5, 0.56], color: colors.metal })
      }
      break
    }
  }

  return boxes
}
