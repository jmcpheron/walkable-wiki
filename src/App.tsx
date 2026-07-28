import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useStore } from './model/store'
import { episodes } from './model/content'
import { hashFor, initialRouteFromHash, parseHash, parseRetroHash } from './model/router'
import { RetroView } from './renderers/vignette/RetroView'
import { Town } from './renderers/iso/Town'
import { WikiPanel } from './ui/WikiPanel'
import { ViewToggle } from './ui/ViewToggle'
import { EpisodePicker } from './ui/EpisodePicker'
import { RouteCaption } from './ui/RouteCaption'
import { BootOverlay } from './ui/BootOverlay'
import { ControlsHint } from './ui/ControlsHint'
import { Disclaimer } from './ui/Disclaimer'
import { FacadeEditor } from './editor/FacadeEditor'

export default function App() {
  const [editorMode, setEditorMode] = useState(window.location.hash === '#/editor')
  const [retroSlug, setRetroSlug] = useState(() => parseRetroHash(window.location.hash))
  useEffect(() => {
    const onHash = () => {
      setEditorMode(window.location.hash === '#/editor')
      setRetroSlug(parseRetroHash(window.location.hash))
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Deep links: apply the initial #/loc|char|ep route, mirror selection back to the
  // hash, and follow external hash edits (back button, pasted links).
  useEffect(() => {
    const initial = initialRouteFromHash()
    if (initial) useStore.getState().select(initial.kind, initial.slug)

    const unsubscribe = useStore.subscribe((state, prev) => {
      if (state.selection !== prev.selection) {
        history.replaceState(null, '', hashFor(state.selection))
      }
    })
    const onHashChange = () => {
      const route = parseHash(window.location.hash)
      const { selection, select, clearSelection } = useStore.getState()
      if (!route) {
        if (selection) clearSelection()
        return
      }
      if (route.kind !== selection?.kind || route.slug !== selection?.slug) {
        select(route.kind, route.slug)
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => {
      unsubscribe()
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])

  if (editorMode) return <FacadeEditor />
  if (retroSlug && episodes[retroSlug]) return <RetroView key={retroSlug} slug={retroSlug} />

  return (
    <>
      <Canvas orthographic dpr={[1, 2]} camera={{ zoom: 40, near: 0.1, far: 500 }}>
        {/* must be a direct Canvas child so it attaches to the scene, not a group */}
        <color attach="background" args={['#a8d3e6']} />
        <Town />
      </Canvas>
      <EpisodePicker />
      <RouteCaption />
      <WikiPanel />
      <ViewToggle />
      <ControlsHint />
      <BootOverlay />
      <Disclaimer />
    </>
  )
}
