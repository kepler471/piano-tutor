import {
  BLUES_ROOTS,
  DORIAN_ROOTS,
  MAJOR_ROOTS,
  MINOR_ROOTS,
  MIXOLYDIAN_ROOTS,
  PENTATONIC_ROOTS,
} from '../theory/scales'
import type { Finger } from '../theory/types'

export interface ScaleFingering {
  /** Ascending, one octave incl. top root (scale length + 1 entries). Descending is the reverse. */
  rh: Finger[]
  lh: Finger[]
}

/**
 * Standard one-octave scale fingerings (ABRSM / Hanon convention), ascending.
 * Natural and harmonic minor use the same fingering for a given root.
 */
const MAJOR: Record<string, ScaleFingering> = {
  C: { rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
  G: { rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
  D: { rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
  A: { rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
  E: { rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
  B: { rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [4, 3, 2, 1, 4, 3, 2, 1] },
  'F#': { rh: [2, 3, 4, 1, 2, 3, 1, 2], lh: [4, 3, 2, 1, 3, 2, 1, 4] },
  Db: { rh: [2, 3, 1, 2, 3, 4, 1, 2], lh: [3, 2, 1, 4, 3, 2, 1, 3] },
  Ab: { rh: [3, 4, 1, 2, 3, 1, 2, 3], lh: [3, 2, 1, 4, 3, 2, 1, 3] },
  Eb: { rh: [3, 1, 2, 3, 4, 1, 2, 3], lh: [3, 2, 1, 4, 3, 2, 1, 3] },
  Bb: { rh: [4, 1, 2, 3, 1, 2, 3, 4], lh: [3, 2, 1, 4, 3, 2, 1, 3] },
  F: { rh: [1, 2, 3, 4, 1, 2, 3, 4], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
}

const MINOR: Record<string, ScaleFingering> = {
  A: { rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
  E: { rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
  B: { rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [4, 3, 2, 1, 4, 3, 2, 1] },
  'F#': { rh: [3, 4, 1, 2, 3, 1, 2, 3], lh: [4, 3, 2, 1, 3, 2, 1, 4] },
  'C#': { rh: [3, 4, 1, 2, 3, 1, 2, 3], lh: [3, 2, 1, 4, 3, 2, 1, 3] },
  'G#': { rh: [3, 4, 1, 2, 3, 1, 2, 3], lh: [3, 2, 1, 4, 3, 2, 1, 3] },
  Eb: { rh: [3, 1, 2, 3, 4, 1, 2, 3], lh: [2, 1, 4, 3, 2, 1, 3, 2] },
  Bb: { rh: [4, 1, 2, 3, 1, 2, 3, 4], lh: [2, 1, 3, 2, 1, 4, 3, 2] },
  F: { rh: [1, 2, 3, 4, 1, 2, 3, 4], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
  C: { rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
  G: { rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
  D: { rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
}

/**
 * Blues (6 notes + octave = 7 entries): the common beginner shape — RH thumb
 * on the root and 5th, LH mirrored.
 */
const BLUES_FINGERING: ScaleFingering = {
  rh: [1, 2, 3, 4, 1, 2, 3],
  lh: [5, 4, 3, 2, 1, 2, 1],
}

/** Major pentatonic (5 notes + octave = 6 entries). */
const PENTATONIC_FINGERING: ScaleFingering = {
  rh: [1, 2, 3, 1, 2, 5],
  lh: [5, 4, 3, 2, 1, 3],
}

/** Keyed by ScaleInfo.id, e.g. 'C major', 'F# harmonic minor'. */
export const scaleFingerings: Record<string, ScaleFingering> = {}
for (const root of MAJOR_ROOTS) scaleFingerings[`${root} major`] = MAJOR[root]
for (const root of MINOR_ROOTS) {
  scaleFingerings[`${root} natural minor`] = MINOR[root]
  scaleFingerings[`${root} harmonic minor`] = MINOR[root]
}
for (const root of BLUES_ROOTS) scaleFingerings[`${root} blues`] = BLUES_FINGERING
// Modes borrow the parallel major's pattern — the standard jazz-pedagogy default.
for (const root of DORIAN_ROOTS) scaleFingerings[`${root} dorian`] = MAJOR[root]
for (const root of MIXOLYDIAN_ROOTS) scaleFingerings[`${root} mixolydian`] = MAJOR[root]
for (const root of PENTATONIC_ROOTS) scaleFingerings[`${root} major pentatonic`] = PENTATONIC_FINGERING
