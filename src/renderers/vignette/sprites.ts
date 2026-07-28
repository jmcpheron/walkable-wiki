import type { Appearance } from '../../model/appearance'

// A character as retro pixel art: an 8-wide column-stack derived from the same
// appearance data the voxel BoxPerson uses. Adults are 14 cells tall, kids 12
// with a proportionally bigger head.

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  appearance: Appearance,
  centerX: number,
  groundY: number,
  cell: number
) {
  const p = appearance.palette
  const kid = appearance.heightVoxels < 3.5
  const H = kid ? 12 : 14
  const left = centerX - 4 * cell
  const fill = (col: number, row: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color
    ctx.fillRect(left + col * cell, groundY - (H - row) * cell, w * cell, h * cell)
  }

  let row = 0
  if (p.hat) {
    fill(1, row, 6, 2, p.hat)
    row += 2
  } else {
    row += kid ? 0 : 1
  }
  // hair cap + head
  fill(1, row, 6, 1, p.hair)
  row += 1
  const headRows = kid ? 4 : 3
  fill(2, row, 4, headRows, p.skin)
  fill(1, row, 1, headRows - 1, p.hair) // sideburn shadow
  fill(6, row, 1, headRows - 1, p.hair)
  row += headRows
  // torso + arms
  const torsoRows = kid ? 3 : 4
  fill(2, row, 4, torsoRows, p.top)
  fill(1, row, 1, torsoRows - 1, p.top)
  fill(6, row, 1, torsoRows - 1, p.top)
  fill(1, row + torsoRows - 1, 1, 1, p.skin) // hands
  fill(6, row + torsoRows - 1, 1, 1, p.skin)
  row += torsoRows
  // legs + shoes
  const legRows = H - row - 1
  fill(2, row, 2, legRows, p.bottom)
  fill(4.5, row, 2, legRows, p.bottom)
  fill(2, H - 1, 2, 1, '#26221e')
  fill(4.5, H - 1, 2, 1, '#26221e')
}
