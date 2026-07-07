import { getScale } from '../../theory/scales'
import { scaleFingerings } from '../scaleFingerings'
import type { Lesson, LessonStep } from './types'

/**
 * Contrary-motion scales (ABRSM Grade 2–3 form): both thumbs start on the
 * same tonic, the hands move apart one octave and come back. The LH simply
 * plays the descending scale with its normal fingering, so no new fingering
 * data is needed; in the mirror-symmetric keys (C, G, E) both hands even use
 * identical finger numbers throughout.
 */

export const CONTRARY_KEYS = ['C', 'G', 'E', 'F'] as const

/** Out-and-back contrary steps from the shared tonic. */
export function contrarySteps(root: string): LessonStep[] {
  const scale = getScale(root, 'major')
  const fingering = scaleFingerings[scale.id]
  const rhOut = scale.midi // tonic up one octave
  const lhOut = [...scale.midi].reverse().map((m) => m - 12) // tonic down one octave
  const rhF = fingering.rh
  const lhF = [...fingering.lh].reverse()

  const outAndBack = <T>(arr: T[]): T[] => [...arr, ...arr.slice(0, -1).reverse()]
  const rhSeq = outAndBack(rhOut)
  const lhSeq = outAndBack(lhOut)
  const rhFSeq = outAndBack([...rhF])
  const lhFSeq = outAndBack([...lhF])

  return rhSeq.map((rhMidi, i) => {
    const lhMidi = lhSeq[i]
    // First and last steps are a unison — one physical note, both thumbs.
    if (lhMidi === rhMidi) return { midis: [rhMidi], fingers: [rhFSeq[i]], hands: ['R'] }
    return {
      midis: [lhMidi, rhMidi],
      fingers: [lhFSeq[i], rhFSeq[i]],
      hands: ['L', 'R'],
    }
  })
}

export function contraryMotionLessons(): Lesson[] {
  return CONTRARY_KEYS.map((root) => ({
    id: `contrary-${root}-major`,
    title: `${root} major in contrary motion`,
    method: 'Contrary motion',
    description: `Both thumbs on ${root}: the hands move apart one octave and back in. A mirror of itself — great for evenness and hand independence.`,
    tips: [
      'Both thumbs start on the same note — the hands are mirror images.',
      'The turnaround at the outside is where it falls apart; slow down into it.',
      'Listen across the hands: the two lines should sound like one gesture.',
    ],
    detectionMode: 'poly' as const,
    keySignature: root,
    tempoBpm: 60,
    segments: [
      {
        label: 'Hands together, contrary motion',
        hand: 'both',
        clef: 'grand',
        steps: contrarySteps(root),
      },
    ],
  }))
}
