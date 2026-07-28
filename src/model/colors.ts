import type { ExteriorDef, SchemeColors } from './manifest'
import { schemes } from './content'

// Resolve a building's effective colors: named scheme + inline overrides.
// Model-level because every renderer (and the editor) needs the same answer.
export function resolveColors(exterior: ExteriorDef): SchemeColors {
  const base = schemes[exterior.scheme]
  const override = exterior.palette ?? {}
  return {
    ...base,
    ...Object.fromEntries(Object.entries(override).filter(([, v]) => v !== undefined)),
  } as SchemeColors
}
