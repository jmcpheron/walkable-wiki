import { RigidBody } from '@react-three/rapier'
import { Door } from '../engine/Door'
import { Hotspot } from '../engine/Hotspot'
import type { LocationManifest } from '../engine/manifest'

// Generic graybox interior driven entirely by a manifest: floor, four walls, ceiling,
// exit doors, hotspots. One component serves every location's interior.
export function InteriorScene({ manifest }: { manifest: LocationManifest }) {
  const interior = manifest.interior
  if (!interior) return null
  const [width, depth, height] = interior.size

  return (
    <group>
      <color attach="background" args={['#1e2028']} />
      <ambientLight intensity={0.65} />
      <pointLight position={[0, height - 0.4, 0]} intensity={30} distance={25} />

      <RigidBody type="fixed" colliders="cuboid">
        {/* floor */}
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[width, 0.1, depth]} />
          <meshStandardMaterial color="#8a7a5e" />
        </mesh>
        {/* ceiling */}
        <mesh position={[0, height + 0.05, 0]}>
          <boxGeometry args={[width, 0.1, depth]} />
          <meshStandardMaterial color="#efe9dc" />
        </mesh>
        {/* walls: back, front, left, right */}
        <mesh position={[0, height / 2, -depth / 2]}>
          <boxGeometry args={[width, height, 0.2]} />
          <meshStandardMaterial color={interior.color} />
        </mesh>
        <mesh position={[0, height / 2, depth / 2]}>
          <boxGeometry args={[width, height, 0.2]} />
          <meshStandardMaterial color={interior.color} />
        </mesh>
        <mesh position={[-width / 2, height / 2, 0]}>
          <boxGeometry args={[0.2, height, depth]} />
          <meshStandardMaterial color={interior.color} />
        </mesh>
        <mesh position={[width / 2, height / 2, 0]}>
          <boxGeometry args={[0.2, height, depth]} />
          <meshStandardMaterial color={interior.color} />
        </mesh>
      </RigidBody>

      {interior.doors.map((door) => (
        <Door key={door.id} def={door} facing={-1} />
      ))}
      {interior.hotspots.map((hotspot) => (
        <Hotspot key={hotspot.id} def={hotspot} />
      ))}
    </group>
  )
}
