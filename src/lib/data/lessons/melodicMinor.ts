import { getScale } from '../../theory/scales'
import { scaleFingerings } from '../scaleFingerings'
import type { Lesson, LessonSegment } from './types'

/**
 * Melodic minor scales: raised 6th and 7th on the way up, natural minor on
 * the way down. The asymmetry is why these live as explicit lesson steps
 * rather than a ScaleTypeId — ScaleInfo/upDown assume the descent mirrors
 * the ascent, and the scales library would need the same assumption broken.
 *
 * Fingering: the standard charts use the same fingering for all three minor
 * forms of a given root (see scaleFingerings.ts), so the natural-minor table
 * covers both directions.
 */

export const MELODIC_MINOR_ROOTS = ['A', 'D', 'E', 'G', 'C'] as const

function melodicSegments(root: string): LessonSegment[] {
  const natural = getScale(root, 'natural minor')
  const fingering = scaleFingerings[natural.id]
  // Raise scale degrees 6 and 7 (indices 5 and 6 of the 8-note octave).
  const ascending = natural.midi.map((m, i) => (i === 5 || i === 6 ? m + 1 : m))
  const descending = [...natural.midi].reverse().slice(1)

  const midis = [...ascending, ...descending]
  const rh = [...fingering.rh, ...[...fingering.rh].reverse().slice(1)]
  const lh = [...fingering.lh, ...[...fingering.lh].reverse().slice(1)]

  return [
    {
      label: 'Right hand',
      hand: 'R',
      clef: 'treble',
      steps: midis.map((m, i) => ({ midis: [m], fingers: [rh[i]] })),
    },
    {
      label: 'Left hand',
      hand: 'L',
      clef: 'bass',
      steps: midis.map((m, i) => ({ midis: [m - 12], fingers: [lh[i]] })),
    },
    {
      label: 'Hands together',
      hand: 'both',
      clef: 'grand',
      detectionMode: 'poly',
      steps: midis.map((m, i) => ({
        midis: [m - 12, m],
        fingers: [lh[i], rh[i]],
        hands: ['L', 'R'],
      })),
    },
  ]
}

export function melodicMinorLessons(): Lesson[] {
  return MELODIC_MINOR_ROOTS.map((root) => ({
    id: `scale-${root}-melodic-minor`,
    title: `${root} melodic minor scale`,
    method: 'Scale routine',
    description: `The singer's minor: raised 6th and 7th ascending for a smooth climb to the tonic, natural minor coming down.`,
    tips: [
      'Up and down are different scales — say the changing notes out loud at first.',
      'The raised notes only exist on the way up; coming down, everything relaxes.',
      'Same fingering as the other minor forms — only the notes change.',
      'Learn harmonic and melodic minor side by side — start in C or A, where the changed notes are easiest to see.',
    ],
    detectionMode: 'mono' as const,
    keySignature: `${root}m`,
    tempoBpm: 66,
    segments: melodicSegments(root),
  }))
}
