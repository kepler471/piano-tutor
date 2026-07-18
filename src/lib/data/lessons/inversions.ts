import { Note } from 'tonal'
import { chordFingering } from '../chordFingerings'
import { getChord } from '../../theory/chords'
import type { Finger } from '../../theory/types'
import type { Lesson, LessonSegment, LessonStep } from './types'

/**
 * Unit-2 drills for the chord path: climbing a triad through its inversions
 * ("the ladder"), then switching between nearby chords using the inversion
 * that keeps the hand in place — the practical payoff of inversions.
 */

const METHOD = 'Inversions'

const LADDER_LABELS = ['Root position', '1st inversion', '2nd inversion', 'Root, octave up']

/** Root → 1st → 2nd → root-an-octave-up, then back down. */
function ladderSteps(root: string, hand: 'R' | 'L'): LessonStep[] {
  const shapes = [0, 1, 2].map((inv) => getChord(root, 'major', inv))
  const octaveUp = { ...shapes[0], midi: shapes[0].midi.map((m) => m + 12) }
  const climb = [shapes[0], shapes[1], shapes[2], octaveUp, shapes[2], shapes[1], shapes[0]]
  const inversionOf = [0, 1, 2, 0, 2, 1, 0]
  const labelOf = [0, 1, 2, 3, 2, 1, 0]
  return climb.map((chord, i) => {
    const fingering = chordFingering(3, inversionOf[i])
    return {
      midis: chord.midi.map((m) => (hand === 'L' ? m - 12 : m)),
      fingers: (hand === 'R' ? fingering.rh : fingering.lh) as (Finger | null)[],
      label: LADDER_LABELS[labelOf[i]],
    }
  })
}

/** Slash-chord label: symbol, plus the bass note when inverted. */
function slashLabel(root: string, quality: 'major' | 'minor', inversion: number): string {
  const chord = getChord(root, quality, inversion)
  const bass = Note.pitchClass(chord.noteNames[0])
  return inversion === 0 ? chord.symbol : `${chord.symbol}/${bass}`
}

/**
 * I → IV in 2nd inversion → I → V in 1st inversion → I: the classic
 * keep-the-hand-still chord switches, labeled as slash chords.
 */
function switchSteps(root: string, hand: 'R' | 'L'): LessonStep[] {
  const t = (interval: string) => Note.pitchClass(Note.transpose(root, interval))
  const shapes: { root: string; inversion: number }[] = [
    { root, inversion: 0 },
    { root: t('4P'), inversion: 2 },
    { root, inversion: 0 },
    { root: t('5P'), inversion: 1 },
    { root, inversion: 0 },
  ]
  return shapes.map(({ root: r, inversion }) => {
    const chord = getChord(r, 'major', inversion)
    // The IV in 2nd inversion and V in 1st inversion sit around the tonic —
    // drop them next to the root-position I instead of up at their own root.
    const tonicMidi = Note.midi(`${root}4`)!
    const shift = chord.midi[0] - tonicMidi > 6 ? -12 : 0
    const fingering = chordFingering(3, inversion)
    return {
      midis: chord.midi.map((m) => m + shift - (hand === 'L' ? 12 : 0)),
      fingers: (hand === 'R' ? fingering.rh : fingering.lh) as (Finger | null)[],
      label: slashLabel(r, 'major', inversion),
    }
  })
}

export function inversionLessons(): Lesson[] {
  const keys = ['C', 'G', 'F']
  const ladders: Lesson[] = keys.map((root) => ({
    id: `inversion-ladder-${root}`,
    title: `${root} major inversion ladder`,
    method: METHOD,
    description: `Climb the ${root} major triad up the keyboard through its inversions — same three notes, rearranged — and back down. By the top you have covered a whole octave without ever leaving the chord.`,
    tips: [
      'The notes never change — only which one is on the bottom.',
      'Watch the fingering: it changes with the shape (1-3-5, 1-2-5, 1-3-5).',
      'Name the bass note of each shape aloud as you play it.',
    ],
    detectionMode: 'poly',
    keySignature: root,
    tempoBpm: 60,
    segments: [
      { label: 'Right hand', hand: 'R', clef: 'treble', steps: ladderSteps(root, 'R') },
      { label: 'Left hand', hand: 'L', clef: 'bass', steps: ladderSteps(root, 'L') },
    ] satisfies LessonSegment[],
  }))
  const switches: Lesson[] = keys.map((root) => ({
    id: `inversion-switch-${root}`,
    title: `Chord switching in ${root} — inversions at work`,
    method: METHOD,
    description: `Move between the three main chords of ${root} major almost without moving your hand: the IV chord in 2nd inversion and the V chord in 1st inversion share notes and neighbours with home. The slash names (like ${slashLabel(Note.pitchClass(Note.transpose(root, '4P')), 'major', 2)}) say which note is in the bass.`,
    tips: [
      'Find the finger that stays on the same key between chords — keep it down.',
      'The moving fingers travel one or two keys at most. No jumps.',
      'This is why inversions exist: smooth, close, effortless changes.',
    ],
    detectionMode: 'poly',
    keySignature: root,
    tempoBpm: 60,
    segments: [
      { label: 'Right hand', hand: 'R', clef: 'treble', steps: switchSteps(root, 'R') },
      { label: 'Left hand', hand: 'L', clef: 'bass', steps: switchSteps(root, 'L') },
    ] satisfies LessonSegment[],
  }))
  return [...ladders, ...switches]
}
