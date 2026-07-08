import { Note } from 'tonal'
import type { Finger } from '../../theory/types'
import type { Lesson, LessonSegment } from './types'
import { handsTogether, upDown } from './scaleRoutine'

/**
 * Chromatic scales from a few contrasting starting notes, one octave, hands
 * separate then together (ABRSM Grade 3 form).
 *
 * Fingering is the standard "French" chromatic fingering (ABRSM/Hanon
 * convention), which is periodic by pitch class rather than per-key:
 * 3 on every black key, thumb on every white key, except that the second
 * white key of each white-white pair takes 2 — for the RH that is C and F,
 * for the LH (mirrored) E and B. A run starting on C or F still begins with
 * the thumb. Hand-authored convention, not derivable — do not compute.
 */

const BLACK_PCS = new Set([1, 3, 6, 8, 10])
const RH_TWO_PCS = new Set([0, 5]) // C, F
const LH_TWO_PCS = new Set([4, 11]) // E, B

export function chromaticFinger(midi: number, hand: 'R' | 'L', isFirst: boolean): Finger {
  const pc = ((midi % 12) + 12) % 12
  if (BLACK_PCS.has(pc)) return 3
  if (!isFirst && (hand === 'R' ? RH_TWO_PCS : LH_TWO_PCS).has(pc)) return 2
  return 1
}

export const CHROMATIC_STARTS = ['C', 'D', 'A'] as const

function chromaticSegments(startMidi: number): LessonSegment[] {
  const ascending = Array.from({ length: 13 }, (_, i) => startMidi + i)
  const rh = ascending.map((m, i) => chromaticFinger(m, 'R', i === 0))
  const lh = ascending.map((m, i) => chromaticFinger(m, 'L', i === 0))
  const lhMidis = ascending.map((m) => m - 12)
  return [
    { label: 'Right hand', hand: 'R', clef: 'treble', steps: upDown(ascending, rh) },
    { label: 'Left hand', hand: 'L', clef: 'bass', steps: upDown(lhMidis, lh) },
    {
      label: 'Hands together',
      hand: 'both',
      clef: 'grand',
      detectionMode: 'poly',
      steps: handsTogether(ascending, rh, lh),
    },
  ]
}

export function chromaticScaleLessons(): Lesson[] {
  return CHROMATIC_STARTS.map((root) => {
    const startMidi = Note.midi(`${root}4`)!
    return {
      id: `chromatic-${root}`,
      title: `Chromatic scale from ${root}`,
      method: 'Chromatic scale',
      description: `Every key in order, one octave up and down from ${root} — 3 on the black keys, thumb on the whites, 2 to bridge the two white-key pairs.`,
      tips: [
        'Stay close to the keys — the pattern is all about economy of movement.',
        'Keep it perfectly even; the thumb notes love to stick out.',
        'Get comfortable from one starting note, then try a few others — the fingering rule transfers instantly.',
      ],
      detectionMode: 'mono' as const,
      keySignature: 'C',
      tempoBpm: 60,
      segments: chromaticSegments(startMidi),
    }
  })
}
