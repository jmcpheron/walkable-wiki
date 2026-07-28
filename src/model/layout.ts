import { getLocation, getPlacement, street } from './content'
import { VOXEL } from './units'

// Single source of derived street geometry. Everything — ground strip, walker lanes,
// character placement, episode routes, camera bounds — computes from street.json
// through here. No other module hard-codes layout numbers.

// Buildings sit at |z| = 8 facing the road. Bands in world units:
export const NEAR_SIDEWALK = { zMin: -5, zMax: -2, lane: -3.5 } // in front of rotationY 0 buildings
export const ROAD = { zMin: -2, zMax: 4 }
export const FAR_SIDEWALK = { zMin: 4, zMax: 7, lane: 5.5 } // in front of rotationY 180 buildings
export const GROUND_MARGIN = 8 // extra street length beyond the outermost buildings

export interface StreetExtent {
  minX: number
  maxX: number
}

export function streetExtent(): StreetExtent {
  let minX = Infinity
  let maxX = -Infinity
  for (const p of street.placements) {
    const halfWidth = (getLocation(p.slug).exterior.size[0] * VOXEL) / 2
    minX = Math.min(minX, p.position[0] - halfWidth)
    maxX = Math.max(maxX, p.position[0] + halfWidth)
  }
  return { minX: minX - GROUND_MARGIN, maxX: maxX + GROUND_MARGIN }
}

// Is this placement on the near side (faces +Z) or far side (faces -Z)?
// rotationY 0 → near building line (z<0), storefront toward +Z.
function facesPositiveZ(rotationY: number): boolean {
  return Math.round(((rotationY % 360) + 360) % 360) < 90 || Math.round(((rotationY % 360) + 360) % 360) > 270
}

export function sidewalkLaneFor(slug: string): number {
  return facesPositiveZ(getPlacement(slug).rotationY) ? NEAR_SIDEWALK.lane : FAR_SIDEWALK.lane
}

// The spot on the sidewalk in front of a location's door.
export function doorstep(slug: string): { x: number; z: number } {
  const placement = getPlacement(slug)
  const exterior = getLocation(slug).exterior
  const near = facesPositiveZ(placement.rotationY)
  // door.offsetX is voxels from front-face center; a 180° rotation mirrors x
  const doorX = placement.position[0] + exterior.door.offsetX * VOXEL * (near ? 1 : -1)
  return { x: doorX, z: near ? NEAR_SIDEWALK.lane : FAR_SIDEWALK.lane }
}

// Sidewalk polyline between two doorsteps. Same side: straight shot. Opposite
// sides: walk to a crossing point, cross the road, continue. Returned as [x,z] pairs.
export function routePath(from: string, to: string): [number, number][] {
  const a = doorstep(from)
  const b = doorstep(to)
  if (a.z === b.z) return [[a.x, a.z], [b.x, b.z]]
  const extent = streetExtent()
  const crossX = Math.min(Math.max((a.x + b.x) / 2, extent.minX + 2), extent.maxX - 2)
  return [
    [a.x, a.z],
    [crossX, a.z],
    [crossX, b.z],
    [b.x, b.z],
  ]
}
