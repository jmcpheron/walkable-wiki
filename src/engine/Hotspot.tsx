import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from './store'
import type { HotspotDef } from './manifest'

// Pointer lock pins the cursor to screen center, so R3F's usual pointer events can't
// hover things. Instead, hotspot meshes register here and HotspotRaycaster picks
// whatever the crosshair is looking at each frame.
const registry = new Map<THREE.Object3D, HotspotDef>()

export function Hotspot({ def }: { def: HotspotDef }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const hovered = useStore((s) => s.hoveredHotspot === def)

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    registry.set(mesh, def)
    return () => {
      registry.delete(mesh)
    }
  }, [def])

  return (
    <group position={def.position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial
          color={hovered ? '#ffd23f' : '#3fa7d6'}
          emissive={hovered ? '#ffd23f' : '#1c5d7a'}
          emissiveIntensity={hovered ? 1.1 : 0.5}
        />
      </mesh>
      <Billboard position={[0, 0.4, 0]}>
        <Text
          fontSize={0.22}
          color={hovered ? '#ffd23f' : 'white'}
          outlineWidth={0.012}
          outlineColor="#000000"
          anchorX="center"
          anchorY="middle"
        >
          ?
        </Text>
      </Billboard>
    </group>
  )
}

const CENTER = new THREE.Vector2(0, 0)
const MAX_INTERACT_DISTANCE = 4.5

export function HotspotRaycaster() {
  const raycaster = useMemo(() => {
    const r = new THREE.Raycaster()
    r.far = MAX_INTERACT_DISTANCE
    return r
  }, [])

  useFrame(({ camera }) => {
    const store = useStore.getState()
    let hit: HotspotDef | null = null
    if (registry.size > 0) {
      raycaster.setFromCamera(CENTER, camera)
      const intersections = raycaster.intersectObjects([...registry.keys()], false)
      hit = intersections.length > 0 ? (registry.get(intersections[0].object) ?? null) : null
    }
    if (store.hoveredHotspot !== hit) store.setHoveredHotspot(hit)
  })

  return null
}
