import { Note } from 'tonal'
import { chordFingering } from '../chordFingerings'
import { CHORD_QUALITIES, getChord } from '../../theory/chords'
import { MAJOR_DEGREES, diatonicTriad } from '../../theory/progressions'
import type { Finger } from '../../theory/types'
import type { Lesson, LessonSegment, LessonStep } from './types'

/**
 * Unit-3 drill for the chord path: harmonize the major scale — the seven
 * diatonic triads played up from the tonic, each labeled with its roman
 * numeral, closing on I an octave up.
 */

const METHOD = 'Diatonic chords'

function suffixOf(quality: string): string {
  return CHORD_QUALITIES.find((q) => q.id === quality)!.suffix
}

function diatonicSteps(key: string, hand: 'R' | 'L'): LessonStep[] {
  const fingering = chordFingering(3, 0)
  const fingers = (hand === 'R' ? fingering.rh : fingering.lh) as (Finger | null)[]
  const steps: LessonStep[] = MAJOR_DEGREES.map(([numeral, interval]) => {
    const { root, quality } = diatonicTriad(key, numeral)
    const chord = getChord(root, quality, 0)
    // getChord anchors every root at octave 4; lift the upper degrees so the
    // roots ascend stepwise from the tonic (e.g. in G major, C is C5 not C4).
    const targetRoot = Note.midi(Note.transpose(`${key}4`, interval))!
    const shift = targetRoot - chord.midi[0]
    return {
      midis: chord.midi.map((m) => m + shift - (hand === 'L' ? 24 : 0)),
      fingers,
      label: `${numeral} (${root}${suffixOf(quality)})`,
    }
  })
  steps.push({
    midis: getChord(key, 'major', 0).midi.map((m) => m + 12 - (hand === 'L' ? 24 : 0)),
    fingers,
    label: `I (${key})`,
  })
  return steps
}

export function diatonicLessons(): Lesson[] {
  return ['C', 'G', 'F'].map((key) => ({
    id: `diatonic-triads-${key}`,
    title: `Diatonic triads of ${key} major`,
    method: METHOD,
    description: `Build a triad on every note of the ${key} major scale using only the notes of the key. The qualities always come out in the same order — major, minor, minor, major, major, minor, diminished — which is why roman numerals (I, ii, iii, IV, V, vi, vii°) name a chord in any key.`,
    tips: [
      'Upper-case numerals are major chords, lower-case minor; ° marks diminished.',
      'The shape is identical each time — the key signature does the rest.',
      'Say each numeral aloud: this is the alphabet of chord progressions.',
    ],
    detectionMode: 'poly',
    keySignature: key,
    tempoBpm: 63,
    segments: [
      { label: 'Right hand', hand: 'R', clef: 'treble', steps: diatonicSteps(key, 'R') },
      { label: 'Left hand', hand: 'L', clef: 'bass', steps: diatonicSteps(key, 'L') },
    ] satisfies LessonSegment[],
  }))
}
