import { characters } from './content'
import { mulberry32 } from './rand'

// One answer to "what does this cast member look like?" shared by every renderer
// (the iso group walk and the vignette pixel sprites). Registry characters use
// their manifest appearance; unknown slugs (cameos, typos — content.ts warns) get
// a stable seeded generic look.

export interface Appearance {
  name: string
  palette: { skin: string; top: string; bottom: string; hair: string; hat?: string }
  heightVoxels: number
}

const SKINS = ['#e8b98f', '#c98d5f', '#a56b42', '#f0c9a2', '#b57a50']
const TOPS = ['#4f7cac', '#b0563e', '#6d9e6f', '#c9a24b', '#8d6cab', '#5a8f8a']
const BOTTOMS = ['#3b3f45', '#59524a', '#4a4238', '#37455c', '#494f43']
const HAIRS = ['#2f2a26', '#1d1b19', '#8a5a2d', '#c9b38a', '#54443a']

export function castAppearance(slug: string): Appearance {
  const known = characters[slug]
  if (known) {
    return {
      name: known.name,
      palette: known.appearance.palette,
      heightVoxels: known.appearance.heightVoxels,
    }
  }
  let hash = 0
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  const rand = mulberry32(hash)
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
  return {
    name: slug
      .split('-')
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' '),
    palette: { skin: pick(SKINS), top: pick(TOPS), bottom: pick(BOTTOMS), hair: pick(HAIRS) },
    heightVoxels: 4,
  }
}
