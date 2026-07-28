import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import type { LocationManifest } from '../../model/manifest'
import { VOXEL, buildVoxelGeometry } from './voxel'
import { buildingBoxes } from './buildingBoxes'
import { useStore } from '../../model/store'
import { useIsoStore } from './isoStore'
import { episodes } from '../../model/content'

// One voxel building: a single merged geometry (one draw call), a drei Text sign,
// and an invisible click-target box. The merged mesh never raycasts — the click box
// (~1 intersection test) does, keeping pointer events cheap.
export function Building({
  manifest,
  position,
  rotationY,
}: {
  manifest: LocationManifest
  position: [number, number]
  rotationY: number
}) {
  const { slug, exterior } = manifest
  const geometry = useMemo(() => buildVoxelGeometry(buildingBoxes(exterior)), [exterior])
  const material = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true }),
    []
  )
  const [w, d, h] = exterior.size

  const select = useStore((s) => s.select)
  const setHovered = useIsoStore((s) => s.setHovered)
  const glow = useRef(0)

  // Highlight priority: episode route pulse > selected > hovered. Written straight
  // to the material's emissive each frame — no React re-renders involved.
  useFrame(({ clock }) => {
    const s = useStore.getState()
    const onRoute =
      s.episode && routeIncludes(s.episode.slug, s.episode.sceneIndex, s.episode.status, slug)
    const target = onRoute === 'current'
      ? 0.22 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 4))
      : onRoute === 'visited'
        ? 0.08
        : s.selection?.kind === 'location' && s.selection.slug === slug
          ? 0.14
          : useIsoStore.getState().hovered === `loc:${slug}`
            ? 0.08
            : 0
    glow.current += (target - glow.current) * 0.2
    material.emissive.setScalar(glow.current)
  })

  return (
    <group position={[position[0], 0, position[1]]} rotation-y={(rotationY * Math.PI) / 180}>
      <mesh geometry={geometry} material={material} raycast={() => null} />
      <Text
        // 0.5 clears the deepest facade panels (depth 3 ≈ 1 voxel proud)
        position={[0, (exterior.signY ?? 5.5) * VOXEL, (d / 2) * VOXEL + 0.52]}
        fontSize={signFontSize(exterior.signText ?? manifest.name, w)}
        color={exterior.signColor ?? '#2b2620'}
        anchorX="center"
        anchorY="middle"
        whiteSpace="nowrap"
      >
        {exterior.signText ?? manifest.name}
      </Text>
      {/* invisible click target — invisible meshes still raycast */}
      <mesh
        visible={false}
        position={[0, (h / 2) * VOXEL, 0]}
        onClick={(e) => {
          if (e.delta > 5) return
          e.stopPropagation()
          select('location', slug)
        }}
        onPointerOver={() => setHovered(`loc:${slug}`)}
        onPointerOut={() => {
          if (useIsoStore.getState().hovered === `loc:${slug}`) setHovered(null)
        }}
      >
        <boxGeometry args={[(w + 2) * VOXEL, h * VOXEL, (d + 2) * VOXEL]} />
      </mesh>
    </group>
  )
}

// Fit the sign text inside the sign band: never wrap, shrink to the building width.
function signFontSize(text: string, widthVoxels: number): number {
  const maxWidth = (widthVoxels - 1) * VOXEL
  return Math.min(1.5 * VOXEL, maxWidth / (0.62 * Math.max(1, text.length)))
}

function routeIncludes(
  episodeSlug: string,
  sceneIndex: number,
  status: string,
  slug: string
): 'current' | 'visited' | false {
  const scenes = episodes[episodeSlug]?.scenes
  if (!scenes) return false
  if (status !== 'done' && scenes[sceneIndex]?.location === slug) return 'current'
  const anyIndex = scenes.findIndex((scene) => scene.location === slug)
  if (anyIndex === -1) return false
  if (status === 'done') return 'visited'
  return anyIndex < sceneIndex ? 'visited' : false
}
