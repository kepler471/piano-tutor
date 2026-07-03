import { getChord } from '../../theory/chords'
import type { Finger } from '../../theory/types'
import type { Lesson, LessonSegment, LessonStep } from './types'

/**
 * Root-position triad arpeggios, one and two octaves, hands separate.
 * Restricted to white-key roots where the universal 1-2-3-5 / 5-3-2-1
 * fingering applies — black-key arpeggio fingerings vary by edition and
 * deserve their own hand-authored table before we teach them.
 */
export const ARPEGGIO_KEYS: { root: string; quality: 'major' | 'minor' }[] = [
  { root: 'C', quality: 'major' },
  { root: 'G', quality: 'major' },
  { root: 'D', quality: 'major' },
  { root: 'A', quality: 'major' },
  { root: 'E', quality: 'major' },
  { root: 'F', quality: 'major' },
  { root: 'A', quality: 'minor' },
  { root: 'E', quality: 'minor' },
  { root: 'D', quality: 'minor' },
  { root: 'G', quality: 'minor' },
  { root: 'C', quality: 'minor' },
]

export const ARPEGGIO_FINGERING = {
  rh1: [1, 2, 3, 5] as Finger[],
  lh1: [5, 3, 2, 1] as Finger[],
  rh2: [1, 2, 3, 1, 2, 3, 5] as Finger[],
  lh2: [5, 3, 2, 1, 3, 2, 1] as Finger[],
}

const upDown = (midis: number[], fingers: Finger[]): LessonStep[] => {
  const m = [...midis, ...midis.slice(0, -1).reverse()]
  const f = [...fingers, ...fingers.slice(0, -1).reverse()]
  return m.map((midi, i) => ({ midis: [midi], fingers: [f[i]] as (Finger | null)[] }))
}

function arpeggioSegments(root: string, quality: 'major' | 'minor'): LessonSegment[] {
  const triad = getChord(root, quality, 0).midi // root position near octave 4
  const oneOct = [...triad, triad[0] + 12]
  const twoOct = [...triad, ...triad.map((m) => m + 12), triad[0] + 24]
  return [
    { label: 'Right hand', hand: 'R', clef: 'treble', steps: upDown(oneOct, ARPEGGIO_FINGERING.rh1) },
    {
      label: 'Left hand',
      hand: 'L',
      clef: 'bass',
      steps: upDown(oneOct.map((m) => m - 12), ARPEGGIO_FINGERING.lh1),
    },
    { label: 'RH · 2 octaves', hand: 'R', clef: 'treble', steps: upDown(twoOct, ARPEGGIO_FINGERING.rh2) },
    {
      label: 'LH · 2 octaves',
      hand: 'L',
      clef: 'bass',
      steps: upDown(twoOct.map((m) => m - 24), ARPEGGIO_FINGERING.lh2),
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
