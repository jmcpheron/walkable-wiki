import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { locations, schemes } from '../engine/content'
import type { ExteriorDef, FacadeDef, FeatureDef } from '../engine/manifest'
import { buildingStyle, exteriorDef, facadeDef } from '../engine/manifest'
import { VOXEL, buildVoxelGeometry } from '../engine/voxel'
import { buildingBoxes } from '../world/buildingBoxes'
import { resolveColors } from '../world/styles'

// In-browser building editor, no server anywhere — the repo stays the backend.
//  • Build tab: pick a neighborhood style + color scheme, stamp preset features
//    (doorways, retail windows, bay windows, fire escapes, conduit, awnings).
//  • Paint tab: hand-paint the front facade cell by cell (2 or 4 cells/voxel).
// Copy the JSON out and PR it into the location's manifest.

const BUILD_KEY = 'seymours-bay-builder-v2'
const PAINT_KEY = 'seymours-bay-painter-v2'
const CHAR_POOL = 'GCTwBASdDbEFHIJKLMNOPQRUVWXYZabcefghijklmnopqrstuvxyz0123456789'
const ERASE = ' '

// ── Build tab ────────────────────────────────────────────────────────────────

type Field =
  | { key: string; kind: 'number'; step?: number; label?: string }
  | { key: string; kind: 'select'; options: string[]; label?: string }

const FEATURE_META: Record<FeatureDef['type'], { label: string; fields: Field[]; defaults: Omit<FeatureDef, 'type'> }> = {
  doorway: {
    label: '🚪 Doorway',
    fields: [
      { key: 'x', kind: 'number', step: 0.5 },
      { key: 'kind', kind: 'select', options: ['shop', 'apartment'] },
    ],
    defaults: { x: 0, kind: 'shop' } as never,
  },
  'retail-window': {
    label: '🪟 Retail window',
    fields: [
      { key: 'from', kind: 'number', step: 0.5 },
      { key: 'to', kind: 'number', step: 0.5 },
    ],
    defaults: { from: 1.5, to: 4.5 } as never,
  },
  'bay-window': {
    label: '🏠 Bay window',
    fields: [
      { key: 'x', kind: 'number', step: 0.5 },
      { key: 'floor', kind: 'number', step: 1 },
      { key: 'width', kind: 'number', step: 0.5 },
    ],
    defaults: { x: 0, floor: 1, width: 5 } as never,
  },
  'fire-escape': {
    label: '🪜 Fire escape',
    fields: [
      { key: 'x', kind: 'number', step: 0.5 },
      { key: 'width', kind: 'number', step: 0.5 },
    ],
    defaults: { x: 0, width: 4 } as never,
  },
  conduit: {
    label: '🔌 Conduit',
    fields: [
      { key: 'face', kind: 'select', options: ['front', 'left', 'right'] },
      { key: 'x', kind: 'number', step: 0.5 },
    ],
    defaults: { face: 'right', x: 0 } as never,
  },
  awning: {
    label: '⛱ Awning',
    fields: [
      { key: 'from', kind: 'number', step: 0.5 },
      { key: 'to', kind: 'number', step: 0.5 },
    ],
    defaults: { from: -4, to: 4 } as never,
  },
  dumpster: {
    label: '🗑 Dumpster',
    fields: [
      { key: 'side', kind: 'select', options: ['back', 'left', 'right'] },
      { key: 'x', kind: 'number', step: 0.5 },
    ],
    defaults: { side: 'back', x: 0 } as never,
  },
}

interface BuildState {
  slug: string
  exterior: ExteriorDef
}

function buildStateFor(slug: string): BuildState {
  return { slug, exterior: structuredClone(locations[slug].exterior) }
}

