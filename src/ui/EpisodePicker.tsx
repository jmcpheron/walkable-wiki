import { useState } from 'react'
import { episodes } from '../engine/content'
import { useStore } from '../engine/store'

// Top-left "Episodes" menu: pick one to open its wiki entry and watch its route
// play out on the map.
export function EpisodePicker() {
  const [open, setOpen] = useState(false)
  const select = useStore((s) => s.select)
  const playing = useStore((s) => s.episode)
  const clearSelection = useStore((s) => s.clearSelection)
  const list = Object.values(episodes)
  if (list.length === 0) return null

  return (
    <div className="episode-picker">
      <button className="episode-picker-button" onClick={() => setOpen((v) => !v)}>
        📺 Episodes {open ? '▴' : '▾'}
      </button>
      {open && (
        <ul className="episode-picker-list">
          {list.map((e) => (
            <li key={e.slug}>
              <button
                className={playing?.slug === e.slug ? 'active' : ''}
                onClick={() => {
                  setOpen(false)
                  select('episode', e.slug)
                }}
              >
                {playing?.slug === e.slug ? '▶ ' : ''}
                {e.title}
              </button>
            </li>
          ))}
          {playing && (
            <li>
              <button className="episode-stop" onClick={() => { setOpen(false); clearSelection() }}>
                ■ Stop route
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
