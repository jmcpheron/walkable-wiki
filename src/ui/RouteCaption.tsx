import { useStore } from '../engine/store'
import { renderInline } from './markdownish'

// Bottom-center caption during episode playback: the current stop's note.
export function RouteCaption() {
  const noteText = useStore((s) => s.noteText)
  const episode = useStore((s) => s.episode)
  if (!episode || !noteText) return null
  return <div className="route-caption">{renderInline(noteText)}</div>
}
