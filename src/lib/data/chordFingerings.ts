import type { Finger } from '../theory/types'

export interface ChordFingering {
  /** Bottom-to-top, matching ChordInfo.noteNames order. */
  rh: Finger[]
  lh: Finger[]
}

/**
 * Standard chord fingerings by shape (triad/seventh) and inversion.
 * Conventions are near-universal across roots; black-key roots occasionally
 * substitute fingers but these defaults are correct to teach from.
 */
const TRIAD: ChordFingering[] = [
  { rh: [1, 3, 5], lh: [5, 3, 1] }, // root position
  { rh: [1, 2, 5], lh: [5, 3, 1] }, // 1st inversion
  { rh: [1, 3, 5], lh: [5, 2, 1] }, // 2nd inversion
]

const SEVENTH: ChordFingering[] = [
  { rh: [1, 2, 3, 5], lh: [5, 3, 2, 1] }, // root position
  { rh: [1, 2, 3, 5], lh: [5, 3, 2, 1] }, // 1st inversion
  { rh: [1, 2, 4, 5], lh: [5, 3, 2, 1] }, // 2nd inversion
  { rh: [1, 2, 3, 5], lh: [5, 4, 2, 1] }, // 3rd inversion
]

export function chordFingering(size: 3 | 4, inversion: number): ChordFingering {
  const table = size === 3 ? TRIAD : SEVENTH
  const f = table[inversion]
  if (!f) throw new Error(`No fingering for size ${size} inversion ${inversion}`)
  return f
}
