import { useEffect, useRef, useState } from 'react'
import { useStore } from '../engine/store'
import { locations, tips } from '../engine/content'
import { renderInline } from './markdownish'

// Door travel = a loading screen, not just a fade. Deliberate design (see docs/m1-notes.md):
// the hold is long enough to read one tip, and the tips double as the site's way of
// teaching what you can do here (and, later, absorbing real interior download time).
const FADE_OUT_MS = 450
const MIN_HOLD_MS = 2200 // full-black dwell; roomy enough to actually read a tip
const FADE_IN_MS = 650

export function FadeOverlay() {
  const phase = useStore((s) => s.phase)
  const scene = useStore((s) => s.scene)
  const pendingTravel = useStore((s) => s.pendingTravel)
  const swapScenes = useStore((s) => s.swapScenes)
  const revealScene = useStore((s) => s.revealScene)
  const finishTransition = useStore((s) => s.finishTransition)

  const [opaque, setOpaque] = useState(false)
  const [tipIndex, setTipIndex] = useState(0)
  const tipCycle = useRef<number[]>([])

  useEffect(() => {
    if (phase === 'fade-out') {
      // Draw the next tip from a reshuffled cycle: random order, no repeats until
      // every tip has been seen once.
      if (tipCycle.current.length === 0) tipCycle.current = shuffled(tips.length)
      setTipIndex(tipCycle.current.pop() ?? 0)
      setOpaque(true)
      const t = setTimeout(swapScenes, FADE_OUT_MS)
      return () => clearTimeout(t)
    }
    if (phase === 'loading') {
      // The new scene mounts, compiles shaders, and settles behind the veil.
      // M2+: when interiors are real GLB downloads, await them here and reveal
      // on ready — MIN_HOLD_MS then becomes a floor, not the whole story.
      const t = setTimeout(revealScene, MIN_HOLD_MS)
      return () => clearTimeout(t)
    }
    if (phase === 'fade-in') {
      setOpaque(false)
      const t = setTimeout(finishTransition, FADE_IN_MS)
      return () => clearTimeout(t)
    }
  }, [phase, swapScenes, revealScene, finishTransition])

  // While fading out we're still in the old scene, so the destination is the pending
  // travel target; after the swap it's the current scene.
  const destinationSlug = pendingTravel?.scene ?? scene
  const destinationName =
    destinationSlug === 'street'
      ? 'Ocean Avenue'
      : (locations[destinationSlug]?.name ?? destinationSlug)

  return (
    <div
      className="fade-overlay"
      style={{ opacity: opaque ? 1 : 0, transitionDuration: `${opaque ? FADE_OUT_MS : FADE_IN_MS}ms` }}
      aria-hidden="true"
    >
      {phase !== 'idle' && (
        <div className="loading-card">
          <p className="loading-kicker">Now entering</p>
          <h2 className="loading-destination">{destinationName}</h2>
          {tips.length > 0 && (
            <p className="loading-tip">
              <span className="loading-tip-label">Tip</span>
              {renderInline(tips[tipIndex])}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function shuffled(count: number): number[] {
  const order = Array.from({ length: count }, (_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}
