import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { characters, getPlacement } from '../../model/content'
import { useStore } from '../../model/store'
import { useIsoStore } from './isoStore'
import { BoxPerson, type PersonApi } from './BoxPerson'
import { sidewalkLaneFor } from '../../model/layout'

// Manifest-driven characters idling in front of their buildings — each one a
// clickable wiki entry, exactly like a building. Position derives from the
// placement: offset[0] slides along the storefront, offset[1] pushes toward the
// road from the building's sidewalk edge.
export function NamedCharacters() {
  return (
    <group>
      {Object.values(characters).map((c) => (
        <NamedCharacter key={c.slug} slug={c.slug} />
      ))}
    </group>
  )
}

function NamedCharacter({ slug }: { slug: string }) {
  const c = characters[slug]
  const api = useRef<PersonApi | null>(null)
  const select = useStore((s) => s.select)
  const setHovered = useIsoStore((s) => s.setHovered)

  const placement = getPlacement(c.at.location)
  const lane = sidewalkLaneFor(c.at.location)
  const near = lane < 0
  // stand between the building face and the sidewalk lane, facing the road
  const x = placement.position[0] + c.at.offset[0] * (near ? 1 : -1)
  const z = near ? -5 + c.at.offset[1] : 7 - c.at.offset[1]
  const facing = near ? 0 : Math.PI // face +Z on the near side, -Z on the far side

  useFrame(({ clock }) => {
    const person = api.current
    if (!person) return
    person.group.position.set(x, 0, z)
    person.group.rotation.y = facing
    person.setPose(clock.elapsedTime + c.slug.length * 1.7, 'idle')
  })

  return (
    <BoxPerson
      ref={api}
      palette={c.appearance.palette}
      heightVoxels={c.appearance.heightVoxels}
      onClick={(e) => {
        if (e.delta > 5) return
        e.stopPropagation()
        select('character', slug)
      }}
      onPointerOver={() => setHovered(`char:${slug}`)}
      onPointerOut={() => {
        if (useIsoStore.getState().hovered === `char:${slug}`) setHovered(null)
      }}
    />
  )
}
