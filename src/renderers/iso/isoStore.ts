import { create } from 'zustand'

// Presentation state that only means something to the isometric voxel view.
// App-level state (selection, wiki, episode playback) lives in model/store.ts.
interface IsoState {
  zoom: number
  viewFlipped: boolean // camera swung 180° to face the far side's storefronts
  hovered: string | null // 'loc:<slug>' / 'char:<slug>' — drives the cursor
  setZoom: (zoom: number) => void
  toggleView: () => void
  setHovered: (hovered: string | null) => void
}

export const useIsoStore = create<IsoState>((set, get) => ({
  zoom: 40,
  viewFlipped: false,
  hovered: null,
  setZoom: (zoom) => set({ zoom }),
  toggleView: () => set({ viewFlipped: !get().viewFlipped }),
  setHovered: (hovered) => set({ hovered }),
}))
