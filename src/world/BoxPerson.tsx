import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getVoxelMaterial, unitBox } from '../engine/materials'
import { VOXEL } from '../engine/voxel'

// One procedural voxel person shared by ambient walkers, named characters, and the
// episode courier. ~10 boxes: legs/torso/arms/head/hair(/hat). Owners drive pose
// imperatively via the exposed api each frame — no React churn while animating.

export interface PersonPalette {
  skin: string
  top: string
  bottom: string
  hair: string
  hat?: string
}

export interface PersonApi {
  group: THREE.Group
  setPose: (t: number, mode: 'walk' | 'idle') => void
}

interface Props {
  palette: PersonPalette
  heightVoxels?: number // adults ~4, kids ~3 (kids get a proportionally bigger head)
  onClick?: (e: { delta: number; stopPropagation: () => void }) => void
  onPointerOver?: () => void
  onPointerOut?: () => void
}

export const BoxPerson = forwardRef<PersonApi, Props>(function BoxPerson(
  { palette, heightVoxels = 4, onClick, onPointerOver, onPointerOut },
  ref
) {
  const H = heightVoxels * VOXEL // total height in world units
  const kid = heightVoxels < 3.5
  const head = (kid ? 0.3 : 0.24) * H
  const legH = 0.3 * H
  const torsoH = H - legH - head - 0.02

  const group = useRef<THREE.Group>(null!)
  const body = useRef<THREE.Group>(null!)
  const legL = useRef<THREE.Group>(null!)
  const legR = useRef<THREE.Group>(null!)
  const armL = useRef<THREE.Group>(null!)
  const armR = useRef<THREE.Group>(null!)

  useImperativeHandle(ref, () => ({
    group: group.current,
    setPose: (t, mode) => {
      if (mode === 'walk') {
        const swing = Math.sin(t * 8)
        body.current.position.y = 0.04 * H * Math.abs(Math.sin(t * 8))
        legL.current.rotation.x = 0.6 * swing
        legR.current.rotation.x = -0.6 * swing
        armL.current.rotation.x = -0.45 * swing
        armR.current.rotation.x = 0.45 * swing
      } else {
        body.current.position.y = 0.015 * H * Math.sin(t * 1.6)
        legL.current.rotation.x = 0
        legR.current.rotation.x = 0
        armL.current.rotation.x = 0.06 * Math.sin(t * 1.6)
        armR.current.rotation.x = -0.06 * Math.sin(t * 1.6 + 1)
      }
    },
  }))

  const materials = useMemo(
    () => ({
      skin: getVoxelMaterial(palette.skin),
      top: getVoxelMaterial(palette.top),
      bottom: getVoxelMaterial(palette.bottom),
      hair: getVoxelMaterial(palette.hair),
      hat: palette.hat ? getVoxelMaterial(palette.hat) : null,
    }),
    [palette]
  )

  const part = (
    material: THREE.Material,
    size: [number, number, number],
    position: [number, number, number]
  ) => <mesh geometry={unitBox} material={material} scale={size} position={position} raycast={() => null} />

  return (
    <group ref={group}>
      <group ref={body}>
        {/* legs pivot at the hip */}
        <group ref={legL} position={[-0.08 * H, legH, 0]}>
          {part(materials.bottom, [0.11 * H, legH, 0.13 * H], [0, -legH / 2, 0])}
        </group>
        <group ref={legR} position={[0.08 * H, legH, 0]}>
          {part(materials.bottom, [0.11 * H, legH, 0.13 * H], [0, -legH / 2, 0])}
        </group>
        {part(materials.top, [0.3 * H, torsoH, 0.17 * H], [0, legH + torsoH / 2, 0])}
        {/* arms pivot at the shoulder */}
        <group ref={armL} position={[-0.2 * H, legH + torsoH, 0]}>
          {part(materials.top, [0.08 * H, 0.28 * H, 0.1 * H], [0, -0.14 * H, 0])}
        </group>
        <group ref={armR} position={[0.2 * H, legH + torsoH, 0]}>
          {part(materials.top, [0.08 * H, 0.28 * H, 0.1 * H], [0, -0.14 * H, 0])}
        </group>
        {part(materials.skin, [head, head, head], [0, legH + torsoH + head / 2, 0])}
        {/* hair: cap + back panel */}
        {part(materials.hair, [head * 1.08, head * 0.32, head * 1.08], [0, legH + torsoH + head * 0.95, 0])}
        {part(materials.hair, [head * 1.08, head * 0.7, head * 0.2], [0, legH + torsoH + head * 0.6, -head * 0.46])}
        {materials.hat &&
          part(materials.hat, [head * 0.95, head * 0.55, head * 0.95], [0, legH + torsoH + head * 1.3, 0])}
      </group>
      {onClick && (
        <mesh
          visible={false}
          position={[0, H / 2, 0]}
          onClick={(e) => onClick(e)}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
        >
          <boxGeometry args={[0.5 * H, H * 1.15, 0.5 * H]} />
        </mesh>
      )}
    </group>
  )
})
