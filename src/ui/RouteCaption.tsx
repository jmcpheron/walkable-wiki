import { useStore } from '../model/store'
import { episodes } from '../model/content'
import { castAppearance } from '../model/appearance'
import { renderInline } from './markdownish'

// Bottom-center caption during episode playback: current scene's title, note,
// and who's on screen.
export function RouteCaption() {
  const episode = useStore((s) => s.episode)
  const noteText = useStore((s) => s.noteText)
  if (!episode) return null
  const scene = episodes[episode.slug]?.scenes[episode.sceneIndex]
  if (!scene || (!noteText && !scene.title)) return null
  const castNames = scene.characters.map((slug) => castAppearance(slug).name)
  return (
    <div className="route-caption">
      {scene.title && <div className="route-caption-title">{scene.title}</div>}
      {noteText && <div>{renderInline(noteText)}</div>}
      {castNames.length > 0 && <div className="route-caption-cast">with {castNames.join(', ')}</div>}
    </div>
  )
}
