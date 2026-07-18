import { Note } from 'tonal'
import { chordFingering } from '../chordFingerings'
import { getChord } from '../../theory/chords'
import { closestInversion, diatonicTriad } from '../../theory/progressions'
import type { ChordInfo, ChordQualityId, Finger } from '../../theory/types'
import type { Lesson, LessonSegment, LessonStep } from './types'

/**
 * Unit-7 of the chord path: left-hand accompaniment patterns over one
 * progression (I–vi–IV–V in C), and a lead-sheet capstone — playing a whole
 * song from chord symbols alone.
 */

const METHOD = 'Accompaniment'

/** I–vi–IV–V voice-led around octave 3 for the left hand. */
function lhProgression(key: string): { symbol: string; chord: ChordInfo }[] {
  let prev = getChord(key, 'major', 0).midi
  return ['I', 'vi', 'IV', 'V'].map((numeral, i) => {
    const { root, quality } = diatonicTriad(key, numeral)
    const chord = i === 0 ? getChord(key, 'major', 0) : closestInversion(prev, root, quality)
    prev = chord.midi
    return { symbol: chord.inversion === 0 ? chord.symbol : `${chord.symbol}/${Note.pitchClass(chord.noteNames[0])}`, chord }
  })
}

const LH_SHIFT = -12 // voicings are anchored at octave 4; the LH lives an octave down

function patternLesson(
  id: string,
  title: string,
  description: string,
  tips: string[],
  detectionMode: 'mono' | 'poly',
  tempoBpm: number,
  barSteps: (entry: { symbol: string; chord: ChordInfo }) => LessonStep[]
): Lesson {
  const rounds = [...lhProgression('C'), ...lhProgression('C')]
  return {
    id,
    title,
    method: METHOD,
    description,
    tips,
    detectionMode,
    keySignature: 'C',
    tempoBpm,
    segments: [
      { label: 'Left hand', hand: 'L', clef: 'bass', steps: rounds.flatMap(barSteps) },
    ] satisfies LessonSegment[],
  }
}

function accompanimentPatternLessons(): Lesson[] {
  const block = patternLesson(
    'accomp-block-C',
    'Block-chord accompaniment (I–vi–IV–V)',
    'The simplest accompaniment there is: one solid chord per bar in the left hand, here on the 50s loop I–vi–IV–V in C. Every other pattern in this unit is this one, opened up.',
    [
      'Keep the changes smooth — the voicings barely move; neither should your hand.',
      'Play at the bottom of the beat, softly: accompaniment supports, it never shouts.',
      'Once secure, hum or play any melody in C over the top with your right hand.',
    ],
    'poly',
    60,
    ({ symbol, chord }) => [
      {
        midis: chord.midi.map((m) => m + LH_SHIFT),
        fingers: chordFingering(3, chord.inversion).lh as (Finger | null)[],
        label: symbol,
      },
    ]
  )
  const broken = patternLesson(
    'accomp-broken-C',
    'Broken-chord accompaniment (I–vi–IV–V)',
    'The same chords, one note at a time: bottom–middle–top–middle in each bar. Breaking the chord keeps the harmony moving instead of thudding once a bar — the standard accompaniment for gentle songs.',
    [
      'Perfectly even notes matter more than speed.',
      'Think of each bar as one hand shape — form the chord, then unroll it.',
      'The metronome grades your timing here: land each note on the click.',
    ],
    'mono',
    72,
    ({ symbol, chord }) => {
      const fingers = chordFingering(3, chord.inversion).lh
      return [0, 1, 2, 1].map((idx, i) => ({
        midis: [chord.midi[idx] + LH_SHIFT],
        fingers: [fingers[idx]] as (Finger | null)[],
        label: i === 0 ? symbol : undefined,
      }))
    }
  )
  const alberti = patternLesson(
    'accomp-alberti-C',
    'Alberti bass (I–vi–IV–V)',
    'Bottom–top–middle–top: the Alberti bass, the restless broken-chord figure that powers Mozart\'s sonatas (hear it in his K545). The pattern touches the outer notes first so the harmony is clear immediately.',
    [
      'Keep the thumb light — the repeated top note wants to bang.',
      'The bottom note carries the harmony: give it a little weight.',
      'Slow and even first; the sparkle comes from regularity, not speed.',
    ],
    'mono',
    72,
    ({ symbol, chord }) => {
      const fingers = chordFingering(3, chord.inversion).lh
      return [0, 2, 1, 2].map((idx, i) => ({
        midis: [chord.midi[idx] + LH_SHIFT],
        fingers: [fingers[idx]] as (Finger | null)[],
        label: i === 0 ? symbol : undefined,
      }))
    }
  )
  const lowRoot = (chord: ChordInfo): number => {
    const rootChroma = Note.chroma(chord.root)!
    for (let m = 36; m < 48; m++) if (m % 12 === rootChroma) return m
    return 36
  }
  const stride = patternLesson(
    'accomp-stride-C',
    'Root–chord "stride" accompaniment (I–vi–IV–V)',
    'Low root on the strong beat, chord in the middle of the keyboard on the weak beat: oom-pah. This root-then-chord bounce is the backbone of stride piano, ragtime, and every campfire song ever strummed.',
    [
      'The jump is the skill: eyes ahead to where the chord shape lands.',
      'Root deep and firm, chord light and short.',
      'Practice the jump silently first — hover root, hover chord — before sounding it.',
    ],
    'poly',
    66,
    ({ symbol, chord }) => [
      { midis: [lowRoot(chord)], fingers: [5] as (Finger | null)[], label: symbol },
      { midis: chord.midi.map((m) => m + LH_SHIFT), fingers: chord.midi.map(() => null), label: undefined },
    ]
  )
  return [block, broken, alberti, stride]
}

