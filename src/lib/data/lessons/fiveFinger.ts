import { Note, Scale } from 'tonal'
import type { Finger } from '../../theory/types'
import type { Lesson, LessonSegment } from './types'

/**
 * Classic five-finger position exercise: five notes up and back down, each
 * finger over its own key. The foundation of beginner hand position.
 */
const RH_FINGERS: Finger[] = [1, 2, 3, 4, 5, 4, 3, 2, 1]
const LH_FINGERS: Finger[] = [5, 4, 3, 2, 1, 2, 3, 4, 5]

function fiveFingerMidis(root: string, octave: number): number[] {
  const notes = Scale.get(`${root}${octave} major`).notes.slice(0, 5)
  const up = notes.map((n) => Note.midi(n)!)
  return [...up, ...up.slice(0, -1).reverse()]
}

function segments(root: string): LessonSegment[] {
  const rh = fiveFingerMidis(root, 4)
  const lh = fiveFingerMidis(root, 3)
  return [
    {
      label: 'Right hand',
      hand: 'R',
      clef: 'treble',
      steps: rh.map((m, i) => ({ midis: [m], fingers: [RH_FINGERS[i]] })),
    },
    {
      label: 'Left hand',
      hand: 'L',
      clef: 'bass',
      steps: lh.map((m, i) => ({ midis: [m], fingers: [LH_FINGERS[i]] })),
    },
  ]
}

export function fiveFingerLessons(): Lesson[] {
  return ['C', 'G', 'F'].map((root) => ({
    id: `five-finger-${root}`,
    title: `Five-finger position in ${root}`,
    method: 'Five-finger positions',
    description: `Place your thumb (right hand) or pinky (left hand) on ${root} and keep each finger over its own key. Play five notes up and back down without moving your hand.`,
    tips: [
      'Keep fingers curved, as if holding a small ball.',
      'Play slowly and evenly — speed comes later.',
      'Let the weight of your arm drop into each key; don’t poke with the fingers.',
    ],
    detectionMode: 'mono',
    keySignature: root,
    tempoBpm: 70,
    segments: segments(root),
  }))
}
