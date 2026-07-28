import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { episodes } from '../../model/content'
import { useStore } from '../../model/store'
import { BoxPerson, type PersonApi } from './BoxPerson'
import { routePath } from '../../model/layout'

const WALK_SPEED = 2 // world units/sec
const STOP_PAUSE = 1.8 // seconds idling at each stop
const COURIER_PALETTE = { skin: '#d9a878', top: '#8a8d91', bottom: '#3b3f45', hair: '#2f2a26' }

// Plays an episode as a walk across the map: a courier box-person follows the
// sidewalk polyline stop-to-stop; arrivals pause, caption the stop's note, and
// advance the store's playback state (legIndex/progress/status — observable via
// __seymour for tests). Buildings light up via their own route-aware highlight.
export function EpisodePlayback() {
  const episodeSlug = useStore((s) => s.episode?.slug ?? null)
  const runId = useStore((s) => s.episode?.runId ?? 0)
  if (!episodeSlug) return null
  // keyed by runId so replaying the same episode remounts a fresh courier
  return <Courier key={`${episodeSlug}:${runId}`} slug={episodeSlug} />
}

function Courier({ slug }: { slug: string }) {
  const api = useRef<PersonApi | null>(null)
  const manifest = episodes[slug]

  // Precompute each leg's polyline + cumulative lengths once per playback.
  const legs = useMemo(() => {
    const out: { points: [number, number][]; lengths: number[]; total: number }[] = []
    for (let i = 0; i < manifest.route.length - 1; i++) {
      const points = routePath(manifest.route[i].location, manifest.route[i + 1].location)
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

  // playback progress lives in refs; the store gets throttled summaries
  const distance = useRef(0)
  const legIndex = useRef(0)
  const pauseUntil = useRef(0)
  const started = useRef(false)
  const lastStoreSync = useRef(0)

  // show the first stop's note immediately
  useEffect(() => {
    useStore.getState().setNote(manifest.route[0].note ?? null)
  }, [manifest])

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    const now = clock.elapsedTime
    const store = useStore.getState()
    const episode = store.episode
    const person = api.current
    if (!episode || !person) return

    if (!started.current) {
      started.current = true
      pauseUntil.current = now + STOP_PAUSE // linger at the first stop before setting off
    }

    if (episode.status === 'done') {
      const leg = legs[legs.length - 1]
      const end = leg.points[leg.points.length - 1]
      person.group.position.set(end[0], 0, end[1])
      person.setPose(now, 'idle')
      return
    }

    const leg = legs[legIndex.current]
    const paused = now < pauseUntil.current

    if (!paused) {
      distance.current += WALK_SPEED * delta
      if (distance.current >= leg.total) {
        // arrived at the next stop
        const stop = manifest.route[legIndex.current + 1]
        store.setNote(stop.note ?? null)
        if (legIndex.current + 1 >= legs.length) {
          store._tickEpisode({ legIndex: legIndex.current + 1, progress: 1, status: 'done' })
          return
        }
        legIndex.current += 1
        distance.current = 0
        pauseUntil.current = now + STOP_PAUSE
        store._tickEpisode({ legIndex: legIndex.current, progress: 0, status: 'paused' })
      }
    }

    // position along the polyline
    const d = Math.min(distance.current, leg.total)
    let segment = 1
    while (segment < leg.lengths.length - 1 && leg.lengths[segment] < d) segment++
    const [ax, az] = leg.points[segment - 1]
    const [bx, bz] = leg.points[segment]
    const segmentLength = leg.lengths[segment] - leg.lengths[segment - 1]
    const t = segmentLength > 0 ? (d - leg.lengths[segment - 1]) / segmentLength : 0
    const x = ax + (bx - ax) * t
    const z = az + (bz - az) * t
    person.group.position.set(x, 0, z)
    if (!paused && (bx !== ax || bz !== az)) {
      person.group.rotation.y = Math.atan2(bx - ax, bz - az)
    }
    person.setPose(now, paused ? 'idle' : 'walk')

    // throttled store sync for observability (~5 Hz)
    if (now - lastStoreSync.current > 0.2) {
      lastStoreSync.current = now
      store._tickEpisode({
        legIndex: legIndex.current,
        progress: leg.total > 0 ? d / leg.total : 1,
        status: paused ? 'paused' : 'walking',
      })
    }
  })

  return <BoxPerson ref={api} palette={COURIER_PALETTE} />
}
