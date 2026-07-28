import { useEffect, useState } from 'react'
import { tips } from '../model/content'
import { useStore } from '../model/store'
import { renderInline } from './markdownish'

const MIN_HOLD_MS = 1600
const FADE_MS = 700

// One-shot boot veil: "Now entering Ocean Avenue" plus one random tip while the
// scene compiles its first frames. Successor to the old door-travel loading screen —
// same visual language, and the natural place to gate real asset loads later.
export function BootOverlay() {
  const booted = useStore((s) => s.booted)
  const [tip] = useState(() => tips[Math.floor(Math.random() * tips.length)])
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const hold = setTimeout(() => {
      useStore.getState().setBooted()
      setTimeout(() => setGone(true), FADE_MS + 50)
    }, MIN_HOLD_MS)
    return () => clearTimeout(hold)
  }, [])

  if (gone) return null
  return (
    <div
      className="fade-overlay"
      style={{ opacity: booted ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
      aria-hidden="true"
    >
      <div className="loading-card">
        <p className="loading-kicker">Now entering</p>
        <h2 className="loading-destination">Ocean Avenue</h2>
        {tip && (
          <p className="loading-tip">
            <span className="loading-tip-label">Tip</span>
            {renderInline(tip)}
          </p>
        )}
      </div>
    </div>
  )
}
