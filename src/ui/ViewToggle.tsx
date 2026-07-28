import { useStore } from '../engine/store'

// RCT-style view flip: swings the camera 180° so the far side of the street shows
// its storefronts (a fixed iso angle can only ever face one side's facades).
export function ViewToggle() {
  const toggleView = useStore((s) => s.toggleView)
  return (
    <div className="corner-buttons">
      <a className="corner-button" href="#/editor" title="Paint a building facade">
        🧱 Editor
      </a>
      <button
        className="corner-button"
        onClick={toggleView}
        title="Look at the other side of the street"
      >
        ⟲ Other side
      </button>
    </div>
  )
}
