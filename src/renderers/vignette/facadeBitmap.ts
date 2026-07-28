import type { LocationManifest } from '../../model/manifest'
import { resolveColors } from '../../model/colors'

// Draw a building's front elevation as 2D pixel art — from the SAME facade grid
// the voxel renderer extrudes. This file is the abstraction proof in miniature:
// no three.js, just the model and a canvas.

export interface ElevationMetrics {
  widthPx: number
  heightPx: number
  scale: number // px per facade cell
  cellsPerVoxel: number
}

export function measureElevation(
  loc: LocationManifest,
  maxW: number,
  maxH: number
): ElevationMetrics {
  const facade = loc.exterior.facade
  const cellsPerVoxel = facade?.resolution ?? 2
  const cols = facade
    ? Math.max(...facade.rows.map((r) => r.length), loc.exterior.size[0] * cellsPerVoxel)
    : loc.exterior.size[0] * cellsPerVoxel
  const rows = facade ? facade.rows.length : loc.exterior.size[2] * cellsPerVoxel
  const scale = Math.max(2, Math.floor(Math.min(maxW / cols, maxH / rows)))
  return { widthPx: cols * scale, heightPx: rows * scale, scale, cellsPerVoxel }
}

// Draws with the bottom-left of the elevation at (x, groundY). Returns metrics.
export function drawElevation(
  ctx: CanvasRenderingContext2D,
  loc: LocationManifest,
  x: number,
  groundY: number,
  maxW: number,
  maxH: number
): ElevationMetrics {
  const metrics = measureElevation(loc, maxW, maxH)
  const { scale, cellsPerVoxel } = metrics
  const exterior = loc.exterior
  const facade = exterior.facade
  const top = groundY - metrics.heightPx

  if (facade) {
    for (let r = 0; r < facade.rows.length; r++) {
      const row = facade.rows[r]
      let c = 0
      while (c < row.length) {
        const ch = row[c]
        const entry = ch !== ' ' && ch !== '.' ? facade.legend[ch] : undefined
        if (!entry) {
          c++
          continue
        }
        let run = 1
        while (c + run < row.length && row[c + run] === ch) run++
        ctx.fillStyle = entry.color
        ctx.fillRect(x + c * scale, top + r * scale, run * scale, scale)
        if (entry.depth >= 2) {
          // cheap relief: darker lower edge on proud elements
          ctx.fillStyle = 'rgba(0,0,0,0.28)'
          ctx.fillRect(x + c * scale, top + (r + 1) * scale - 1, run * scale, 1)
        }
        c += run
      }
    }
  } else {
    // facade-less fallback: wall, window grid, door, sign band — parameters only
    const colors = resolveColors(exterior)
    const [w, , h] = exterior.size
    const wallW = w * cellsPerVoxel * scale
    const wallH = h * cellsPerVoxel * scale
    ctx.fillStyle = colors.wall
    ctx.fillRect(x, groundY - wallH, wallW, wallH)
    ctx.fillStyle = colors.sign
    ctx.fillRect(x, groundY - 6.5 * cellsPerVoxel * scale, wallW, 2 * cellsPerVoxel * scale)
    ctx.fillStyle = colors.glass
    for (let fy = 7.5; fy + 2 < h; fy += 3.5) {
      for (let wx = 1; wx + 2 < w; wx += 3) {
        ctx.fillRect(
          x + wx * cellsPerVoxel * scale,
          groundY - (fy + 2) * cellsPerVoxel * scale,
          2 * cellsPerVoxel * scale,
          2 * cellsPerVoxel * scale
        )
      }
    }
    ctx.fillStyle = colors.door
    const doorW = exterior.door.width * cellsPerVoxel * scale
    ctx.fillRect(
      x + wallW / 2 + exterior.door.offsetX * cellsPerVoxel * scale - doorW / 2,
      groundY - 4 * cellsPerVoxel * scale,
      doorW,
      4 * cellsPerVoxel * scale
    )
  }

  // sign text over the band
  const signY = (exterior.signY ?? 5.5) * cellsPerVoxel * scale
  const fontPx = Math.max(8, Math.round(1.6 * cellsPerVoxel * scale * 0.7))
  ctx.font = `bold ${fontPx}px "Courier New", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = exterior.signColor ?? '#2b2620'
  ctx.fillText(exterior.signText ?? loc.name, x + metrics.widthPx / 2, groundY - signY)

  return metrics
}
