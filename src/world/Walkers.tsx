import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { mulberry32 } from '../engine/rand'
import { BoxPerson, type PersonApi, type PersonPalette } from './BoxPerson'
import { FAR_SIDEWALK, NEAR_SIDEWALK, streetExtent } from './layout'

// Ambient sidewalk life, RCT-style: a dozen box-people pacing the lanes with
// seeded outfit/speed variety, occasional turnarounds, despawn past the street
// ends. All motion is imperative (refs + one useFrame); React only re-renders
// when someone spawns or despawns.

const TARGET_POPULATION = 12
const OUTFITS: PersonPalette[] = [
  { skin: '#e8b98f', top: '#4f7cac', bottom: '#3b3f45', hair: '#2f2a26' },
  { skin: '#c98d5f', top: '#b0563e', bottom: '#59524a', hair: '#1d1b19' },
  { skin: '#f0c9a2', top: '#6d9e6f', bottom: '#4a4238', hair: '#8a5a2d' },
  { skin: '#a56b42', top: '#c9a24b', bottom: '#37455c', hair: '#171514' },
  { skin: '#e8b98f', top: '#8d6cab', bottom: '#494f43', hair: '#c9b38a' },
  { skin: '#d9a878', top: '#b45a7e', bottom: '#3f3a44', hair: '#3d2c1f' },
  { skin: '#f0c9a2', top: '#5a8f8a', bottom: '#5c5148', hair: '#54443a', hat: '#7a4b32' },
  { skin: '#c98d5f', top: '#d07f3f', bottom: '#42506b', hair: '#241f1c' },
  { skin: '#e8b98f', top: '#7d8a5c', bottom: '#39424f', hair: '#5f4a35', hat: '#3f4c63' },
  { skin: '#b57a50', top: '#9a4f45', bottom: '#4e4639', hair: '#2a2523' },
]

interface Walker {
  id: number
  x: number
  lane: number
  dir: 1 | -1
  speed: number
  heightVoxels: number
  palette: PersonPalette
  phase: number // desyncs walk cycles
  idleUntil: number
  nextEvent: number
  api: PersonApi | null
}

let nextId = 1

function makeWalker(now: number, atEdge: boolean): Walker {
  const id = nextId++
  const rand = mulberry32(id * 7919 + 12345)
  const { minX, maxX } = streetExtent()
  const lane = rand() < 0.5 ? NEAR_SIDEWALK.lane : FAR_SIDEWALK.lane
  const dir: 1 | -1 = rand() < 0.5 ? 1 : -1
  return {
    id,
    x: atEdge ? (dir === 1 ? minX + 0.5 : maxX - 0.5) : minX + rand() * (maxX - minX),
    lane,
    dir,
    speed: 0.9 + rand() * 0.7,
    heightVoxels: rand() < 0.18 ? 3 : 4,
    palette: OUTFITS[Math.floor(rand() * OUTFITS.length)],
    phase: rand() * 20,
    idleUntil: 0,
    nextEvent: now + 3 + rand() * 6,
    api: null,
  }
}

export function Walkers() {
  const walkers = useRef<Walker[]>([])
  const spawnAt = useRef(0)
  const [, bump] = useState(0)

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    const now = clock.elapsedTime
    const { minX, maxX } = streetExtent()
    let changed = false

    if (walkers.current.length === 0) {
      // initial population scattered along the street
      for (let i = 0; i < TARGET_POPULATION; i++) walkers.current.push(makeWalker(now, false))
      changed = true
    }

    for (let i = walkers.current.length - 1; i >= 0; i--) {
      const w = walkers.current[i]
      const idle = now < w.idleUntil
      if (!idle) {
        w.x += w.dir * w.speed * delta
        if (now > w.nextEvent) {
          const rand = mulberry32(w.id * 31 + Math.floor(now * 7))
          if (rand() < 0.2) {
            w.dir = w.dir === 1 ? -1 : 1
            w.idleUntil = now + 0.6 + rand() * 0.8
          }
          w.nextEvent = now + 3 + rand() * 6
        }
      }
      if (w.x < minX - 2 || w.x > maxX + 2) {
        walkers.current.splice(i, 1)
        changed = true
        continue
      }
      const api = w.api
      if (api) {
        api.group.position.set(w.x, 0, w.lane)
        api.group.rotation.y = w.dir === 1 ? Math.PI / 2 : -Math.PI / 2
        api.setPose(now + w.phase, idle ? 'idle' : 'walk')
      }
    }

    if (walkers.current.length < TARGET_POPULATION && now > spawnAt.current) {
      walkers.current.push(makeWalker(now, true))
      spawnAt.current = now + 1.5 + Math.random() * 2.5
      changed = true
    }

    if (changed) bump((v) => v + 1)
  })

  return (
    <group>
      {walkers.current.map((w) => (
        <BoxPerson
          key={w.id}
          ref={(api) => {
            w.api = api
          }}
          palette={w.palette}
          heightVoxels={w.heightVoxels}
        />
      ))}
    </group>
  )
}
