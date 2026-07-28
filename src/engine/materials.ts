import * as THREE from 'three'

// Shared material cache for character parts: one MeshLambertMaterial per hex color,
// reused across every walker and named character. Keeps material count ~a dozen
// regardless of population.
const cache = new Map<string, THREE.MeshLambertMaterial>()

export function getVoxelMaterial(hex: string): THREE.MeshLambertMaterial {
  let material = cache.get(hex)
  if (!material) {
    material = new THREE.MeshLambertMaterial({ color: hex })
    cache.set(hex, material)
  }
  return material
}

// One unit cube shared by every character part (scaled per part).
export const unitBox = new THREE.BoxGeometry(1, 1, 1)
