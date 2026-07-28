import { useEffect } from 'react'
import { useKeyboardControls } from '@react-three/drei'
import { useStore } from './store'
import type { WikiContent } from './manifest'

// One place decides what E (or a click) means right now, in priority order:
// close an open panel → read the hotspot you're looking at → use the door you're
// standing at (travel if it has a target, otherwise open its wiki panel).
function interact() {
  const s = useStore.getState()
  if (s.phase !== 'idle') return
  if (s.activeWiki) {
    s.closeWiki()
    return
  }
  if (s.hoveredHotspot) {
    openWikiAndReleasePointer(s.hoveredHotspot.wiki)
    return
  }
  if (s.nearDoor) {
    if (s.nearDoor.target) s.requestTravel(s.nearDoor.target.scene, s.nearDoor.target.spawn)
    else if (s.nearDoor.wiki) openWikiAndReleasePointer(s.nearDoor.wiki)
  }
}

// Reading happens outside pointer lock so the panel is scrollable/clickable;
// the HUD then invites a click to re-capture the mouse.
function openWikiAndReleasePointer(wiki: WikiContent) {
  useStore.getState().openWiki(wiki)
  document.exitPointerLock()
}

export function InteractionManager() {
  const [subscribeKeys] = useKeyboardControls()

  useEffect(
    () =>
      subscribeKeys(
        (state) => state.interact,
        (pressed) => {
          if (pressed) interact()
        }
      ),
    [subscribeKeys]
  )

  // While locked, a mouse click on a hovered hotspot also opens it.
  useEffect(() => {
    const onClick = () => {
      if (!document.pointerLockElement) return
      const { hoveredHotspot, phase } = useStore.getState()
      if (phase === 'idle' && hoveredHotspot) openWikiAndReleasePointer(hoveredHotspot.wiki)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return null
}
