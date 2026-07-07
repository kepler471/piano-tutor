import { Note } from 'tonal'
import { getChord } from './chords'
import { INTERVAL_LABELS, INTERVAL_LEVELS, type Rng } from '../ear/quiz'
import type { ChordQualityId } from './types'

/**
 * Reading & theory question generators — the visual/text twins of the ear
 * quizzes. Pure logic (injectable RNG, no DOM); the quiz screen renders
 * staff-based stimuli with SheetMusic and plays nothing.
 */

const clampLevel = (level: number, max: number) => Math.max(1, Math.min(max, Math.floor(level)))

function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)]
}

function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function makeOptions(all: string[], answer: string, max: number, rng: Rng): string[] {
  const distractors = shuffle([...new Set(all.filter((o) => o !== answer))], rng).slice(0, max - 1)
  return shuffle([answer, ...distractors], rng)
}

// --- note naming on the staff ---

export interface NoteNamingQuestion {
  kind: 'note-naming'
  midi: number
  clef: 'treble' | 'bass'
  answer: string
  options: string[]
}

/** [clef, low midi, high midi, accidentals allowed] per level. */
export const NOTE_NAMING_LEVELS: { clefs: ('treble' | 'bass')[]; range: [number, number]; accidentals: boolean }[] = [
  { clefs: ['treble'], range: [60, 79], accidentals: false }, // C4–G5, in-staff treble
  { clefs: ['treble', 'bass'], range: [41, 79], accidentals: false }, // adds bass F2–B3
  { clefs: ['treble', 'bass'], range: [33, 88], accidentals: false }, // ledger lines both sides
  { clefs: ['treble', 'bass'], range: [41, 79], accidentals: true }, // sharps and flats
]

const NATURAL_PCS = new Set([0, 2, 4, 5, 7, 9, 11])
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

export function makeNoteNamingQuestion(level: number, rng: Rng = Math.random): NoteNamingQuestion {
  const def = NOTE_NAMING_LEVELS[clampLevel(level, NOTE_NAMING_LEVELS.length) - 1]
  const clef = pick(def.clefs, rng)
  // Keep the note on the right side of middle C for the chosen clef.
  const [lo, hi] = clef === 'treble' ? [Math.max(def.range[0], 57), def.range[1]] : [def.range[0], Math.min(def.range[1], 64)]
  let midi = lo + Math.floor(rng() * (hi - lo + 1))
  if (!def.accidentals) {
    while (!NATURAL_PCS.has(midi % 12)) midi = lo + Math.floor(rng() * (hi - lo + 1))
  }
  const name = Note.pitchClass(Note.fromMidi(midi)) // sharp spelling by default
  const answer = name.replace('#', '♯').replace('b', '♭')
  const pool = def.accidentals
    ? [answer, ...LETTERS.flatMap((l) => [l, `${l}♯`, `${l}♭`])]
    : LETTERS
  return { kind: 'note-naming', midi, clef, answer, options: makeOptions(pool, answer, 4, rng) }
}

// --- key signature identification ---

export interface KeySignatureQuestion {
  kind: 'key-signature'
  /** VexFlow key signature spec to render, e.g. 'D', 'Bb'. */
  keySignature: string
  prompt: string
  answer: string
  options: string[]
}

/** Majors ordered by accidental count; minors mirror them at level 4. */
export const KEY_SIGNATURE_LEVELS: string[][] = [
  ['C', 'G', 'D', 'F', 'Bb'],
  ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab'],
  ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db'],
  ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db'], // asked as minors
]

const RELATIVE_MINOR: Record<string, string> = {
  C: 'A', G: 'E', D: 'B', A: 'F#', E: 'C#', B: 'G#', 'F#': 'D#',
  F: 'D', Bb: 'G', Eb: 'C', Ab: 'F', Db: 'Bb',
}

export function makeKeySignatureQuestion(level: number, rng: Rng = Math.random): KeySignatureQuestion {
  const lv = clampLevel(level, KEY_SIGNATURE_LEVELS.length)
  const set = KEY_SIGNATURE_LEVELS[lv - 1]
  const major = pick(set, rng)
  const asMinor = lv === 4
  const label = (m: string) =>
    (asMinor ? `${RELATIVE_MINOR[m]} minor` : `${m} major`).replace('#', '♯').replace('b', '♭')
  const answer = label(major)
  return {
    kind: 'key-signature',
    keySignature: major,
    prompt: asMinor ? 'Which minor key has this key signature?' : 'Which major key has this key signature?',
    answer,
    options: makeOptions(set.map(label), answer, 4, rng),
  }
}

// --- intervals on the staff (visual twin of the ear quiz) ---

