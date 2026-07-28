import { Physics } from '@react-three/rapier'
import { useStore } from './store'
import { getLocation, resolveSpawn } from './content'
import { Player } from './Player'
import { HotspotRaycaster } from './Hotspot'
import { StreetScene } from '../scenes/StreetScene'
import { InteriorScene } from '../scenes/InteriorScene'

// The whole physics world is keyed by scene id: travelling remounts it, which rebuilds
// colliders cleanly and respawns the player at the named spawn point. Far simpler than
// teleporting through a persistent world, and cheap while scenes are procedural.
export function SceneRoot() {
  const scene = useStore((s) => s.scene)
  const spawnId = useStore((s) => s.spawnId)
  const spawn = resolveSpawn(scene, spawnId)

  return (
    <Physics key={scene}>
      {scene === 'street' ? <StreetScene /> : <InteriorScene manifest={getLocation(scene)} />}
      <Player spawn={spawn} />
      <HotspotRaycaster />
    </Physics>
  )
}
