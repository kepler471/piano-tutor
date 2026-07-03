import { chordFingering } from '../chordFingerings'
import { getChord } from '../../theory/chords'
import type { Lesson, LessonSegment, LessonStep } from './types'

/**
 * Broken chords in the early-grades style: each triad inversion played
 * note-by-note up and down (C-E-G-E-C), moving through all three inversions.
 * Fingering comes from the shared chord fingering table.
 */
export const BROKEN_CHORD_KEYS: { root: string; quality: 'major' | 'minor' }[] = [
  { root: 'C', quality: 'major' },
  { root: 'G', quality: 'major' },
  { root: 'F', quality: 'major' },
  { root: 'D', quality: 'major' },
  { root: 'A', quality: 'minor' },
  { root: 'D', quality: 'minor' },
  { root: 'E', quality: 'minor' },
]

const INVERSION_LABELS = ['Root position', '1st inversion', '2nd inversion']

function brokenSteps(root: string, quality: 'major' | 'minor', hand: 'R' | 'L'): LessonStep[] {
  const steps: LessonStep[] = []
  for (let inv = 0; inv < 3; inv++) {
    const chord = getChord(root, quality, inv)
    const midis = hand === 'R' ? chord.midi : chord.midi.map((m) => m - 12)
    const fingers = hand === 'R' ? chordFingering(3, inv).rh : chordFingering(3, inv).lh
    // Up and down through the shape: n0 n1 n2 n1 n0
    const order = [0, 1, 2, 1, 0]
    order.forEach((idx, i) => {
      steps.push({
        midis: [midis[idx]],
        fingers: [fingers[idx]],
        label: i === 0 ? INVERSION_LABELS[inv] : undefined,
      })
    })
  }
  return steps
}

export function brokenChordLessons(): Lesson[] {
  return BROKEN_CHORD_KEYS.map(({ root, quality }) => ({
    id: `broken-${root}-${quality}`,
    title: `${root} ${quality} broken chords`,
    method: 'Broken chords',
    description: `Play the ${root} ${quality} triad broken — up and down through root position and both inversions.`,
    tips: [
      'Shape the hand over all three notes before you start each group.',
      'Listen for evenness — no note louder or shorter than its neighbours.',
      'Between inversions, move the hand in one calm gesture, not a lunge.',
    ],
    detectionMode: 'mono',
    keySignature: quality === 'major' ? root : `${root}m`,
    tempoBpm: 66,
    segments: [
      { label: 'Right hand', hand: 'R', clef: 'treble', steps: brokenSteps(root, quality, 'R') },
      { label: 'Left hand', hand: 'L', clef: 'bass', steps: brokenSteps(root, quality, 'L') },
    ] satisfies LessonSegment[],
  }))
}
