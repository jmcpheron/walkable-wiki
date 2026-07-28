import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../model/store'
import { useIsoStore } from './isoStore'
import { streetExtent } from '../../model/layout'

// Classic tycoon camera: a fixed 45° yaw at 30° elevation (dimetric-ish — keeps
// storefronts tall), orthographic projection, drag/arrow pan, wheel zoom. The one
// rotation allowed is the RCT-style "flip": a smooth 180° swing so the far side of
// the street can show its storefronts too.
const BASE_YAW = Math.PI / 4
const ELEVATION = Math.PI / 6
const CAMERA_DISTANCE = 120 // only affects clipping, not framing (orthographic)
const PAN_SPEED = 22 // world units/sec for arrow keys
const Z_BOUNDS = { min: -14, max: 12 }

export function IsoCameraRig() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const extent = useMemo(() => streetExtent(), [])

  const yaw = useRef(BASE_YAW) // animated toward BASE_YAW or BASE_YAW + π
  const desired = useRef(new THREE.Vector3(0, 0, -1))
  const target = useRef(new THREE.Vector3(0, 0, -1))
  const keys = useRef(new Set<string>())
  const consumedFocusSeq = useRef(0)
  const dragging = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(null)

  // reusable vectors, recomputed from the animated yaw each use
  const camDir = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())
  const groundUp = useRef(new THREE.Vector3())
  const updateBasis = () => {
    const y = yaw.current
    camDir.current.set(Math.sin(y) * Math.cos(ELEVATION), Math.sin(ELEVATION), Math.cos(y) * Math.cos(ELEVATION))
    right.current.set(Math.cos(y), 0, -Math.sin(y))
    groundUp.current.set(-Math.sin(y), 0, -Math.cos(y))
  }

  // zoom clamps derived from the street, not hardcoded: min fits the whole block,
  // max frames roughly one storefront (~14 world units across)
  const zoomMin = size.width / (extent.maxX - extent.minX + 12)
  const zoomMax = size.width / 14

  useEffect(() => {
    const el = gl.domElement

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      dragging.current = { pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY }
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        // synthetic events (tests) have no capturable pointer — drag still works
      }
      document.body.style.cursor = 'grabbing'
    }
    const onPointerMove = (e: PointerEvent) => {
      const drag = dragging.current
      if (!drag || e.pointerId !== drag.pointerId) return
      const dx = e.clientX - drag.lastX
      const dy = e.clientY - drag.lastY
      drag.lastX = e.clientX
      drag.lastY = e.clientY
      const zoom = useIsoStore.getState().zoom
      updateBasis()
      desired.current
        .addScaledVector(right.current, -dx / zoom)
        .addScaledVector(groundUp.current, dy / (zoom * Math.sin(ELEVATION)))
    }
    const onPointerUp = (e: PointerEvent) => {
      if (dragging.current?.pointerId !== e.pointerId) return
      dragging.current = null
      document.body.style.cursor = useIsoStore.getState().hovered ? 'pointer' : ''
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const s = useIsoStore.getState()
      s.setZoom(Math.min(zoomMax, Math.max(zoomMin, s.zoom * Math.pow(0.999, e.deltaY))))
    }
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        if (down) keys.current.add(e.key)
        else keys.current.delete(e.key)
        e.preventDefault()
      }
    }
    const keyDown = onKey(true)
    const keyUp = onKey(false)

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
      el.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
    }
  }, [gl, zoomMin, zoomMax])

  // pointer cursor over clickables (unless mid-drag)
  useEffect(
    () =>
      useIsoStore.subscribe((s, prev) => {
        if (s.hovered !== prev.hovered && !dragging.current) {
          document.body.style.cursor = s.hovered ? 'pointer' : ''
        }
      }),
    []
  )

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    const store = useStore.getState()
    const damp = 1 - Math.exp(-8 * delta)

    // smooth 180° swing when the view is flipped
    const yawTarget = BASE_YAW + (useIsoStore.getState().viewFlipped ? Math.PI : 0)
    yaw.current += (yawTarget - yaw.current) * (1 - Math.exp(-5 * delta))

    // deep links / selection pan the camera here
    const focus = store.focusRequest
    if (focus && focus.seq !== consumedFocusSeq.current) {
      consumedFocusSeq.current = focus.seq
      desired.current.set(focus.x, 0, focus.z)
    }

    if (keys.current.size > 0) {
      const k = keys.current
      const dx = (k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0)
      const dy = (k.has('ArrowUp') ? 1 : 0) - (k.has('ArrowDown') ? 1 : 0)
      updateBasis()
      desired.current
        .addScaledVector(right.current, dx * PAN_SPEED * delta)
        .addScaledVector(groundUp.current, dy * PAN_SPEED * delta)
    }

    desired.current.x = Math.min(extent.maxX, Math.max(extent.minX, desired.current.x))
    desired.current.z = Math.min(Z_BOUNDS.max, Math.max(Z_BOUNDS.min, desired.current.z))
    target.current.lerp(desired.current, damp)

    updateBasis()
    const ortho = camera as THREE.OrthographicCamera
    ortho.position.copy(target.current).addScaledVector(camDir.current, CAMERA_DISTANCE)
    ortho.lookAt(target.current)
    const zoomNow = THREE.MathUtils.lerp(ortho.zoom, useIsoStore.getState().zoom, damp)
    if (Math.abs(zoomNow - ortho.zoom) > 0.001) {
      ortho.zoom = zoomNow
      ortho.updateProjectionMatrix()
    }
  })

  return null
}
