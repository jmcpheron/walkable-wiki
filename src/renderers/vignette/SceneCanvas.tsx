import { useEffect, useRef } from 'react'
import { episodes, locations } from '../../model/content'
import { castAppearance } from '../../model/appearance'
import { drawElevation, measureElevation } from './facadeBitmap'
import { drawSprite } from './sprites'

const W = 640
const H = 400
const SKY = '#8fc0e0'
const SKY_BAND = '#a7d2ec'
const SIDEWALK = '#9ba0a6'
const ROAD = '#3c4046'
const CURB = '#767c83'

// One episode scene as a retro screen: the location's pixel-art elevation
// (drawn from the same facade grid the voxel renderer extrudes) with the scene's
// cast standing out front. Redrawn once per scene — no animation loop.
export function SceneCanvas({ slug, sceneIndex }: { slug: string; sceneIndex: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const scene = episodes[slug]?.scenes[sceneIndex]
    if (!ctx || !scene) return
    const loc = locations[scene.location]
    ctx.imageSmoothingEnabled = false

    // sky with a horizon band
    ctx.fillStyle = SKY
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = SKY_BAND
    ctx.fillRect(0, 0, W, 90)
    // ground: sidewalk strip + curb + road to the bottom
    const groundY = H - 64
    ctx.fillStyle = SIDEWALK
    ctx.fillRect(0, groundY, W, 26)
    ctx.fillStyle = CURB
    ctx.fillRect(0, groundY + 26, W, 3)
    ctx.fillStyle = ROAD
    ctx.fillRect(0, groundY + 29, W, H - groundY - 29)
    // road dashes
    ctx.fillStyle = '#d8d4c3'
    for (let x = 20; x < W; x += 90) ctx.fillRect(x, H - 16, 34, 5)

    // building elevation, centered on the sidewalk line
    const metrics = measureElevation(loc, W - 140, groundY - 24)
    drawElevation(ctx, loc, (W - metrics.widthPx) / 2, groundY, W - 140, groundY - 24)

    // cast standing on the sidewalk
    const cast = scene.characters.map(castAppearance)
    const spriteCell = 4
    const spread = Math.min(90, (W - 160) / Math.max(cast.length, 1))
    const startX = W / 2 - ((cast.length - 1) * spread) / 2
    cast.forEach((member, i) => {
      drawSprite(ctx, member, startX + i * spread, groundY + 22, spriteCell)
    })
  }, [slug, sceneIndex])

  return <canvas ref={canvasRef} width={W} height={H} className="retro-canvas" />
}
