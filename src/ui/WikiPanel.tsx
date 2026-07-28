import { useEffect, type ReactNode } from 'react'
import { useStore } from '../model/store'
import { episodes, locations } from '../model/content'
import { castAppearance } from '../model/appearance'
import { describeRoom } from '../model/describe'
import { renderInline } from './markdownish'

// The wiki layer: a plain DOM overlay (never inside the canvas) rendering the
// markdown-ish manifest content. Kept to a tiny hand-rolled formatter in M1 —
// paragraphs, "## " headings, "- " lists, **bold** — a real renderer can land in M2.
export function WikiPanel() {
  const wiki = useStore((s) => s.activeWiki)
  const selection = useStore((s) => s.selection)
  const closeWiki = useStore((s) => s.closeWiki)

  useEffect(() => {
    if (!wiki) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeWiki()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [wiki, closeWiki])

  if (!wiki) return null

  return (
    <div className="wiki-panel" role="dialog" aria-label={wiki.title}>
      <div className="wiki-panel-header">
        <h2>{wiki.title}</h2>
        <button onClick={closeWiki} aria-label="Close panel">
          ×
        </button>
      </div>
      <div className="wiki-panel-body">
        {renderBody(wiki.body)}
        {selection?.kind === 'episode' && <EpisodeScenes slug={selection.slug} />}
        {selection?.kind === 'location' && <InsideSection slug={selection.slug} />}
      </div>
      <p className="wiki-panel-hint">Esc or × to close</p>
    </div>
  )
}

// Generated from the episode's scene data — the same plot points every renderer plays.
function EpisodeScenes({ slug }: { slug: string }) {
  const scenes = episodes[slug]?.scenes
  if (!scenes) return null
  return (
    <>
      <h3>Scenes</h3>
      <ol className="wiki-scenes">
        {scenes.map((scene, i) => (
          <li key={i}>
            {scene.title ? <strong>{scene.title}</strong> : null}
            {scene.title ? ' — ' : ''}
            {locations[scene.location]?.name ?? scene.location}
            {scene.characters.length > 0 && (
              <span className="wiki-scene-cast">
                {' '}
                ({scene.characters.map((c) => castAppearance(c).name).join(', ')})
              </span>
            )}
          </li>
        ))}
      </ol>
    </>
  )
}

// Generated from the location's semantic interior data.
function InsideSection({ slug }: { slug: string }) {
  const interior = locations[slug]?.interior
  if (!interior) return null
  return (
    <>
      <h3>Inside</h3>
      <ul>
        {interior.rooms.map((room) => (
          <li key={room.id}>
            <strong>{room.name}</strong>
            {describeRoom(room) ? ` — ${describeRoom(room)}` : ''}
          </li>
        ))}
      </ul>
    </>
  )
}

function renderBody(body: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let key = 0
  let listBuffer: string[] = []
  let paraBuffer: string[] = []

  const flush = () => {
    if (listBuffer.length) {
      nodes.push(
        <ul key={key++}>
          {listBuffer.map((item, j) => (
            <li key={j}>{renderInline(item)}</li>
          ))}
        </ul>
      )
      listBuffer = []
    }
    if (paraBuffer.length) {
      nodes.push(<p key={key++}>{renderInline(paraBuffer.join(' '))}</p>)
      paraBuffer = []
    }
  }

  for (const line of body.split('\n')) {
    if (line.trim() === '') flush()
    else if (line.startsWith('## ')) {
      flush()
      nodes.push(<h3 key={key++}>{line.slice(3)}</h3>)
    } else if (line.startsWith('- ')) {
      if (paraBuffer.length) flush()
      listBuffer.push(line.slice(2))
    } else {
      if (listBuffer.length) flush()
      paraBuffer.push(line)
    }
  }
  flush()
  return nodes
}
