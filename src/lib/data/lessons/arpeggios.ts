import { getChord } from '../../theory/chords'
import type { Finger } from '../../theory/types'
import type { Lesson, LessonSegment, LessonStep } from './types'

/**
 * Root-position triad arpeggios, one and two octaves, hands separate, in all
 * 24 major/minor keys.
 *
 * Fingerings are hand-authored pedagogical convention (ABRSM Manual of
 * Scales, Arpeggios and Broken Chords; editions vary slightly for black-key
 * roots — this table follows the common "thumb on the white key" rule):
 * - White-key roots: the universal 1-2-3-5 / 5-3-2-1 pattern.
 * - Black-key roots with one or two white chord tones: the thumb takes the
 *   first white note above the root — RH 2-1-2-4, LH 2-1-4-2 per octave
 *   (B♭ minor's white note is the fifth, hence RH 2-3-1-4 / LH 3-2-1-3).
 * - All-black triads (F♯ major, E♭ minor): no white key to anchor, so the
 *   universal white-key pattern applies with the thumb on the (black) root.
 */

export interface ArpeggioFingering {
  rh1: Finger[]
  lh1: Finger[]
  rh2: Finger[]
  lh2: Finger[]
}

/** The universal white-key-root (and all-black-triad) pattern. */
const WHITE_KEY_FINGERING: ArpeggioFingering = {
  rh1: [1, 2, 3, 5],
  lh1: [5, 3, 2, 1],
  rh2: [1, 2, 3, 1, 2, 3, 5],
  lh2: [5, 3, 2, 1, 3, 2, 1],
}

/** Black-key root, thumb on the white second chord tone (e.g. B♭ major: 2 on B♭, 1 on D). */
const BLACK_ROOT_FINGERING: ArpeggioFingering = {
  rh1: [2, 1, 2, 4],
  lh1: [2, 1, 4, 2],
  rh2: [2, 1, 2, 4, 1, 2, 4],
  lh2: [2, 1, 4, 2, 1, 4, 2],
}

/** B♭ minor: the only white note (F) is the fifth, so the thumb lands there. */
const BB_MINOR_FINGERING: ArpeggioFingering = {
  rh1: [2, 3, 1, 4],
  lh1: [3, 2, 1, 3],
  rh2: [2, 3, 1, 2, 3, 1, 4],
  lh2: [3, 2, 1, 3, 2, 1, 3],
}

export const ARPEGGIO_KEYS: { root: string; quality: 'major' | 'minor' }[] = [
  { root: 'C', quality: 'major' },
  { root: 'G', quality: 'major' },
  { root: 'D', quality: 'major' },
  { root: 'A', quality: 'major' },
  { root: 'E', quality: 'major' },
  { root: 'B', quality: 'major' },
  { root: 'F', quality: 'major' },
  { root: 'Bb', quality: 'major' },
  { root: 'Eb', quality: 'major' },
  { root: 'Ab', quality: 'major' },
  { root: 'Db', quality: 'major' },
  { root: 'F#', quality: 'major' },
  { root: 'A', quality: 'minor' },
  { root: 'E', quality: 'minor' },
  { root: 'B', quality: 'minor' },
  { root: 'D', quality: 'minor' },
  { root: 'G', quality: 'minor' },
  { root: 'C', quality: 'minor' },
  { root: 'F', quality: 'minor' },
  { root: 'F#', quality: 'minor' },
  { root: 'C#', quality: 'minor' },
  { root: 'G#', quality: 'minor' },
  { root: 'Bb', quality: 'minor' },
  { root: 'Eb', quality: 'minor' },
]

const BLACK_ROOTS = new Set(['Bb', 'Eb', 'Ab', 'Db', 'F#', 'C#', 'G#'])

/** Keyed by `${root} ${quality}`. */
export const ARPEGGIO_FINGERINGS: Record<string, ArpeggioFingering> = Object.fromEntries(
  ARPEGGIO_KEYS.map(({ root, quality }) => {
    const key = `${root} ${quality}`
    if (key === 'Bb minor') return [key, BB_MINOR_FINGERING]
    // All-black triads take the universal pattern despite the black root.
    if (key === 'F# major' || key === 'Eb minor') return [key, WHITE_KEY_FINGERING]
    return [key, BLACK_ROOTS.has(root) ? BLACK_ROOT_FINGERING : WHITE_KEY_FINGERING]
  }),
)

const upDown = (midis: number[], fingers: Finger[]): LessonStep[] => {
  const m = [...midis, ...midis.slice(0, -1).reverse()]
  const f = [...fingers, ...fingers.slice(0, -1).reverse()]
  return m.map((midi, i) => ({ midis: [midi], fingers: [f[i]] as (Finger | null)[] }))
}

function arpeggioSegments(root: string, quality: 'major' | 'minor'): LessonSegment[] {
  const triad = getChord(root, quality, 0).midi // root position near octave 4
  const oneOct = [...triad, triad[0] + 12]
  const twoOct = [...triad, ...triad.map((m) => m + 12), triad[0] + 24]
  const fingering = ARPEGGIO_FINGERINGS[`${root} ${quality}`]
  return [
    { label: 'Right hand', hand: 'R', clef: 'treble', steps: upDown(oneOct, fingering.rh1) },
    {
      label: 'Left hand',
      hand: 'L',
      clef: 'bass',
      steps: upDown(oneOct.map((m) => m - 12), fingering.lh1),
    },
    { label: 'RH · 2 octaves', hand: 'R', clef: 'treble', steps: upDown(twoOct, fingering.rh2) },
    {
      label: 'LH · 2 octaves',
      hand: 'L',
      clef: 'bass',
      steps: upDown(twoOct.map((m) => m - 24), fingering.lh2),
    },
  ]
}

export function arpeggioLessons(): Lesson[] {
  return ARPEGGIO_KEYS.map(({ root, quality }) => ({
    id: `arpeggio-${root}-${quality}`,
    title: `${root} ${quality} arpeggio`,
    method: 'Arpeggios',
    description: `Play the ${root} ${quality} triad as an arpeggio, up and down — first one octave, then two.`,
    tips: [
      'Let the wrist travel smoothly sideways — no jumping between notes.',
      'The thumb passes under early and stays close to the keys.',
      'Even tone on every note: arpeggios expose uneven fingers instantly.',
    ],
    detectionMode: 'mono',
    keySignature: quality === 'major' ? root : `${root}m`,
    tempoBpm: 60,
    segments: arpeggioSegments(root, quality),
  }))
}
