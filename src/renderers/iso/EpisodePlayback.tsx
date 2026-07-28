import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { episodes } from '../../model/content'
import { useStore } from '../../model/store'
import { routePath, doorstep } from '../../model/layout'
import { castAppearance, type Appearance } from '../../model/appearance'
import { BoxPerson, type PersonApi } from './BoxPerson'

const WALK_SPEED = 2 // world units/sec
const STOP_PAUSE = 1.8 // seconds idling on arrival
const DWELL_EXTRA = 2.6 // extra reading time when a scene stays put
const SPACING = 0.9 // path-distance between party members
const MAX_PARTY = 6
const COURIER: Appearance = {
  name: 'Courier',
  palette: { skin: '#d9a878', top: '#8a8d91', bottom: '#3b3f45', hair: '#2f2a26' },
  heightVoxels: 4,
}

// Plays an episode's scenes as a walk across the map: the episode's cast strolls
// the sidewalk polylines scene to scene in loose formation. Consecutive scenes at
// the same location are "dwells" — nobody moves, the caption advances. Playback
// state (sceneIndex/progress/status) is observable via __seymour for tests.
export function EpisodePlayback() {
  const episodeSlug = useStore((s) => s.episode?.slug ?? null)
  const runId = useStore((s) => s.episode?.runId ?? 0)
  if (!episodeSlug) return null
  // keyed by runId so replaying the same episode remounts a fresh party
  return <Party key={`${episodeSlug}:${runId}`} slug={episodeSlug} />
}

interface Leg {
  points: [number, number][]
  lengths: number[]
  total: number // 0 = dwell
}

function pointAt(leg: Leg, d: number): { x: number; z: number; heading: number } {
  if (leg.total === 0) {
    const [x, z] = leg.points[0]
    return { x, z, heading: Math.PI }
  }
  const clamped = Math.min(Math.max(d, 0), leg.total)
  let segment = 1
  while (segment < leg.lengths.length - 1 && leg.lengths[segment] < clamped) segment++
  const [ax, az] = leg.points[segment - 1]
  const [bx, bz] = leg.points[segment]
  const segmentLength = leg.lengths[segment] - leg.lengths[segment - 1]
  const t = segmentLength > 0 ? (clamped - leg.lengths[segment - 1]) / segmentLength : 0
  return {
    x: ax + (bx - ax) * t,
    z: az + (bz - az) * t,
    heading: bx !== ax || bz !== az ? Math.atan2(bx - ax, bz - az) : Math.PI,
  }
}

function Party({ slug }: { slug: string }) {
  const manifest = episodes[slug]

  // Cast: union of scene characters in appearance order, capped; empty → courier.
  const cast = useMemo<Appearance[]>(() => {
    const seen = new Set<string>()
    const slugs: string[] = []
    for (const scene of manifest.scenes) {
      for (const s of scene.characters) {
        if (!seen.has(s)) {
          seen.add(s)
          slugs.push(s)
        }
      }
    }
    const members = slugs.slice(0, MAX_PARTY).map(castAppearance)
    return members.length > 0 ? members : [COURIER]
  }, [manifest])

  const apis = useRef<(PersonApi | null)[]>([])

  // Leg i moves from scene i to scene i+1 (zero-length dwell if same location).
  const legs = useMemo<Leg[]>(() => {
    const out: Leg[] = []
    for (let i = 0; i < manifest.scenes.length - 1; i++) {
      const from = manifest.scenes[i].location
      const to = manifest.scenes[i + 1].location
      if (from === to) {
        const step = doorstep(from)
        out.push({ points: [[step.x, step.z]], lengths: [0], total: 0 })
        continue
      }
      const points = routePath(from, to)
      const lengths: number[] = [0]
      let total = 0
      for (let j = 1; j < points.length; j++) {
        total += Math.hypot(points[j][0] - points[j - 1][0], points[j][1] - points[j - 1][1])
        lengths.push(total)
      }
      out.push({ points, lengths, total })
    }
    return out
  }, [manifest])

  const distance = useRef(0)
  const legIndex = useRef(0)
  const pauseUntil = useRef(0)
  const started = useRef(false)
  const lastStoreSync = useRef(0)

  useEffect(() => {
    useStore.getState().setNote(manifest.scenes[0].note ?? null)
  }, [manifest])

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    const now = clock.elapsedTime
    const store = useStore.getState()
    const episode = store.episode
    if (!episode) return

    if (!started.current) {
      started.current = true
      pauseUntil.current = now + STOP_PAUSE
    }

    const done = episode.status === 'done'
    const paused = now < pauseUntil.current
    const leg = legs[Math.min(legIndex.current, legs.length - 1)]
    const isDwell = leg.total === 0

    if (!done && !paused) {
      if (isDwell) {
        arrive(now, true)
      } else {
        distance.current += WALK_SPEED * delta
        if (distance.current >= leg.total) arrive(now, false)
      }
    }

    // place the party: lead at distance d, member i trailing with a side offset
    const activeLeg = legs[Math.min(legIndex.current, legs.length - 1)]
    const walking = !done && !(now < pauseUntil.current) && activeLeg.total > 0
    for (let i = 0; i < cast.length; i++) {
      const api = apis.current[i]
      if (!api) continue
      const p = pointAt(activeLeg, distance.current - i * SPACING)
      const side = i === 0 ? 0 : (i % 2 === 1 ? 1 : -1) * 0.45
      // perpendicular to heading (heading measured from +Z toward +X)
      const px = Math.cos(p.heading) * side
      const pz = -Math.sin(p.heading) * side
      const idleScatter = activeLeg.total === 0 || !walking ? (i - (cast.length - 1) / 2) * 0.8 : 0
      api.group.position.set(p.x + px + (walking ? 0 : idleScatter), 0, p.z + pz)
      api.group.rotation.y = walking ? p.heading : Math.PI
      api.setPose(now + i * 0.37, walking ? 'walk' : 'idle')
    }

    if (!done && store.episode?.status !== 'done' && now - lastStoreSync.current > 0.2) {
      lastStoreSync.current = now
      store._tickEpisode({
        sceneIndex: Math.min(legIndex.current, manifest.scenes.length - 1),
        progress: activeLeg.total > 0 ? Math.min(distance.current / activeLeg.total, 1) : 1,
        status: now < pauseUntil.current ? 'paused' : 'walking',
      })
    }

    function arrive(t: number, wasDwell: boolean) {
      const nextIndex = legIndex.current + 1
      store.setNote(manifest.scenes[nextIndex].note ?? null)
      if (nextIndex >= manifest.scenes.length - 1) {
        store._tickEpisode({ sceneIndex: manifest.scenes.length - 1, progress: 1, status: 'done' })
        legIndex.current = manifest.scenes.length - 1 // clamped by users to legs range
        distance.current = legs[legs.length - 1].total
        return
      }
      legIndex.current = nextIndex
      distance.current = 0
      pauseUntil.current = t + STOP_PAUSE + (wasDwell ? DWELL_EXTRA : 0)
      store._tickEpisode({ sceneIndex: nextIndex, progress: 0, status: 'paused' })
    }
  })

  return (
    <group>
      {cast.map((member, i) => (
        <BoxPerson
          key={`${member.name}:${i}`}
          ref={(api) => {
            apis.current[i] = api
          }}
          palette={member.palette}
          heightVoxels={member.heightVoxels}
        />
      ))}
    </group>
  )
}
