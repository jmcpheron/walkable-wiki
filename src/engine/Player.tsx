import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import { CapsuleCollider, RigidBody, useRapier, type RapierRigidBody } from '@react-three/rapier'
import { QueryFilterFlags } from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import { useStore, selectCanMove } from './store'
import type { SpawnDef } from './manifest'

// Movement feel — deliberately a museum stroll, not a shooter (see docs/m1-notes.md).
const WALK_SPEED = 3.2 // m/s
const ACCEL = 10 // exponential smoothing rate; higher = snappier starts/stops
const FALL_SPEED = 8 // constant downward pull; the controller's snap-to-ground does the rest
const CAPSULE_RADIUS = 0.35
const CAPSULE_HALF_HEIGHT = 0.5 // cylinder section; total capsule ≈ 1.7 m tall
const EYE_HEIGHT = 1.6

const CAPSULE_CENTER_Y = CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS
const UP = new THREE.Vector3(0, 1, 0)

// First-person walking player: kinematic capsule moved by Rapier's character
// controller (wall sliding, autostep, ground snap). The camera rig is the last two
// lines of the frame loop — swapping to third-person later means replacing only that.
export function Player({ spawn }: { spawn: SpawnDef }) {
  const body = useRef<RapierRigidBody>(null)
  const { world } = useRapier()
  const camera = useThree((s) => s.camera)
  const [, getKeys] = useKeyboardControls()
  const velocity = useRef(new THREE.Vector3())

  const controller = useMemo(() => {
    const c = world.createCharacterController(0.01)
    c.enableAutostep(0.4, 0.2, true)
    c.enableSnapToGround(0.4)
    c.setMaxSlopeClimbAngle((50 * Math.PI) / 180)
    return c
  }, [world])
  useEffect(() => () => world.removeCharacterController(controller), [world, controller])

  // Face the spawn direction (yaw in degrees; 0 looks down -Z).
  // PointerLockControls reads/writes the camera quaternion, so presetting it works.
  useEffect(() => {
    camera.rotation.order = 'YXZ'
    camera.rotation.set(0, (spawn.yaw * Math.PI) / 180, 0)
  }, [camera, spawn])

  useFrame((state, rawDelta) => {
    const rb = body.current
    if (!rb) return
    const delta = Math.min(rawDelta, 0.1) // clamp tab-switch frame spikes
    const canMove = selectCanMove(useStore.getState())

    const { forward, back, left, right } = getKeys()
    const input = new THREE.Vector3(
      (right ? 1 : 0) - (left ? 1 : 0),
      0,
      (back ? 1 : 0) - (forward ? 1 : 0)
    )
    if (input.lengthSq() > 0) input.normalize()
    const yaw = new THREE.Euler().setFromQuaternion(state.camera.quaternion, 'YXZ').y
    input.applyAxisAngle(UP, yaw)

    const targetVelocity = canMove ? input.multiplyScalar(WALK_SPEED) : input.set(0, 0, 0)
    velocity.current.lerp(targetVelocity, 1 - Math.exp(-ACCEL * delta))

    const desired = {
      x: velocity.current.x * delta,
      y: -FALL_SPEED * delta,
      z: velocity.current.z * delta,
    }
    controller.computeColliderMovement(rb.collider(0), desired, QueryFilterFlags.EXCLUDE_SENSORS)
    const move = controller.computedMovement()
    const pos = rb.translation()
    const next = { x: pos.x + move.x, y: pos.y + move.y, z: pos.z + move.z }
    rb.setNextKinematicTranslation(next)

    // First-person rig: eye sits near the top of the capsule.
    state.camera.position.set(next.x, next.y - CAPSULE_CENTER_Y + EYE_HEIGHT, next.z)
  })

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={[
        spawn.position[0],
        spawn.position[1] + CAPSULE_CENTER_Y + 0.05,
        spawn.position[2],
      ]}
    >
      <CapsuleCollider args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]} />
    </RigidBody>
  )
}
