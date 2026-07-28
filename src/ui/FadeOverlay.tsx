import { useEffect, useState } from 'react'
import { useStore } from '../engine/store'

// Full-screen black div that covers the scene swap when travelling through a door.
// The store drives a three-phase machine; this component owns the *timing*:
//
//   phase 'fade-out' → animate `opacity` 0 → 1, then call swapScenes()
//   phase 'fade-in'  → animate `opacity` 1 → 0, then call finishTransition()
//
export function FadeOverlay() {
  const phase = useStore((s) => s.phase)
  const swapScenes = useStore((s) => s.swapScenes)
  const finishTransition = useStore((s) => s.finishTransition)
  const [opacity, setOpacity] = useState(0)

  /* ────────────────────────────────────────────────────────────────────────
   * TODO(user): Transition timing — this block is reserved for you.
   *
   * Below is a placeholder that swaps scenes INSTANTLY (opacity snaps, no
   * animation). It works, but walking through a door feels like a hard cut.
   * Replace the body of this effect (~5–10 lines) with real timing.
   *
   * The contract: on 'fade-out', get the screen covered and then call
   * swapScenes(); on 'fade-in', clear the screen and then call
   * finishTransition(). Movement is already frozen while phase !== 'idle'.
   *
   * Decisions that are yours to make:
   *  • Duration — 200ms feels snappy, 400ms feels deliberate. (Asymmetric
   *    is allowed: quick fade-out, slower fade-in reads nicely.)
   *  • Easing — linear vs ease-in-out. The cheap route: give .fade-overlay
   *    a CSS `transition: opacity <duration> <easing>` in styles.css, set
   *    the opacity state, and setTimeout the store call to match. The fancy
   *    route: requestAnimationFrame with your own easing curve.
   *  • Swap point — swap at FULL black (nothing pops in on camera, feels a
   *    touch slower) or mid-fade (snappier, but the new scene may be visibly
   *    "arriving" behind a half-transparent veil). Full black is the safe
   *    default; mid-fade is the bolder choice.
   *
   * Gotcha: if you use setTimeout, clear it in the effect cleanup so a
   * rapid second travel can't fire a stale swap.
   * ──────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (phase === 'fade-out') {
      setOpacity(1)
      swapScenes() // placeholder: swap immediately — replace with animated fade
    } else if (phase === 'fade-in') {
      setOpacity(0)
      finishTransition() // placeholder: clear immediately
    }
  }, [phase, swapScenes, finishTransition])
  /* ──────────────────────────────────────────────────────────────────────── */

  return <div className="fade-overlay" style={{ opacity }} aria-hidden="true" />
}
