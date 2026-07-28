import { CuboidCollider } from '@react-three/rapier'
import { ActiveCollisionTypes } from '@dimforge/rapier3d-compat'
import { Text } from '@react-three/drei'
import { useStore } from './store'
import type { DoorDef } from './manifest'

const DOOR_WIDTH = 1.2
const DOOR_HEIGHT = 2.2

// A door = visual slab + a sensor volume. Standing in the sensor sets `nearDoor`;
// committing is an explicit E-press (handled in InteractionManager) so nobody gets
// yanked through a doorway they were only walking past. Exit spawns are placed
// outside the sensor, which is what prevents arrive-and-instantly-return loops.
export function Door({ def, facing = 1 }: { def: DoorDef; facing?: 1 | -1 }) {
  const setNearDoor = useStore((s) => s.setNearDoor)
  const [x, y, z] = def.position
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, DOOR_HEIGHT / 2, 0]}>
        <boxGeometry args={[DOOR_WIDTH, DOOR_HEIGHT, 0.12]} />
        <meshStandardMaterial color="#5b4636" />
      </mesh>
      {def.label && (
        <Text
          position={[0, DOOR_HEIGHT + 0.35, facing * 0.1]}
          rotation-y={facing === 1 ? 0 : Math.PI}
          fontSize={0.28}
          color="white"
          outlineWidth={0.012}
          outlineColor="#000000"
          anchorX="center"
          anchorY="middle"
        >
          {def.label}
        </Text>
      )}
      <CuboidCollider
        sensor
        args={[1, 1.2, 1.1]}
        position={[0, 1.2, 0]}
        // Required for a fixed sensor to see the kinematic player capsule:
        activeCollisionTypes={ActiveCollisionTypes.DEFAULT | ActiveCollisionTypes.KINEMATIC_FIXED}
        onIntersectionEnter={() => setNearDoor(def)}
        onIntersectionExit={() => {
          if (useStore.getState().nearDoor === def) setNearDoor(null)
        }}
      />
    </group>
  )
}