function BuildTab() {
  const slugs = Object.keys(locations)
  const [state, setState] = useState<BuildState>(() => {
    try {
      const saved = localStorage.getItem(BUILD_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as BuildState
        if (locations[parsed.slug]) {
          return { slug: parsed.slug, exterior: exteriorDef.parse(parsed.exterior) }
        }
      }
    } catch {
      /* stale autosave */
    }
    return buildStateFor(slugs[0])
  })
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem(BUILD_KEY, JSON.stringify(state))
  }, [state])

  const ext = state.exterior
  const patch = (p: Partial<ExteriorDef>) => setState((s) => ({ ...s, exterior: { ...s.exterior, ...p } }))
  const patchFeature = (i: number, key: string, value: unknown) =>
    setState((s) => {
      const features = [...s.exterior.features]
      features[i] = { ...features[i], [key]: value } as FeatureDef
      return { ...s, exterior: { ...s.exterior, features } }
    })

  const exportJson = JSON.stringify({ exterior: ext }, null, 2)

  return (
    <div className="editor-body">
      <div className="editor-left build-form">
        <div className="build-row">
          <label>
            Building
            <select value={state.slug} onChange={(e) => setState(buildStateFor(e.target.value))}>
              {slugs.map((s) => (
                <option key={s} value={s}>
                  {locations[s].name}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => setState(buildStateFor(state.slug))}>Reset from manifest</button>
        </div>
        <div className="build-row">
          <label>
            Style
            <select value={ext.style} onChange={(e) => patch({ style: buildingStyle.parse(e.target.value) })}>
              {buildingStyle.options.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Scheme
            <select value={ext.scheme} onChange={(e) => patch({ scheme: e.target.value })}>
              {Object.keys(schemes).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <span className="scheme-chips">
            {Object.values(resolveColors(ext)).map((c, i) => (
              <span key={i} className="scheme-chip" style={{ background: c }} />
            ))}
          </span>
        </div>
        <div className="build-row">
          <label>
            Sign text
            <input value={ext.signText ?? ''} onChange={(e) => patch({ signText: e.target.value })} />
          </label>
        </div>

        <h3>Features</h3>
        <p className="editor-hint">
          x / from / to are in voxels from the front-face center (building is {ext.size[0]} wide:
          ±{ext.size[0] / 2}).
        </p>
        <div className="feature-list">
          {ext.features.map((f, i) => (
            <div key={i} className="feature-row">
              <strong>{FEATURE_META[f.type].label}</strong>
              {FEATURE_META[f.type].fields.map((field) => (
                <label key={field.key}>
                  {field.label ?? field.key}
                  {field.kind === 'number' ? (
                    <input
                      type="number"
                      step={field.step ?? 0.5}
                      value={(f as never)[field.key] as number}
                      onChange={(e) => patchFeature(i, field.key, Number(e.target.value))}
                    />
                  ) : (
                    <select
                      value={(f as never)[field.key] as string}
                      onChange={(e) => patchFeature(i, field.key, e.target.value)}
                    >
                      {field.options.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  )}
                </label>
              ))}
              <button
                className="feature-remove"
                onClick={() =>
                  patch({ features: ext.features.filter((_, j) => j !== i) })
                }
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="build-row">
          <label>
            Add feature
            <select
              value=""
              onChange={(e) => {
                const type = e.target.value as FeatureDef['type']
                if (!type) return
                patch({ features: [...ext.features, { type, ...FEATURE_META[type].defaults } as FeatureDef] })
              }}
            >
              <option value="">choose…</option>
              {Object.entries(FEATURE_META).map(([type, meta]) => (
                <option key={type} value={type}>
                  {meta.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="editor-io">
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(exportJson)
              setMessage('Copied! Paste the "exterior" block into the location\'s manifest.json.')
              setTimeout(() => setMessage(null), 4000)
            }}
          >
            📋 Copy exterior JSON
          </button>
          <button
            onClick={() => {
              const text = prompt('Paste an exterior JSON:')
              if (!text) return
              try {
                const raw = JSON.parse(text)
                const parsed = exteriorDef.parse(raw.exterior ?? raw)
                setState((s) => ({ ...s, exterior: parsed }))
                setMessage('Imported.')
                setTimeout(() => setMessage(null), 2500)
              } catch (err) {
                setMessage(`Import failed: ${err instanceof Error ? err.message.slice(0, 120) : 'bad JSON'}`)
              }
            }}
          >
            📥 Import JSON
          </button>
          {message && <p className="editor-message">{message}</p>}
        </div>
      </div>

      <div className="editor-right">
        <Preview exterior={ext} />
      </div>
    </div>
  )
}

// ── Paint tab (hand-painted facade grids) ────────────────────────────────────

interface PaintState {
  slug: string
  resolution: 2 | 4
  legend: Record<string, { color: string; depth: number }>
  rows: string[]
}

function paintStateFor(slug: string, resolution: 2 | 4 = 2): PaintState {
  const exterior = locations[slug].exterior
  const [w, , h] = exterior.size
  if (exterior.facade) {
    return {
      slug,
      resolution: exterior.facade.resolution,
      legend: Object.fromEntries(
        Object.entries(exterior.facade.legend).map(([k, v]) => [k, { color: v.color, depth: v.depth }])
      ),
      rows: [...exterior.facade.rows],
    }
  }
  const colors = resolveColors(exterior)
  return {
    slug,
    resolution,
    legend: {
      G: { color: colors.wall, depth: 0 },
      T: { color: colors.trim, depth: 1 },
      w: { color: colors.glass, depth: 0 },
      D: { color: colors.door, depth: 0 },
      B: { color: colors.sign, depth: 1 },
      A: { color: colors.accent, depth: 2 },
    },
    rows: Array.from({ length: h * resolution }, () => 'G'.repeat(w * resolution)),
  }
}

function upscaleRows(rows: string[]): string[] {
  return rows.flatMap((row) => {
    const doubled = [...row].map((ch) => ch + ch).join('')
    return [doubled, doubled]
  })
}

function setCell(rows: string[], r: number, c: number, ch: string): string[] {
  const next = [...rows]
  const row = next[r].padEnd(c + 1, ' ')
  next[r] = row.slice(0, c) + ch + row.slice(c + 1)
  return next
}

function PaintTab() {
  const slugs = Object.keys(locations)
  const [state, setState] = useState<PaintState>(() => {
    try {
      const saved = localStorage.getItem(PAINT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as PaintState
        if (locations[parsed.slug]) return parsed
      }
    } catch {
      /* stale autosave */
    }
    return paintStateFor(slugs[0])
  })
  const [brush, setBrush] = useState<string>(Object.keys(state.legend)[0] ?? 'G')
  const [message, setMessage] = useState<string | null>(null)
  const painting = useRef(false)

  useEffect(() => {
    localStorage.setItem(PAINT_KEY, JSON.stringify(state))
  }, [state])
  useEffect(() => {
    const up = () => (painting.current = false)
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])

  const exterior = locations[state.slug].exterior
  const cols = exterior.size[0] * state.resolution
  const wallRows = exterior.size[2] * state.resolution
  const cellPx = state.resolution === 4 ? 9 : 16

  const facade: FacadeDef = useMemo(
    () => ({ resolution: state.resolution, legend: state.legend, rows: state.rows }),
    [state.resolution, state.legend, state.rows]
  )
  const previewExterior: ExteriorDef = useMemo(() => ({ ...exterior, facade }), [exterior, facade])

  const paint = (r: number, c: number) => setState((s) => ({ ...s, rows: setCell(s.rows, r, c, brush) }))

  return (
    <div className="editor-body">
      <div className="editor-left">
        <div className="editor-toolbar">
          <select value={state.slug} onChange={(e) => setState(paintStateFor(e.target.value))}>
            {slugs.map((s) => (
              <option key={s} value={s}>
                {locations[s].name}
              </option>
            ))}
          </select>
          <button onClick={() => setState(paintStateFor(state.slug))}>Reset</button>
          <span className="editor-hint">{cols} cols · {state.resolution} cells/voxel</span>
          {state.resolution === 2 && (
            <button
              onClick={() =>
                setState((s) => ({ ...s, resolution: 4, rows: upscaleRows(s.rows) }))
              }
            >
              🔍 Double resolution
            </button>
          )}
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
          style={{ gridTemplateColumns: `repeat(${cols}, ${cellPx}px)` }}
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
                  style={{
                    width: cellPx,
                    height: cellPx,
                    ...(entry ? { background: entry.color } : {}),
                  }}
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
        <Preview exterior={previewExterior} />
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
            <button
              onClick={() => {
                const used = new Set(Object.keys(state.legend))
                const ch = [...CHAR_POOL].find((c) => !used.has(c))
                if (!ch) return
                setState((s) => ({ ...s, legend: { ...s.legend, [ch]: { color: '#888888', depth: 0 } } }))
                setBrush(ch)
              }}
            >
              + color
            </button>
            <button className={brush === ERASE ? 'selected' : ''} onClick={() => setBrush(ERASE)}>
              ⌫ erase
            </button>
          </div>
        </div>
        <div className="editor-io">
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(JSON.stringify({ facade }, null, 2))
              setMessage('Copied! Paste the "facade" block into the manifest\'s "exterior".')
              setTimeout(() => setMessage(null), 4000)
            }}
          >
            📋 Copy facade JSON
          </button>
          <button
            onClick={() => {
              const text = prompt('Paste a facade (or whole exterior) JSON:')
              if (!text) return
              try {
                const raw = JSON.parse(text)
                const parsed = facadeDef.parse(raw.facade ?? raw.exterior?.facade ?? raw)
                setState((s) => ({
                  ...s,
                  resolution: parsed.resolution,
                  legend: Object.fromEntries(
                    Object.entries(parsed.legend).map(([k, v]) => [k, { color: v.color, depth: v.depth }])
                  ),
                  rows: [...parsed.rows],
                }))
                setMessage('Imported.')
                setTimeout(() => setMessage(null), 2500)
              } catch (err) {
                setMessage(`Import failed: ${err instanceof Error ? err.message.slice(0, 120) : 'bad JSON'}`)
              }
            }}
          >
            📥 Import JSON
          </button>
          {message && <p className="editor-message">{message}</p>}
        </div>
      </div>
    </div>
  )
}

// ── Shared ───────────────────────────────────────────────────────────────────

function Preview({ exterior }: { exterior: ExteriorDef }) {
  return (
    <div className="editor-preview">
      <Canvas
        orthographic
        dpr={[1, 2]}
        camera={{ zoom: 38, near: 0.1, far: 300, position: [40, 33, 40] }}
        onCreated={({ camera }) => camera.lookAt(0, (exterior.size[2] / 2) * VOXEL, 0)}
      >
        <color attach="background" args={['#a8d3e6']} />
        <hemisphereLight args={['#bcd7e6', '#8a7f6a', 0.9]} />
        <directionalLight position={[30, 50, 25]} intensity={1.6} />
        <PreviewMesh exterior={exterior} />
      </Canvas>
    </div>
  )
}

function PreviewMesh({ exterior }: { exterior: ExteriorDef }) {
  const geometry = useMemo(() => {
    try {
      return buildVoxelGeometry(buildingBoxes(exterior))
    } catch {
      return new THREE.BufferGeometry()
    }
  }, [exterior])
  useEffect(() => () => geometry.dispose(), [geometry])
  const material = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true }), [])
  return <mesh geometry={geometry} material={material} />
}

export function FacadeEditor() {
  const [tab, setTab] = useState<'build' | 'paint'>('build')
  return (
    <div className="facade-editor">
      <header className="editor-header">
        <strong>🧱 Building editor</strong>
        <nav className="editor-tabs">
          <button className={tab === 'build' ? 'active' : ''} onClick={() => setTab('build')}>
            Build
          </button>
          <button className={tab === 'paint' ? 'active' : ''} onClick={() => setTab('paint')}>
            Paint
          </button>
        </nav>
        <span className="editor-spacer" />
        <a href="#/">← Back to town</a>
      </header>
      {tab === 'build' ? <BuildTab /> : <PaintTab />}
    </div>
  )
}
