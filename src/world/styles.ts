import type { BuildingStyle, ExteriorDef, SchemeColors } from '../engine/manifest'
import { schemes } from '../engine/content'
import type { VoxelBox } from '../engine/voxel'
import { floorLines } from './features'

// Neighborhood building styles: each generates roofline, story treatment, upper
// windows, and the sign band from (size, colors). Ground floors are left mostly
// blank — doorway/retail-window/awning features furnish them.

export function resolveColors(exterior: ExteriorDef): SchemeColors {
  const base = schemes[exterior.scheme]
  const override = exterior.palette ?? {}
  return {
    ...base,
    ...Object.fromEntries(Object.entries(override).filter(([, v]) => v !== undefined)),
  } as SchemeColors
}

interface StyleOptions {
  frontDetails: boolean // false when a painted facade owns the front face
}

export function styleBoxes(
  style: BuildingStyle,
  exterior: ExteriorDef,
  colors: SchemeColors,
  options: StyleOptions
): VoxelBox[] {
  const [w, d, h] = exterior.size
  const boxes: VoxelBox[] = []
  const FZ = d / 2

  // shared: wall shell + flat roof slab + rooftop unit
  boxes.push({ min: [-w / 2, 0, -d / 2], size: [w, h, d], color: colors.wall })
  boxes.push({ min: [-w / 2 + 1, h, -d / 2 + 1], size: [w - 2, 0.4, d - 2], color: colors.roof })
  boxes.push({ min: [w / 2 - 4.5, h + 0.4, -d / 2 + 2], size: [3, 1.4, 2], color: colors.trim })

  if (!options.frontDetails) {
    // A painted facade owns the whole front, including the crown/cornice shape —
    // give the structure a neutral parapet on the back and sides only.
    boxes.push({ min: [-w / 2, h, -d / 2], size: [w, 1, 1], color: colors.trim })
    boxes.push({ min: [-w / 2, h, -d / 2 + 1], size: [1, 1, d - 1], color: colors.trim })
    boxes.push({ min: [w / 2 - 1, h, -d / 2 + 1], size: [1, 1, d - 1], color: colors.trim })
    return boxes
  }

  const signBand = () => {
    boxes.push({ min: [-w / 2 + 0.3, 4.6, FZ], size: [w - 0.6, 1.8, 0.3], color: colors.sign })
    boxes.push({ min: [-w / 2 + 0.2, 6.35, FZ], size: [w - 0.4, 0.25, 0.4], color: colors.accent })
  }

  const upperWindows = (
    winWidth: number,
    winHeight: number,
    capped: boolean
  ) => {
    for (const y of floorLines(h)) {
      const count = Math.max(1, Math.floor((w - 2) / (winWidth + 2)))
      const span = count * winWidth + (count - 1) * 2
      for (let i = 0; i < count; i++) {
        const x = -span / 2 + i * (winWidth + 2)
        boxes.push({ min: [x - 0.25, y + 0.75, FZ], size: [winWidth + 0.5, winHeight + 0.5, 0.12], color: colors.trim })
        boxes.push({ min: [x, y + 1, FZ], size: [winWidth, winHeight, 0.22], color: colors.glass })
        boxes.push({ min: [x - 0.35, y + 0.55, FZ], size: [winWidth + 0.7, 0.25, 0.5], color: colors.trim }) // sill
        if (capped) {
          boxes.push({ min: [x - 0.45, y + 1 + winHeight + 0.05, FZ], size: [winWidth + 0.9, 0.4, 0.55], color: colors.trim }) // lintel cap
        }
      }
    }
  }

  if (style === 'victorian') {
    // stepped pediment gable + heavy cornice
    boxes.push({ min: [-w / 2, h, FZ - 0.6], size: [w, 0.7, 1.4], color: colors.trim }) // top cornice
    const gableRows = Math.min(6, Math.floor(w / 3))
    for (let i = 0; i < gableRows; i++) {
      const inset = (i + 1) * (w / (2 * (gableRows + 1)))
      boxes.push({ min: [-w / 2 + inset, h + 0.7 + i * 0.6, FZ - 1], size: [w - inset * 2, 0.6, 1.2], color: i === gableRows - 1 ? colors.trim : colors.wall })
      boxes.push({ min: [-w / 2 + inset - 0.35, h + 0.7 + i * 0.6, FZ - 0.9], size: [0.35, 0.6, 1.15], color: colors.trim })
      boxes.push({ min: [w / 2 - inset, h + 0.7 + i * 0.6, FZ - 0.9], size: [0.35, 0.6, 1.15], color: colors.trim })
    }
    // cornice line above each upper floor band
    for (const y of floorLines(h)) {
      boxes.push({ min: [-w / 2, y + 0.15, FZ], size: [w, 0.3, 0.6], color: colors.trim })
    }
    upperWindows(2, 2.6, true)
    signBand()
  } else if (style === 'brick') {
    // flat parapet with coping + string courses
    boxes.push({ min: [-w / 2 - 0.15, h, -d / 2], size: [w + 0.3, 0.55, d], color: colors.trim })
    for (const y of floorLines(h)) {
      boxes.push({ min: [-w / 2, y + 0.3, FZ], size: [w, 0.18, 0.35], color: colors.accent }) // string course
    }
    upperWindows(2.4, 2.4, false)
    signBand()
  } else {
    // shopfront: simple parapet ring
    boxes.push({ min: [-w / 2, h, -d / 2], size: [w, 1, 1], color: colors.trim })
    boxes.push({ min: [-w / 2, h, d / 2 - 1], size: [w, 1, 1], color: colors.trim })
    boxes.push({ min: [-w / 2, h, -d / 2 + 1], size: [1, 1, d - 2], color: colors.trim })
    boxes.push({ min: [w / 2 - 1, h, -d / 2 + 1], size: [1, 1, d - 2], color: colors.trim })
    upperWindows(2.6, 2.2, false)
    signBand()
  }

  return boxes
}
