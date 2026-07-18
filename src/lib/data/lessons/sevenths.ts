import { Note } from 'tonal'
import { chordFingering } from '../chordFingerings'
import { getChord } from '../../theory/chords'
import { closestInversion } from '../../theory/progressions'
import type { ChordQualityId, Finger } from '../../theory/types'
import type { Lesson, LessonSegment, LessonStep } from './types'

/**
 * Unit-6 drills for the chord path: the common seventh-chord qualities as
 * blocks, and the V7→I resolution — first as full chords, then stripped to
 * the bare tritone so the pull is impossible to miss.
 */

const METHOD = 'Seventh chords'

function seventhBlocksLesson(): Lesson {
  const chords: { root: string; quality: ChordQualityId }[] = [
    { root: 'C', quality: 'major 7th' },
    { root: 'D', quality: 'minor 7th' },
    { root: 'G', quality: 'dominant 7th' },
    { root: 'B', quality: 'half-diminished' },
    { root: 'C', quality: 'major 7th' },
  ]
  const steps = (hand: 'R' | 'L'): LessonStep[] =>
    chords.map(({ root, quality }) => {
      const chord = getChord(root, quality, 0)
      const fingering = chordFingering(4, 0)
      return {
        midis: chord.midi.map((m) => (hand === 'L' ? m - 12 : m)),
        fingers: (hand === 'R' ? fingering.rh : fingering.lh) as (Finger | null)[],
        label: chord.symbol,
      }
    })
  return {
    id: 'sevenths-blocks-C',
    title: 'Seventh chords of C major',
    method: METHOD,
    description:
      'Stack one more 3rd on a triad and you get a seventh chord — four notes, four distinct colours. These four all live in C major: Cmaj7 (dreamy home), Dm7 (the soft ii), G7 (the tension chord), and Bm7♭5 (the dark half-diminished).',
    tips: [
      'Four notes now — check every one sounds, especially the quiet 7th.',
      'Compare G7 with plain G: that added F is what makes it itch to resolve.',
      'maj7 and 7 differ by one semitone at the top and have opposite personalities.',
    ],
    detectionMode: 'poly',
    keySignature: 'C',
    tempoBpm: 60,
    segments: [
      { label: 'Right hand', hand: 'R', clef: 'treble', steps: steps('R') },
      { label: 'Left hand', hand: 'L', clef: 'bass', steps: steps('L') },
    ] satisfies LessonSegment[],
  }
}

function resolveLessons(): Lesson[] {
  return ['C', 'G', 'F'].map((key) => {
    const dominantRoot = Note.pitchClass(Note.transpose(key, '5P'))
    const tonic = getChord(key, 'major', 0)
    const v7 = closestInversion(tonic.midi, dominantRoot, 'dominant 7th')
    const fullSteps = (hand: 'R' | 'L'): LessonStep[] => {
      const shift = hand === 'L' ? -12 : 0
      const pair: LessonStep[] = [
        {
          midis: v7.midi.map((m) => m + shift),
          fingers: (hand === 'R' ? chordFingering(4, v7.inversion).rh : chordFingering(4, v7.inversion).lh) as (Finger | null)[],
          label: `${v7.symbol} — tension`,
        },
        {
          midis: tonic.midi.map((m) => m + shift),
          fingers: (hand === 'R' ? chordFingering(3, 0).rh : chordFingering(3, 0).lh) as (Finger | null)[],
          label: `${key} — home`,
        },
      ]
      return [...pair, ...pair]
    }
    // The bare tritone: 3rd and 7th of V7 resolving outward-in to root and 3rd of I.
    const leading = Note.midi(`${key}4`)! - 1
    const fourth = Note.midi(Note.transpose(`${key}4`, '4P'))!
    const tonicMidi = Note.midi(`${key}4`)!
    const third = Note.midi(Note.transpose(`${key}4`, '3M'))!
    const tritonePair: LessonStep[] = [
      { midis: [leading, fourth], fingers: [1, 4], label: `${dominantRoot}7 tritone` },
      { midis: [tonicMidi, third], fingers: [1, 3], label: 'Resolved' },
    ]
    return {
      id: `v7-resolve-${key}`,
      title: `V7 → I resolution in ${key}`,
      method: METHOD,
      description: `${v7.symbol} resolving to ${key}: the engine of tonal harmony. Inside ${v7.symbol} sit two notes a tritone apart — the leading tone and the 4th — and they squeeze inward by a semitone each onto the root and 3rd of ${key}. The second segment strips the chord down to just that pair so you can hear the mechanism itself.`,
      tips: [
        'Hold the V7 a moment before resolving — let the tension register.',
        'Leading tone up a semitone, 7th down a semitone: two tiny moves, total release.',
        'The two-note version is the whole trick — every full V7–I hides this pair.',
      ],
      detectionMode: 'poly' as const,
      keySignature: key,
      tempoBpm: 60,
      segments: [
        { label: 'Full chords', hand: 'R', clef: 'treble', steps: fullSteps('R') },
        { label: 'Tritone only', hand: 'R', clef: 'treble', steps: [...tritonePair, ...tritonePair] },
        { label: 'Left hand', hand: 'L', clef: 'bass', steps: fullSteps('L') },
      ] satisfies LessonSegment[],
    }
  })
}

export function seventhLessons(): Lesson[] {
  return [seventhBlocksLesson(), ...resolveLessons()]
}
