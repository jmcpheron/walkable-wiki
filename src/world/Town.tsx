import { street, locations } from '../engine/content'
import { Ground } from './Ground'
import { Building } from './Building'
import { Walkers } from './Walkers'
import { NamedCharacters } from './NamedCharacters'
import { EpisodePlayback } from './EpisodePlayback'
import { IsoCameraRig } from './IsoCameraRig'

// The whole town, composed inside <Canvas>. Everything is driven by content
// manifests — adding a building or character is a content PR, never an engine change.
export function Town() {
  return (
    <group>
      <hemisphereLight args={['#bcd7e6', '#8a7f6a', 0.9]} />
      <directionalLight position={[30, 50, 25]} intensity={1.6} />

      <Ground />
      {street.placements.map((p) => (
        <Building
          key={p.slug}
          manifest={locations[p.slug]}
          position={p.position}
          rotationY={p.rotationY}
        />
      ))}
      <Walkers />
      <NamedCharacters />
      <EpisodePlayback />
      <IsoCameraRig />
    </group>
  )
}
