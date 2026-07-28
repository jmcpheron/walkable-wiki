import { create } from 'zustand'
import type { WikiContent } from './manifest'
import { characters, episodes, locations } from './content'
import { doorstep } from '../world/layout'

export type SelectionKind = 'location' | 'character' | 'episode'
export type Selection = { kind: SelectionKind; slug: string } | null

export interface EpisodePlayback {
  slug: string
  runId: number // increments per playback so a replay remounts the courier fresh
  legIndex: number // which route stop the courier is heading to (or paused at)
  progress: number // 0..1 within the current leg, for observability/tests
  status: 'walking' | 'paused' | 'done'
}

// One store for all cross-cutting state. zustand (not React context) because the
// camera rig, walkers, and episode playback read/write every frame via getState() —
// a plain read with no re-render, whereas context would re-render the canvas tree.
interface WorldState {
  selection: Selection
  activeWiki: WikiContent | null
  hovered: string | null // e.g. 'loc:bobs-burgers' / 'char:bob' — drives the cursor
  zoom: number
  focusRequest: { x: number; z: number; seq: number } | null // camera pans here when seq changes
  episode: EpisodePlayback | null
  noteText: string | null // current route-stop caption
  booted: boolean // boot overlay has been dismissed
  viewFlipped: boolean // camera swung 180° to face the far side's storefronts

  select: (kind: SelectionKind, slug: string) => void
  clearSelection: () => void
  closeWiki: () => void
  setHovered: (hovered: string | null) => void
  setZoom: (zoom: number) => void
  requestFocus: (x: number, z: number) => void
  setBooted: () => void
  toggleView: () => void
  playEpisode: (slug: string) => void
  stopEpisode: () => void
  _tickEpisode: (patch: Partial<EpisodePlayback>) => void
  setNote: (noteText: string | null) => void
}

export const useStore = create<WorldState>((set, get) => ({
  selection: null,
  activeWiki: null,
  hovered: null,
  zoom: 40,
  focusRequest: null,
  episode: null,
  noteText: null,
  booted: false,
  viewFlipped: false,

  select: (kind, slug) => {
    if (kind === 'location') {
      const loc = locations[slug]
      if (!loc) return
      const step = doorstep(slug)
      set({ selection: { kind, slug }, activeWiki: loc.wiki })
      get().requestFocus(step.x, step.z)
    } else if (kind === 'character') {
      const char = characters[slug]
      if (!char) return
      const step = doorstep(char.at.location)
      set({ selection: { kind, slug }, activeWiki: char.wiki })
      get().requestFocus(step.x, step.z)
    } else {
      const ep = episodes[slug]
      if (!ep) return
      set({ selection: { kind, slug }, activeWiki: ep.wiki })
      get().playEpisode(slug)
      const start = doorstep(ep.route[0].location)
      get().requestFocus(start.x, start.z)
    }
  },
  clearSelection: () => {
    get().stopEpisode()
    set({ selection: null, activeWiki: null, noteText: null })
  },
  // Closing the panel keeps an episode playing — you can watch the walk uncluttered.
  closeWiki: () => set({ activeWiki: null }),

  setHovered: (hovered) => set({ hovered }),
  setZoom: (zoom) => set({ zoom }),
  requestFocus: (x, z) => set({ focusRequest: { x, z, seq: (get().focusRequest?.seq ?? 0) + 1 } }),
  setBooted: () => set({ booted: true }),
  toggleView: () => set({ viewFlipped: !get().viewFlipped }),

  playEpisode: (slug) =>
    set({
      episode: {
        slug,
        runId: (get().episode?.runId ?? 0) + 1,
        legIndex: 0,
        progress: 0,
        status: 'walking',
      },
      noteText: null,
    }),
  stopEpisode: () => {
    if (get().episode) set({ episode: null, noteText: null })
  },
  _tickEpisode: (patch) => {
    const episode = get().episode
    if (episode) set({ episode: { ...episode, ...patch } })
  },
  setNote: (noteText) => set({ noteText }),
}))
