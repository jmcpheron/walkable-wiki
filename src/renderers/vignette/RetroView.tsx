import { useEffect, useState } from 'react'
import { episodes } from '../../model/content'
import { castAppearance } from '../../model/appearance'
import { SceneCanvas } from './SceneCanvas'

const AUTO_ADVANCE_MS = 7000
const TYPE_INTERVAL_MS = 22

// The retro episode theater: same episodes, same scenes, same facades and cast as
// the voxel town — presented as a late-80s adventure-game vignette. Pure DOM +
// canvas; the abstraction layer is doing all the work.
export function RetroView({ slug }: { slug: string }) {
  const episode = episodes[slug]
  const [index, setIndex] = useState(0)
  const [auto, setAuto] = useState(true)
  const [typed, setTyped] = useState(0)

  const scene = episode.scenes[index]
  const note = scene.note ?? ''

  useEffect(() => {
    setTyped(0)
    if (!note) return
    const t = setInterval(() => {
      setTyped((n) => {
        if (n >= note.length) {
          clearInterval(t)
          return n
        }
        return n + 1
      })
    }, TYPE_INTERVAL_MS)
    return () => clearInterval(t)
  }, [index, note])

  useEffect(() => {
    if (!auto) return
    const t = setTimeout(() => {
      setIndex((i) => {
        if (i + 1 >= episode.scenes.length) {
          setAuto(false)
          return i
        }
        return i + 1
      })
    }, AUTO_ADVANCE_MS)
    return () => clearTimeout(t)
  }, [auto, index, episode])

  const castNames = scene.characters.map((c) => castAppearance(c).name)

  return (
    <div className="retro-view">
      <div className="retro-frame">
        <header className="retro-header">
          ── SEYMOUR'S BAY THEATER ── {episode.title.toUpperCase()} ──
        </header>
        <div className="retro-screen">
          <SceneCanvas slug={slug} sceneIndex={index} />
          <div className="retro-scanlines" aria-hidden="true" />
        </div>
        <div className="retro-text">
          <div className="retro-scene-title">
            SCENE {index + 1}/{episode.scenes.length}
            {scene.title ? ` · ${scene.title.toUpperCase()}` : ''}
          </div>
          <p className="retro-note">
            {note.slice(0, typed).replace(/\*\*/g, '')}
            {typed < note.length && <span className="retro-cursor">▌</span>}
          </p>
          {castNames.length > 0 && <div className="retro-cast">FEATURING: {castNames.join(' · ')}</div>}
        </div>
        <footer className="retro-controls">
          <button onClick={() => { setAuto(false); setIndex((i) => Math.max(0, i - 1)) }}>◀ PREV</button>
          <button onClick={() => { setAuto(false); setIndex((i) => Math.min(episode.scenes.length - 1, i + 1)) }}>
            NEXT ▶
          </button>
          <button className={auto ? 'active' : ''} onClick={() => setAuto((a) => !a)}>
            AUTO {auto ? 'ON' : 'OFF'}
          </button>
          <span className="editor-spacer" />
          <a href={`#/ep/${slug}`}>⏏ BACK TO TOWN</a>
        </footer>
      </div>
    </div>
  )
}
