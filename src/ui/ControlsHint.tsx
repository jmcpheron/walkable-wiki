import { useEffect, useState } from 'react'
import { useStore } from '../engine/store'

// One quiet line of controls help, top-right, fading out after a few seconds.
export function ControlsHint() {
  const booted = useStore((s) => s.booted)
  const [gone, setGone] = useState(false)
  useEffect(() => {
    if (!booted) return
    const t = setTimeout(() => setGone(true), 9000)
    return () => clearTimeout(t)
  }, [booted])
  if (!booted || gone) return null
  return (
    <div className="controls-hint-bar">
      Drag to pan · scroll to zoom · click buildings &amp; people
    </div>
  )
}
