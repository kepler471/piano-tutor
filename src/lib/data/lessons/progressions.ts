import { Note } from 'tonal'
import { chordFingering } from '../chordFingerings'
import { getChord } from '../../theory/chords'
import { closestInversion, diatonicTriad } from '../../theory/progressions'
import type { ChordInfo, Finger } from '../../theory/types'
import type { Lesson, LessonSegment, LessonStep } from './types'

/**
 * Units 4–5 of the chord path: the four cadence types as short labeled
 * phrases, then the great workhorse progressions (pop, 50s, 12-bar blues)
 * with voicings chained by closest inversion so every change is smooth.
 */

const CADENCE_METHOD = 'Cadence types'
const PROG_METHOD = 'Progressions'

/** 'V (G/B)' — numeral plus chord symbol, slash bass when inverted. */
function numeralLabel(numeral: string, chord: ChordInfo): string {
  const bass = Note.pitchClass(chord.noteNames[0])
  const symbol = chord.inversion === 0 ? chord.symbol : `${chord.symbol}/${bass}`
  return `${numeral} (${symbol})`
}

/** Voice-lead a numeral progression from a root-position I. */
function chainVoicings(key: string, numerals: string[]): { numeral: string; chord: ChordInfo }[] {
  const out: { numeral: string; chord: ChordInfo }[] = []
  let prev = getChord(key, 'major', 0).midi
  numerals.forEach((numeral, i) => {
    const { root, quality } = diatonicTriad(key, numeral)
    const chord = i === 0 && numeral === 'I' ? getChord(key, 'major', 0) : closestInversion(prev, root, quality)
    out.push({ numeral, chord })
    prev = chord.midi
  })
  return out
}

function voicingSteps(voicings: { numeral: string; chord: ChordInfo }[], hand: 'R' | 'L', firstLabel?: string): LessonStep[] {
  return voicings.map(({ numeral, chord }, i) => {
    const fingering = chordFingering(3, chord.inversion)
    return {
      midis: chord.midi.map((m) => (hand === 'L' ? m - 12 : m)),
      fingers: (hand === 'R' ? fingering.rh : fingering.lh) as (Finger | null)[],
      label: i === 0 && firstLabel ? `${firstLabel}: ${numeralLabel(numeral, chord)}` : numeralLabel(numeral, chord),
    }
  })
}

const CADENCE_PHRASES: { name: string; numerals: string[] }[] = [
  { name: 'Authentic', numerals: ['I', 'V', 'I'] },
  { name: 'Plagal', numerals: ['I', 'IV', 'I'] },
  { name: 'Half', numerals: ['I', 'IV', 'V'] },
  { name: 'Deceptive', numerals: ['I', 'V', 'vi'] },
]

function cadenceTypeLessons(): Lesson[] {
  return ['C', 'G'].map((key) => {
    const steps = (hand: 'R' | 'L') =>
      CADENCE_PHRASES.flatMap(({ name, numerals }) => voicingSteps(chainVoicings(key, numerals), hand, name))
    return {
      id: `cadence-types-${key}`,
      title: `The four cadences in ${key}`,
      method: CADENCE_METHOD,
      description: `Four short phrases, four different endings: authentic (V–I, the full stop), plagal (IV–I, the soft "amen"), half (stopping on V, a comma that leaves you hanging), and deceptive (V–vi, promising home and landing somewhere darker instead).`,
      tips: [
        'Pause after each phrase and ask: did that feel finished, or suspended?',
        'The authentic cadence is the strongest — hear the leading tone pull up to the tonic.',
        'In the deceptive cadence, V behaves normally and then vi steals the landing.',
      ],
      detectionMode: 'poly' as const,
      keySignature: key,
      tempoBpm: 60,
      segments: [
        { label: 'Right hand', hand: 'R', clef: 'treble', steps: steps('R') },
        { label: 'Left hand', hand: 'L', clef: 'bass', steps: steps('L') },
      ] satisfies LessonSegment[],
    }
  })
}

interface ProgressionSpec {
  idPrefix: string
  name: string
  numerals: string[]
  keys: string[]
  description: (key: string) => string
  tips: string[]
}

