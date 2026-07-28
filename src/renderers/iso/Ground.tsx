import { useMemo } from 'react'
import * as THREE from 'three'
import { VOXEL, buildVoxelGeometry, type VoxelBox } from './voxel'
import { FAR_SIDEWALK, NEAR_SIDEWALK, ROAD, streetExtent } from '../../model/layout'
import { useStore } from '../../model/store'

const COLORS = {
  apron: '#9db27c', // scrubby coastal grass behind the building lines
  sidewalkA: '#b9bdc2',
  sidewalkB: '#b0b4ba',
  curb: '#8f949b',
  road: '#4a4d52',
  dash: '#d8d4c3',
}

// The whole ground strip is one merged geometry (one draw call). Derived entirely
// from street.json via layout.ts. A separate invisible plane catches background
// clicks for deselection.
export function Ground() {
  const clearSelection = useStore((s) => s.clearSelection)

  const geometry = useMemo(() => {
    const { minX, maxX } = streetExtent()
    const x0 = minX / VOXEL
    const spanX = (maxX - minX) / VOXEL
    const boxes: VoxelBox[] = []
    const slab = (zMinWorld: number, zMaxWorld: number, color: string, topY = 0) => {
      boxes.push({
        min: [x0, topY - 0.6, zMinWorld / VOXEL],
        size: [spanX, 0.6, (zMaxWorld - zMinWorld) / VOXEL],
        color,
      })
    }

    slab(-14, NEAR_SIDEWALK.zMin, COLORS.apron)
    slab(NEAR_SIDEWALK.zMin, NEAR_SIDEWALK.zMax, COLORS.sidewalkA)
    slab(ROAD.zMin, ROAD.zMax, COLORS.road)
    slab(FAR_SIDEWALK.zMin, FAR_SIDEWALK.zMax, COLORS.sidewalkA)
    slab(FAR_SIDEWALK.zMax, 16, COLORS.apron)

    // sidewalk checker: raise alternating 2x2-voxel tiles a hair for the tile read
    for (const band of [NEAR_SIDEWALK, FAR_SIDEWALK]) {
      const z0 = band.zMin / VOXEL
      const zTiles = Math.floor((band.zMax - band.zMin) / VOXEL / 2)
      const xTiles = Math.floor(spanX / 2)
      for (let tx = 0; tx < xTiles; tx++) {
        for (let tz = 0; tz < zTiles; tz++) {
          if ((tx + tz) % 2 === 0) continue
          boxes.push({
            min: [x0 + tx * 2, 0, z0 + tz * 2],
            size: [2, 0.04, 2],
            color: COLORS.sidewalkB,
          })
        }
      }
    }

    // curb lips at the road edges
    boxes.push({ min: [x0, 0, ROAD.zMin / VOXEL - 0.5], size: [spanX, 0.25, 0.5], color: COLORS.curb })
    boxes.push({ min: [x0, 0, ROAD.zMax / VOXEL], size: [spanX, 0.25, 0.5], color: COLORS.curb })

    // dashed center line
    const dashZ = (ROAD.zMin + ROAD.zMax) / 2 / VOXEL
    for (let x = x0 + 2; x < x0 + spanX - 3; x += 8) {
      boxes.push({ min: [x, 0, dashZ - 0.35], size: [3, 0.03, 0.7], color: COLORS.dash })
    }

    return buildVoxelGeometry(boxes)
  }, [])

  const material = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true }), [])

  return (
    <group>
      <mesh geometry={geometry} material={material} raycast={() => null} />
      {/* background click-catcher: click empty ground → deselect */}
      <mesh
        visible={false}
        rotation-x={-Math.PI / 2}
        position={[0, -0.01, 0]}
        onClick={(e) => {
          if (e.delta > 5) return
          clearSelection()
        }}
      >
        <planeGeometry args={[400, 120]} />
      </mesh>
    </group>
  )
}
