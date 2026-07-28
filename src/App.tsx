import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { KeyboardControls, PointerLockControls } from '@react-three/drei'
import { SceneRoot } from './engine/SceneRoot'
import { InteractionManager } from './engine/InteractionManager'
import { useStore } from './engine/store'
import { hashForScene, parseHash } from './engine/router'
import { locations } from './engine/content'
import { Hud } from './ui/Hud'
import { WikiPanel } from './ui/WikiPanel'
import { FadeOverlay } from './ui/FadeOverlay'
import { Disclaimer } from './ui/Disclaimer'

const KEY_MAP = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'back', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'right', keys: ['KeyD', 'ArrowRight'] },
  { name: 'interact', keys: ['KeyE'] },
]

export default function App() {
  const setLocked = useStore((s) => s.setLocked)

  // Deep links: keep #/loc/<slug> in sync with the active scene, and follow
  // hash edits (back button, pasted links) by travelling there.
  useEffect(() => {
    const unsubscribe = useStore.subscribe((state, prev) => {
      if (state.scene !== prev.scene) history.replaceState(null, '', hashForScene(state.scene))
    })
    const onHashChange = () => {
      const slug = parseHash(window.location.hash)
      const target = slug && locations[slug]?.interior ? slug : 'street'
      const { scene, requestTravel } = useStore.getState()
      if (target !== scene) {
        requestTravel(target, target === 'street' ? 'street-entry' : 'entry')
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => {
      unsubscribe()
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])

  return (
    <KeyboardControls map={KEY_MAP}>
      <Canvas camera={{ fov: 70, near: 0.1, far: 300 }}>
        <SceneRoot />
        {/* Lives at Canvas level (not in Player) so scene remounts never drop the lock */}
        <PointerLockControls onLock={() => setLocked(true)} onUnlock={() => setLocked(false)} />
      </Canvas>
      <InteractionManager />
      <Hud />
      <WikiPanel />
      <FadeOverlay />
      <Disclaimer />
    </KeyboardControls>
  )
}
