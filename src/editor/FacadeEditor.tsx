import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { locations } from '../engine/content'
import type { ExteriorDef, FacadeDef } from '../engine/manifest'
import { facadeDef } from '../engine/manifest'
import { VOXEL, buildVoxelGeometry } from '../engine/voxel'
import { buildingBoxes } from '../world/buildingBoxes'

// In-browser facade painter: paint the front of a building cell by cell (half-voxel
// resolution), watch the 3D preview live, then copy the manifest JSON and submit it
// as a PR. No server anywhere — the repo stays the backend, this is just a brush.

const STORAGE_KEY = 'seymours-bay-facade-editor'
const CHAR_POOL = 'GCTwBASdDbEFHIJKLMNOPQRUVWXYZabcefghijklmnopqrstuvxyz0123456789'
const ERASE = ' '

interface EditorState {
  slug: string
  legend: Record<string, { color: string; depth: number }>
  rows: string[]
}

function blankStateFor(slug: string): EditorState {
  const exterior = locations[slug].exterior
  const [w, , h] = exterior.size
  if (exterior.facade) {
    return {
      slug,
      legend: Object.fromEntries(
        Object.entries(exterior.facade.legend).map(([k, v]) => [k, { color: v.color, depth: v.depth }])
      ),
      rows: [...exterior.facade.rows],
    }
  }
  const p = exterior.palette
  return {
    slug,
    legend: {
      G: { color: p.wall, depth: 0 },
      T: { color: p.trim, depth: 1 },
      w: { color: p.window, depth: 0 },
      D: { color: p.door, depth: 0 },
      B: { color: p.sign, depth: 1 },
    },
    rows: Array.from({ length: h * 2 }, () => 'G'.repeat(w * 2)),
  }
}

function setCell(rows: string[], r: number, c: number, ch: string): string[] {
  const next = [...rows]
  const row = next[r].padEnd(c + 1, ' ')
  next[r] = row.slice(0, c) + ch + row.slice(c + 1)
  return next
}