const PROGRESSIONS: ProgressionSpec[] = [
  {
    idPrefix: 'prog-pop',
    name: 'The pop progression (I–V–vi–IV)',
    numerals: ['I', 'V', 'vi', 'IV', 'I', 'V', 'vi', 'IV'],
    keys: ['C', 'G', 'F'],
    description: (key) =>
      `I–V–vi–IV in ${key} — the most-used progression in modern pop, twice around. It works because it visits all three harmonic jobs (home, tension, and a minor shadow of home) before pulling back: hundreds of songs sit on exactly this loop.`,
    tips: [
      'Loop it until the changes are automatic, then sing anything over the top.',
      'vi is the relative minor — home’s sadder twin. Hear how it darkens the loop.',
      'Try starting the same four chords from vi: that’s the "sad" version of the loop.',
    ],
  },
  {
    idPrefix: 'prog-50s',
    name: 'The 50s progression (I–vi–IV–V)',
    numerals: ['I', 'vi', 'IV', 'V', 'I', 'vi', 'IV', 'V'],
    keys: ['C', 'G'],
    description: (key) =>
      `I–vi–IV–V in ${key}, twice around — the doo-wop progression behind Stand By Me, Earth Angel and countless 50s ballads. Unlike the pop loop it ends each lap on V, so it hands itself back to I with a push.`,
    tips: [
      'Each lap ends on V — feel it lean into the next downbeat.',
      'vi right after I barely changes the notes: two chords, one finger apart.',
      'Swing gently and this is instantly a 50s ballad.',
    ],
  },
]

function progressionLessons(): Lesson[] {
  return PROGRESSIONS.flatMap((spec) =>
    spec.keys.map((key) => {
      const voicings = chainVoicings(key, spec.numerals)
      return {
        id: `${spec.idPrefix}-${key}`,
        title: `${spec.name} in ${key}`,
        method: PROG_METHOD,
        description: spec.description(key),
        tips: spec.tips,
        detectionMode: 'poly' as const,
        keySignature: key,
        tempoBpm: 66,
        segments: [
          { label: 'Right hand', hand: 'R', clef: 'treble', steps: voicingSteps(voicings, 'R') },
          { label: 'Left hand', hand: 'L', clef: 'bass', steps: voicingSteps(voicings, 'L') },
        ] satisfies LessonSegment[],
      }
    })
  )
}

/** 12-bar blues: I I I I / IV IV I I / V IV I V — with plain triads. */
const BLUES_FORM = ['I', 'I', 'I', 'I', 'IV', 'IV', 'I', 'I', 'V', 'IV', 'I', 'V']

function bluesTriadLesson(): Lesson {
  const key = 'C'
  const voicings = chainVoicings(key, BLUES_FORM)
  const steps = (hand: 'R' | 'L') =>
    voicingSteps(voicings, hand).map((s, bar) => ({ ...s, label: `Bar ${bar + 1} — ${s.label}` }))
  return {
    id: 'prog-blues-triads-C',
    title: '12-bar blues in C — plain triads',
    method: PROG_METHOD,
    description:
      'The 12-bar blues form with simple triads, one chord per bar: four bars of I, two of IV, back to I, then the V–IV–I–V turnaround. Learn the map here; the jazz lessons dress the same form in seventh chords.',
    tips: [
      'Count the bars out loud — knowing where you are in the form is the skill.',
      'Bars 9–12 are the "turnaround": tension, step-down, home, and a push back to the top.',
      'When this is easy, play the jazz version with dominant 7ths and shells.',
    ],
    detectionMode: 'poly',
    keySignature: key,
    tempoBpm: 72,
    segments: [
      { label: 'Right hand', hand: 'R', clef: 'treble', steps: steps('R') },
      { label: 'Left hand', hand: 'L', clef: 'bass', steps: steps('L') },
    ] satisfies LessonSegment[],
  }
}

export function chordProgressionLessons(): Lesson[] {
  return [...cadenceTypeLessons(), ...progressionLessons(), bluesTriadLesson()]
}
