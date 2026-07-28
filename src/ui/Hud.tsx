import { useStore } from '../engine/store'

export function Hud() {
  const locked = useStore((s) => s.locked)
  const activeWiki = useStore((s) => s.activeWiki)
  const nearDoor = useStore((s) => s.nearDoor)
  const hoveredHotspot = useStore((s) => s.hoveredHotspot)
  const phase = useStore((s) => s.phase)

  // Hotspot you're looking at wins over the door you're standing near.
  const prompt = hoveredHotspot
    ? `Press E — ${hoveredHotspot.wiki.title}`
    : nearDoor
      ? `Press E — ${nearDoor.label ?? 'Use door'}`
      : null

  return (
    <>
      {locked && <div className="crosshair" />}
      {locked && prompt && !activeWiki && phase === 'idle' && (
        <div className="prompt">{prompt}</div>
      )}
      {!locked && !activeWiki && (
        <div className="start-overlay">
          <h1>Seymour's Bay 3D</h1>
          <p>Click anywhere to start walking</p>
          <p className="controls-hint">
            WASD / arrows to move &middot; mouse to look &middot; E to interact &middot; Esc to
            release the mouse
          </p>
        </div>
      )}
    </>
  )
}