export interface IntervalStaffQuestion {
  kind: 'interval-staff'
  /** Rendered as two sequential notes, always ascending for readability. */
  midis: [number, number]
  answer: string
  options: string[]
}

export function makeIntervalStaffQuestion(level: number, rng: Rng = Math.random): IntervalStaffQuestion {
  const set = INTERVAL_LEVELS[clampLevel(level, INTERVAL_LEVELS.length) - 1]
  const semitones = pick(set, rng)
  // Stay in the treble staff and prefer natural bottom notes so the interval
  // reads cleanly.
  let root = 60 + Math.floor(rng() * 13)
  while (!NATURAL_PCS.has(root % 12)) root = 60 + Math.floor(rng() * 13)
  const answer = INTERVAL_LABELS[semitones]
  return {
    kind: 'interval-staff',
    midis: [root, root + semitones],
    answer,
    options: makeOptions(set.map((s) => INTERVAL_LABELS[s]), answer, 4, rng),
  }
}

// --- chord spelling ---

export interface ChordSpellingQuestion {
  kind: 'chord-spelling'
  symbol: string
  prompt: string
  answer: string
  options: string[]
}

export const CHORD_SPELLING_LEVELS: ChordQualityId[][] = [
  ['major', 'minor'],
  ['major', 'minor', 'diminished', 'augmented'],
  ['major', 'minor', 'dominant 7th', 'major 7th', 'minor 7th'],
]

const SPELLING_ROOTS = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb']

const spellChord = (root: string, quality: ChordQualityId): string =>
  getChord(root, quality, 0)
    .noteNames.map((n) => Note.pitchClass(n).replace('#', '♯').replace('b', '♭'))
    .join(' – ')

export function makeChordSpellingQuestion(level: number, rng: Rng = Math.random): ChordSpellingQuestion {
  const set = CHORD_SPELLING_LEVELS[clampLevel(level, CHORD_SPELLING_LEVELS.length) - 1]
  const quality = pick(set, rng)
  const root = pick(SPELLING_ROOTS, rng)
  const chord = getChord(root, quality, 0)
  const answer = spellChord(root, quality)
  // Distractors: same root, different qualities — the confusable spellings.
  const pool = set.map((q) => spellChord(root, q))
  return {
    kind: 'chord-spelling',
    symbol: chord.symbol,
    prompt: `Which notes spell ${chord.symbol}?`,
    answer,
    options: makeOptions(pool, answer, 4, rng),
  }
}

// --- chord function (diatonic harmony, text only) ---

export interface ChordFunctionQuestion {
  kind: 'chord-function'
  prompt: string
  answer: string
  options: string[]
}

const FUNCTION_KEYS_BY_LEVEL: string[][] = [
  ['C', 'G', 'F'],
  ['C', 'G', 'D', 'F', 'Bb', 'A'],
  ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb'],
]

/** Diatonic triads asked about, as [roman numeral, scale degree, quality]. */
const DEGREES: [string, number, 'major' | 'minor'][] = [
  ['I', 0, 'major'],
  ['ii', 2, 'minor'],
  ['IV', 5, 'major'],
  ['V', 7, 'major'],
  ['vi', 9, 'minor'],
]

export const CHORD_FUNCTION_LEVEL_COUNT = FUNCTION_KEYS_BY_LEVEL.length

export function makeChordFunctionQuestion(level: number, rng: Rng = Math.random): ChordFunctionQuestion {
  const lv = clampLevel(level, FUNCTION_KEYS_BY_LEVEL.length)
  const keys = FUNCTION_KEYS_BY_LEVEL[lv - 1]
  const key = pick(keys, rng)
  const degrees = lv === 1 ? DEGREES.filter(([n]) => ['I', 'IV', 'V'].includes(n)) : DEGREES
  const [numeral, semis, quality] = pick(degrees, rng)
  // Transpose by interval (not semitones) so spellings stay diatonic (Bb major → Eb for IV, not D#).
  const chordName = (s: number, q: 'major' | 'minor') =>
    `${Note.pitchClass(Note.transpose(key, intervalName(s)))} ${q}`
  const answer = chordName(semis, quality)
  const pool = degrees.map(([, s, q]) => chordName(s, q))
  return {
    kind: 'chord-function',
    prompt: `In the key of ${key} major, which chord is ${numeral}?`,
    answer,
    options: makeOptions(pool, answer, 4, rng),
  }
}

/** Semitone offset → tonal interval name for diatonic degrees used above. */
function intervalName(semitones: number): string {
  switch (semitones) {
    case 0: return '1P'
    case 2: return '2M'
    case 5: return '4P'
    case 7: return '5P'
    case 9: return '6M'
    default: return '1P'
  }
}