/** When the Saints Go Marching In — the classic 16-bar changes. */
const SAINTS_CHANGES: { symbol: string; root: string; quality: ChordQualityId }[] = [
  { symbol: 'C', root: 'C', quality: 'major' },
  { symbol: 'C', root: 'C', quality: 'major' },
  { symbol: 'C', root: 'C', quality: 'major' },
  { symbol: 'C', root: 'C', quality: 'major' },
  { symbol: 'C', root: 'C', quality: 'major' },
  { symbol: 'C', root: 'C', quality: 'major' },
  { symbol: 'G', root: 'G', quality: 'major' },
  { symbol: 'G', root: 'G', quality: 'major' },
  { symbol: 'C', root: 'C', quality: 'major' },
  { symbol: 'C7', root: 'C', quality: 'dominant 7th' },
  { symbol: 'F', root: 'F', quality: 'major' },
  { symbol: 'F', root: 'F', quality: 'major' },
  { symbol: 'C', root: 'C', quality: 'major' },
  { symbol: 'G', root: 'G', quality: 'major' },
  { symbol: 'C', root: 'C', quality: 'major' },
  { symbol: 'C', root: 'C', quality: 'major' },
]

function leadSheetCapstone(): Lesson {
  let prev = getChord('C', 'major', 0).midi
  const steps: LessonStep[] = SAINTS_CHANGES.map(({ symbol, root, quality }, i) => {
    const chord = i === 0 ? getChord('C', 'major', 0) : closestInversion(prev, root, quality)
    prev = chord.midi
    const rootChroma = Note.chroma(root)!
    let bass = 36
    for (let m = 36; m < 48; m++) if (m % 12 === rootChroma) bass = m
    return {
      midis: [bass, ...chord.midi],
      fingers: [null, ...chord.midi.map(() => null)] as (Finger | null)[],
      hands: ['L', ...chord.midi.map(() => 'R' as const)],
      label: symbol,
    }
  })
  return {
    id: 'lead-sheet-capstone',
    title: 'Lead-sheet capstone — When the Saints',
    method: METHOD,
    hints: 'reading',
    description:
      'Play a whole song from chord symbols alone, the way a lead sheet asks you to: left hand takes the root, right hand any comfortable voicing of the named chord, one per bar through the 16-bar form of When the Saints Go Marching In. The keyboard hints are off — the symbols are all you get, exactly like the real thing.',
    tips: [
      'Read one symbol ahead: while a bar sounds, your eyes find the next chord.',
      'Any inversion of the right chord is correct — pick whichever is closest.',
      'When this flows, hum the tune over your accompaniment. That’s the whole skill.',
    ],
    detectionMode: 'poly',
    keySignature: 'C',
    tempoBpm: 66,
    segments: [
      { label: 'Hands together', hand: 'both', clef: 'grand', steps },
    ] satisfies LessonSegment[],
  }
}

export function accompanimentLessons(): Lesson[] {
  return [...accompanimentPatternLessons(), leadSheetCapstone()]
}
