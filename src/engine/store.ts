import { create } from 'zustand'
import type { DoorDef, HotspotDef, WikiContent } from './manifest'

export type TransitionPhase = 'idle' | 'fade-out' | 'loading' | 'fade-in'

// One store for all cross-cutting world state. zustand (not React context) because the
// player controller reads this every frame inside useFrame — getState() is a plain read
// with no re-render, whereas context would re-render the whole canvas tree.
interface WorldState {
  scene: string // 'street' or a location slug
  spawnId: string
  phase: TransitionPhase
  pendingTravel: { scene: string; spawn: string } | null
  activeWiki: WikiContent | null
  nearDoor: DoorDef | null
  hoveredHotspot: HotspotDef | null
  locked: boolean // pointer lock engaged

  requestTravel: (scene: string, spawn: string) => void
  swapScenes: () => void
  finishTransition: () => void
  openWiki: (wiki: WikiContent) => void
  closeWiki: () => void
  revealScene: () => void
  setNearDoor: (door: DoorDef | null) => void
  setHoveredHotspot: (hotspot: HotspotDef | null) => void
  setLocked: (locked: boolean) => void
}

export const useStore = create<WorldState>((set, get) => ({
  scene: 'street',
  spawnId: 'street-entry',
  phase: 'idle',
  pendingTravel: null,
  activeWiki: null,
  nearDoor: null,
  hoveredHotspot: null,
  locked: false,

  // Travel state machine, driven by FadeOverlay's timers:
  //   requestTravel → 'fade-out' (screen covers) → swapScenes → 'loading' (new scene
  //   mounts + compiles behind the veil, tip on screen) → revealScene → 'fade-in'
  //   (screen clears) → finishTransition → 'idle'.
  requestTravel: (scene, spawn) => {
    if (get().phase !== 'idle') return
    set({ phase: 'fade-out', pendingTravel: { scene, spawn } })
  },
  swapScenes: () => {
    const travel = get().pendingTravel
    if (!travel) return
    set({
      scene: travel.scene,
      spawnId: travel.spawn,
      pendingTravel: null,
      nearDoor: null, // sensors unmount with the old scene; never fire their exit events
      hoveredHotspot: null,
      phase: 'loading',
    })
  },
  revealScene: () => set({ phase: 'fade-in' }),
  finishTransition: () => set({ phase: 'idle' }),

  openWiki: (wiki) => set({ activeWiki: wiki }),
  closeWiki: () => set({ activeWiki: null }),
  setNearDoor: (nearDoor) => set({ nearDoor }),
  setHoveredHotspot: (hoveredHotspot) => set({ hoveredHotspot }),
  setLocked: (locked) => set({ locked }),
}))

export const selectCanMove = (s: WorldState) => s.phase === 'idle' && s.activeWiki === null