export function FacadeEditor() {
  const slugs = Object.keys(locations)
  const [state, setState] = useState<EditorState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as EditorState
        if (locations[parsed.slug]) return parsed
      }
    } catch {
      /* corrupted autosave — start fresh */
    }
    return blankStateFor(slugs[0])
  })
  const [brush, setBrush] = useState<string>(Object.keys(state.legend)[0] ?? 'G')
  const [message, setMessage] = useState<string | null>(null)
  const painting = useRef(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])
  useEffect(() => {
    const up = () => (painting.current = false)
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])

  const exterior = locations[state.slug].exterior
  const cols = exterior.size[0] * 2
  const wallRows = exterior.size[2] * 2

  const facade: FacadeDef = useMemo(
    () => ({ legend: state.legend, rows: state.rows }),
    [state.legend, state.rows]
  )
  const previewExterior: ExteriorDef = useMemo(
    () => ({ ...exterior, facade }),
    [exterior, facade]
  )

  const paint = (r: number, c: number) => {
    setState((s) => ({ ...s, rows: setCell(s.rows, r, c, brush) }))
  }

  const addColor = () => {
    const used = new Set(Object.keys(state.legend))
    const ch = [...CHAR_POOL].find((c) => !used.has(c))
    if (!ch) return
    setState((s) => ({ ...s, legend: { ...s.legend, [ch]: { color: '#888888', depth: 0 } } }))
    setBrush(ch)
  }

  const exportJson = JSON.stringify({ facade }, null, 2)

  const copyExport = async () => {
    await navigator.clipboard.writeText(exportJson)
    setMessage('Copied! Paste the "facade" block into the location\'s manifest.json "exterior".')
    setTimeout(() => setMessage(null), 4000)
  }

  const importJson = (text: string) => {
    try {
      const raw = JSON.parse(text)
      const candidate = raw.facade ?? raw.exterior?.facade ?? raw
      const parsed = facadeDef.parse(candidate)
      const legend = Object.fromEntries(
        Object.entries(parsed.legend).map(([k, v]) => [k, { color: v.color, depth: v.depth }])
      )
      setState((s) => ({ ...s, legend, rows: [...parsed.rows] }))
      setMessage('Imported.')
      setTimeout(() => setMessage(null), 2500)
    } catch (err) {
      setMessage(`Import failed: ${err instanceof Error ? err.message.slice(0, 120) : 'bad JSON'}`)
    }
  }

  return (
    <div className="facade-editor">
      <header className="editor-header">
        <strong>🧱 Facade editor</strong>
        <select
          value={state.slug}
          onChange={(e) => {
            setState(blankStateFor(e.target.value))
          }}
        >
          {slugs.map((s) => (
            <option key={s} value={s}>
              {locations[s].name}
            </option>
          ))}
        </select>
        <button onClick={() => setState(blankStateFor(state.slug))}>Reset from manifest</button>
        <span className="editor-spacer" />
        <a href="#/">← Back to town</a>
      </header>

      <div className="editor-body">
        <div className="editor-left">
          <div className="editor-toolbar">
            <span className="editor-hint">
              {cols} cols · rows above the wall line form the roofline
            </span>
            <button onClick={() => setState((s) => ({ ...s, rows: [' '.repeat(cols), ...s.rows] }))}>
              + row on top
            </button>
            <button
              onClick={() =>
                setState((s) => (s.rows.length > wallRows ? { ...s, rows: s.rows.slice(1) } : s))
              }
            >
              − top row
            </button>
          </div>
          <div
            className="editor-grid"
            style={{ gridTemplateColumns: `repeat(${cols}, 16px)` }}
            onPointerDown={() => (painting.current = true)}
          >
            {state.rows.map((row, r) => {
              const aboveWall = state.rows.length - r > wallRows
              return Array.from({ length: cols }, (_, c) => {
                const ch = row[c] ?? ' '
                const entry = state.legend[ch]
                return (
                  <div
                    key={`${r}-${c}`}
                    className={`editor-cell${aboveWall ? ' above-wall' : ''}`}
                    style={entry ? { background: entry.color } : undefined}
                    onPointerDown={(e) => {
                      e.preventDefault()
                      painting.current = true
                      paint(r, c)
                    }}
                    onPointerEnter={() => {
                      if (painting.current) paint(r, c)
                    }}
                  />
                )
              })
            })}
          </div>
        </div>

        <div className="editor-right">
          <div className="editor-preview">
            <Canvas
              orthographic
              dpr={[1, 2]}
              camera={{ zoom: 42, near: 0.1, far: 300, position: [40, 33, 40] }}
              onCreated={({ camera }) => camera.lookAt(0, (exterior.size[2] / 2) * VOXEL, 0)}
            >
              <color attach="background" args={['#a8d3e6']} />
              <hemisphereLight args={['#bcd7e6', '#8a7f6a', 0.9]} />
              <directionalLight position={[30, 50, 25]} intensity={1.6} />
              <PreviewMesh exterior={previewExterior} />
            </Canvas>
          </div>

          <div className="editor-palette">
            {Object.entries(state.legend).map(([ch, entry]) => (
              <div key={ch} className={`palette-row${brush === ch ? ' selected' : ''}`}>
                <button className="palette-pick" onClick={() => setBrush(ch)} title="Paint with this">
                  <span className="palette-swatch" style={{ background: entry.color }} />
                  <code>{ch}</code>
                </button>
                <input
                  type="color"
                  value={entry.color}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      legend: { ...s.legend, [ch]: { ...entry, color: e.target.value } },
                    }))
                  }
                />
                <label>
                  depth
                  <input
                    type="number"
                    min={-1}
                    max={4}
                    value={entry.depth}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        legend: { ...s.legend, [ch]: { ...entry, depth: Number(e.target.value) } },
                      }))
                    }
                  />
                </label>
              </div>
            ))}
            <div className="palette-actions">
              <button onClick={addColor}>+ color</button>
              <button className={brush === ERASE ? 'selected' : ''} onClick={() => setBrush(ERASE)}>
                ⌫ erase
              </button>
            </div>
          </div>

          <div className="editor-io">
            <button onClick={copyExport}>📋 Copy facade JSON</button>
            <button
              onClick={() => {
                const text = prompt('Paste a facade (or whole exterior) JSON:')
                if (text) importJson(text)
              }}
            >
              📥 Import JSON
            </button>
            {message && <p className="editor-message">{message}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewMesh({ exterior }: { exterior: ExteriorDef }) {
  const geometry = useMemo(() => buildVoxelGeometry(buildingBoxes(exterior)), [exterior])
  useEffect(() => () => geometry.dispose(), [geometry])
  const material = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true }), [])
  return <mesh geometry={geometry} material={material} />
}
