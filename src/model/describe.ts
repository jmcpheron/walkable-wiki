import type { RoomDef } from './manifest'

// Turn semantic interior data into wiki prose. Doors/windows are structure, not
// furniture, so they stay out of the description.
export function describeRoom(room: RoomDef): string {
  const parts = room.props
    .filter((p) => p.type !== 'door' && p.type !== 'window')
    .map((p) => {
      const noun = p.count && p.count > 1 ? `${p.count} ${p.type}s` : p.type
      return p.label ? `${noun} (${p.label})` : noun
    })
  return parts.join(', ')
}
