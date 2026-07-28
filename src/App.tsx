import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { useStore } from './engine/store'
import { hashFor, initialRouteFromHash, parseHash } from './engine/router'
import { Town } from './world/Town'
import { WikiPanel } from './ui/WikiPanel'
import { ViewToggle } from './ui/ViewToggle'
import { Disclaimer } from './ui/Disclaimer'

export default function App() {
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

  return (
    <>
      <Canvas orthographic dpr={[1, 2]} camera={{ zoom: 40, near: 0.1, far: 500 }}>
        {/* must be a direct Canvas child so it attaches to the scene, not a group */}
        <color attach="background" args={['#a8d3e6']} />
        <Town />
      </Canvas>
      <WikiPanel />
      <ViewToggle />
      <Disclaimer />
    </>
  )
}
