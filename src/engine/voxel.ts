import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// One voxel = 0.5 world units. "Voxel-ish" here means boxes snapped to the voxel
// grid, not thousands of unit cubes: a wall is one box, a window is one thin box
// sitting proud of it. A building is ~30-80 boxes, a person ~10.
export const VOXEL = 0.5

export interface VoxelBox {
  min: [number, number, number] // voxel coords, local, y up from ground
  size: [number, number, number] // in voxels
  color: string
}

// Merge a box list into one BufferGeometry with per-vertex colors — one draw call
// per building/ground strip. Colors go through THREE.Color.setStyle so the sRGB →
// linear conversion is applied; vertex color attributes are consumed as linear.
export function buildVoxelGeometry(boxes: VoxelBox[]): THREE.BufferGeometry {
  const color = new THREE.Color()
  const parts = boxes.map((box) => {
    const [w, h, d] = box.size
    const geometry = new THREE.BoxGeometry(w * VOXEL, h * VOXEL, d * VOXEL)
    geometry.translate(
      (box.min[0] + w / 2) * VOXEL,
      (box.min[1] + h / 2) * VOXEL,
      (box.min[2] + d / 2) * VOXEL
    )
    color.setStyle(box.color)
    const count = geometry.attributes.position.count
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geometry
  })
  const merged = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())
  if (!merged) throw new Error('buildVoxelGeometry: merge failed (empty box list?)')
  return merged
}
