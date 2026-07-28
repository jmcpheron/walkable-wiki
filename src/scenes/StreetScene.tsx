import { Sky, Text } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { locations, street } from '../engine/content'
import { Door } from '../engine/Door'
import type { LocationManifest } from '../engine/manifest'

const STREET_LENGTH = 40
const STREET_DEPTH = 24
const BOUNDS_HEIGHT = 3

// The street hub, assembled entirely from content/street.json + location manifests.
// Adding a building to the street is a content PR, never an engine change.
export function StreetScene() {
  return (
    <group>
      <Sky sunPosition={[40, 30, 20]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[15, 20, 10]} intensity={1.2} />

      <RigidBody type="fixed" colliders={false}>
        {/* sidewalk slab */}
        <CuboidCollider args={[STREET_LENGTH / 2, 0.1, STREET_DEPTH / 2]} position={[0, -0.1, 0]} />
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[STREET_LENGTH, 0.1, STREET_DEPTH]} />
          <meshStandardMaterial color="#9aa0a6" />
        </mesh>
        {/* road strip */}
        <mesh position={[0, 0.001, 3]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[STREET_LENGTH, 6]} />
          <meshStandardMaterial color="#5f6368" />
        </mesh>
        {/* invisible bounds so the museum stroll stays in the museum */}
        <CuboidCollider args={[0.5, BOUNDS_HEIGHT, STREET_DEPTH / 2]} position={[-STREET_LENGTH / 2, BOUNDS_HEIGHT, 0]} />
        <CuboidCollider args={[0.5, BOUNDS_HEIGHT, STREET_DEPTH / 2]} position={[STREET_LENGTH / 2, BOUNDS_HEIGHT, 0]} />
        <CuboidCollider args={[STREET_LENGTH / 2, BOUNDS_HEIGHT, 0.5]} position={[0, BOUNDS_HEIGHT, -STREET_DEPTH / 2]} />
        <CuboidCollider args={[STREET_LENGTH / 2, BOUNDS_HEIGHT, 0.5]} position={[0, BOUNDS_HEIGHT, STREET_DEPTH / 2]} />
      </RigidBody>

      {street.placements.map((p) => (
        <BuildingExterior
          key={p.slug}
          manifest={locations[p.slug]}
          position={p.position}
          rotationY={p.rotationY}
        />
      ))}
    </group>
  )
}

function BuildingExterior({
  manifest,
  position,
  rotationY,
}: {
  manifest: LocationManifest
  position: [number, number]
  rotationY: number
}) {
  const [width, depth, height] = manifest.exterior.footprint
  return (
    <group position={[position[0], 0, position[1]]} rotation-y={(rotationY * Math.PI) / 180}>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, height / 2, 0]}>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={manifest.exterior.color} />
        </mesh>
      </RigidBody>
      <Text
        position={[0, height + 0.6, depth / 2]}
        fontSize={0.6}
        color="#1d1d1f"
        outlineWidth={0.02}
        outlineColor="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {manifest.name}
      </Text>
      <Door def={manifest.exterior.door} />
    </group>
  )
}
