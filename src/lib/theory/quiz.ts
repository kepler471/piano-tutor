import { Note } from 'tonal'
import { getChord } from './chords'
import { CIRCLE_KEYS, RELATIVE_MINOR, SHARP_ORDER, fifthDown, fifthUp, neighborsOf, sigAccidentals } from './circle'
import {
  CHORD_QUALITY_EXPLANATIONS,
  INTERVAL_EXPLANATIONS,
  INTERVAL_LABELS,
  INTERVAL_LEVELS,
  type Rng,
} from '../ear/quiz'
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
  /** Why: shown after the reveal so a wrong answer still teaches. */
  explanation: string
}

const CLEF_MNEMONICS: Record<'treble' | 'bass', string> = {
  treble:
    'Treble staff, bottom to top: the lines are E-G-B-D-F ("Every Good Boy Does Fine") and the spaces spell F-A-C-E.',
  bass: 'Bass staff, bottom to top: the lines are G-B-D-F-A ("Good Boys Do Fine Always") and the spaces are A-C-E-G ("All Cows Eat Grass").',
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
  return {
    kind: 'note-naming',
    midi,
    clef,
    answer,
    options: makeOptions(pool, answer, 4, rng),
    explanation: `This is ${answer}. ${CLEF_MNEMONICS[clef]}`,
  }
}

// --- reading a melody (multi-note sight-reading by name) ---

export interface ReadMelodyQuestion {
  kind: 'read-melody'
  clef: 'treble' | 'bass'
  keySignature: 'C'
  /** Pitches of the phrase, left to right. */
  midis: number[]
  /** Display note name (Unicode accidentals) per midi. */
  names: string[]
  /** Letter buttons offered for every note in the phrase. */
  optionPool: string[]
  /** Why: shown once the whole phrase has been named. */
  explanation: string
}

/** [clefs, midi range, accidentals allowed, note count] per level. */
export const READ_MELODY_LEVELS: {
  clefs: ('treble' | 'bass')[]
  range: [number, number]
  accidentals: boolean
  count: number
}[] = [
  { clefs: ['treble'], range: [60, 72], accidentals: false, count: 3 }, // C4–C5, in-staff treble
  { clefs: ['treble', 'bass'], range: [41, 79], accidentals: false, count: 4 }, // adds bass clef
  { clefs: ['treble', 'bass'], range: [36, 84], accidentals: false, count: 5 }, // wider, longer phrase
  { clefs: ['treble', 'bass'], range: [55, 77], accidentals: true, count: 4 }, // sharps and flats
]

const midiName = (midi: number) => Note.pitchClass(Note.fromMidi(midi)).replace('#', '♯').replace('b', '♭')

// Full chromatic in the same spelling makeReadMelodyQuestion produces (flats).
const CHROMATIC_NAMES = Array.from({ length: 12 }, (_, pc) => midiName(60 + pc))

export function makeReadMelodyQuestion(level: number, rng: Rng = Math.random): ReadMelodyQuestion {
  const def = READ_MELODY_LEVELS[clampLevel(level, READ_MELODY_LEVELS.length) - 1]
  const clef = pick(def.clefs, rng)
  // Keep the whole phrase on the readable side of middle C for the chosen clef.
  const [lo, hi] =
    clef === 'treble' ? [Math.max(def.range[0], 57), def.range[1]] : [def.range[0], Math.min(def.range[1], 64)]

  const allowed = (m: number) => m >= lo && m <= hi && (def.accidentals || NATURAL_PCS.has(m % 12))
  const pickAllowed = () => {
    let m = lo + Math.floor(rng() * (hi - lo + 1))
    while (!allowed(m)) m = lo + Math.floor(rng() * (hi - lo + 1))
    return m
  }

  // Stepwise random walk, biased small, staying inside the readable range.
  const midis = [pickAllowed()]
  for (let i = 1; i < def.count; i++) {
    const prev = midis[i - 1]
    const next = shuffle([1, 2, -1, -2, 3, -3, 4, -4], rng)
      .map((d) => prev + d)
      .find(allowed)
    midis.push(next ?? pickAllowed())
  }

  const names = midis.map(midiName)
  return {
    kind: 'read-melody',
    clef,
    keySignature: 'C',
    midis,
    names,
    optionPool: def.accidentals ? CHROMATIC_NAMES : LETTERS,
    explanation: `Reading the notes left to right: ${names.join(' ')}. Name each one as the cursor reaches it.`,
  }
}

// --- key signature identification ---

export interface KeySignatureQuestion {
  kind: 'key-signature'
  /** VexFlow key signature spec to render, e.g. 'D', 'Bb'. */
  keySignature: string
  prompt: string
  answer: string
  options: string[]
  explanation: string
}

export { sigAccidentals } from './circle'

/** Majors ordered by accidental count; minors mirror them at level 4. */
export const KEY_SIGNATURE_LEVELS: string[][] = [
  ['C', 'G', 'D', 'F', 'Bb'],
  ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab'],
  ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db'],
  ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db'], // asked as minors
]

export function makeKeySignatureQuestion(level: number, rng: Rng = Math.random): KeySignatureQuestion {
  const lv = clampLevel(level, KEY_SIGNATURE_LEVELS.length)
  const set = KEY_SIGNATURE_LEVELS[lv - 1]
  const major = pick(set, rng)
  const asMinor = lv === 4
  const label = (m: string) =>
    (asMinor ? `${RELATIVE_MINOR[m]} minor` : `${m} major`).replace('#', '♯').replace('b', '♭')
  const answer = label(major)
  const majorLabel = `${major} major`.replace('#', '♯').replace('b', '♭')
  const acc = sigAccidentals(major)
  let explanation: string
  if (acc.kind === 'none') {
    explanation = `${majorLabel} has no sharps or flats — all white keys.`
  } else if (acc.kind === 'sharps') {
    explanation =
      `${majorLabel} has ${acc.names.length} sharp${acc.names.length === 1 ? '' : 's'}: ${acc.names.join(', ')}. ` +
      'Tip: the last sharp sits one semitone below the key name.'
  } else {
    explanation =
      `${majorLabel} has ${acc.names.length} flat${acc.names.length === 1 ? '' : 's'}: ${acc.names.join(', ')}. ` +
      (acc.names.length === 1
        ? 'F major\'s single flat is the one to memorize.'
        : 'Tip: the second-to-last flat names the key.')
  }
  if (asMinor) {
    explanation += ` ${answer} shares this signature — the relative minor, three semitones below ${majorLabel}.`
  }
  return {
    kind: 'key-signature',
    keySignature: major,
    prompt: asMinor ? 'Which minor key has this key signature?' : 'Which major key has this key signature?',
    answer,
    options: makeOptions(set.map(label), answer, 4, rng),
    explanation,
  }
}

// --- the circle of fifths ---

export interface CircleQuestion {
  kind: 'circle-of-fifths'
  prompt: string
  /** Set when the staff should render the signature under discussion (relative-minor level). */
  keySignature?: string
  answer: string
  options: string[]
  explanation: string
}

const uni = (name: string) => name.replace('#', '♯').replace('b', '♭')
const majorLabel = (root: string) => `${uni(root)} major`

/** Prompt keys for the neighbours level — nothing past three accidentals. */
const EASY_CIRCLE_KEYS = ['C', 'G', 'D', 'A', 'F', 'Bb', 'Eb']

export const CIRCLE_LEVEL_COUNT = 4

export function makeCircleQuestion(level: number, rng: Rng = Math.random): CircleQuestion {
  const lv = clampLevel(level, CIRCLE_LEVEL_COUNT)
  const allMajors = CIRCLE_KEYS.map((k) => majorLabel(k.major))

  if (lv === 1) {
    // Neighbours: one step clockwise or anticlockwise.
    const key = pick(EASY_CIRCLE_KEYS, rng)
    const up = rng() < 0.5
    const target = up ? fifthUp(key) : fifthDown(key)
    const answer = majorLabel(target)
    return {
      kind: 'circle-of-fifths',
      prompt: `On the circle of fifths, which key is a fifth ${up ? 'up' : 'down'} from ${majorLabel(key)}?`,
      answer,
      options: makeOptions(allMajors, answer, 4, rng),
      explanation:
        `A fifth ${up ? 'up' : 'down'} from ${uni(key)} is ${uni(target)} — one step ${up ? 'clockwise, adding one sharp (or dropping one flat)' : 'anticlockwise, adding one flat (or dropping one sharp)'}. ` +
        'Neighbouring keys share six of their seven notes.',
    }
  }

  if (lv === 2) {
    // Accidental counts, asked in both directions.
    const k = pick(CIRCLE_KEYS.filter((c) => c.accidentals.kind !== 'none'), rng)
    const acc = k.accidentals
    const word = acc.kind === 'sharps' ? 'sharp' : 'flat'
    const n = acc.names.length
    const explanation =
      `${majorLabel(k.major)} has ${n} ${word}${n === 1 ? '' : 's'}: ${acc.names.join(', ')}. ` +
      (acc.kind === 'sharps'
        ? 'Sharps always arrive in the fixed order F–C–G–D–A–E–B, and the last sharp sits one semitone below the key name.'
        : 'Flats arrive in the mirror order B–E–A–D–G–C–F, and the second-to-last flat names the key.')
    if (rng() < 0.5) {
      const answer = String(n)
      return {
        kind: 'circle-of-fifths',
        prompt: `How many ${word}s does ${majorLabel(k.major)} have?`,
        answer,
        options: makeOptions(['1', '2', '3', '4', '5', '6'], answer, 4, rng),
        explanation,
      }
    }
    const answer = majorLabel(k.major)
    return {
      kind: 'circle-of-fifths',
      prompt: `Which major key has ${n} ${word}${n === 1 ? '' : 's'}?`,
      answer,
      options: makeOptions(allMajors, answer, 4, rng),
      explanation,
    }
  }

  if (lv === 3) {
    // Relative minors (the inner ring), with the signature on the staff.
    const k = pick(CIRCLE_KEYS, rng)
    const toMinor = rng() < 0.5
    const minorName = `${uni(k.minor)} minor`
    const explanation =
      `${minorName} is the relative minor of ${majorLabel(k.major)} — the same key signature, with its tonic three semitones below. ` +
      'On the circle it sits directly inside its major, on the inner ring.'
    if (toMinor) {
      return {
        kind: 'circle-of-fifths',
        prompt: `Which minor key shares this key signature with ${majorLabel(k.major)}?`,
        keySignature: k.major,
        answer: minorName,
        options: makeOptions(CIRCLE_KEYS.map((c) => `${uni(c.minor)} minor`), minorName, 4, rng),
        explanation,
      }
    }
    const answer = majorLabel(k.major)
    return {
      kind: 'circle-of-fifths',
      prompt: `${minorName} is the relative minor of which major key?`,
      keySignature: k.major,
      answer,
      options: makeOptions(allMajors, answer, 4, rng),
      explanation,
    }
  }

  // Level 4 — circle geometry: neighbour pairs, the enharmonic seam, the added sharp.
  const variant = pick(['neighbours', 'seam', 'added-sharp'] as const, rng)
  if (variant === 'neighbours') {
    const k = pick(CIRCLE_KEYS, rng)
    const [down, up] = neighborsOf(k.major)
    const pairLabel = (a: string, b: string) => `${uni(a)} and ${uni(b)}`
    const answer = pairLabel(down, up)
    const pool = CIRCLE_KEYS.map((c) => pairLabel(...neighborsOf(c.major)))
    return {
      kind: 'circle-of-fifths',
      prompt: `Which two keys sit either side of ${majorLabel(k.major)} on the circle?`,
      answer,
      options: makeOptions(pool, answer, 4, rng),
      explanation:
        `${uni(down)} and ${uni(up)} are ${uni(k.major)}'s neighbours — each shares six of its seven notes. ` +
        'That overlap is why music most often modulates one step around the circle.',
    }
  }
  if (variant === 'seam') {
    const answer = 'G♭ major'
    return {
      kind: 'circle-of-fifths',
      prompt: 'At six o\'clock the sharp and flat sides of the circle meet. F♯ major is the same key as…?',
      answer,
      options: makeOptions(['G♭ major', 'E♯ major', 'G major', 'F major', 'D♭ major'], answer, 4, rng),
      explanation:
        'F♯ major (six sharps) and G♭ major (six flats) are enharmonic — the same piano keys spelled two ways. ' +
        'Composers pick whichever spelling is easier to read.',
    }
  }
  // added-sharp: set difference between adjacent signatures on the sharp side.
  const k = pick(CIRCLE_KEYS.filter((c) => c.index < 6), rng)
  const next = fifthUp(k.major)
  const here = new Set(sigAccidentals(k.major).names)
  const answer = sigAccidentals(next).names.find((n) => !here.has(n))!
  return {
    kind: 'circle-of-fifths',
    prompt: `Going clockwise from ${majorLabel(k.major)} to ${majorLabel(next)}, which sharp is added?`,
    answer,
    options: makeOptions(SHARP_ORDER, answer, 4, rng),
    explanation:
      `Each clockwise step keeps every accidental and adds the next sharp in the fixed order F–C–G–D–A–E–B. ` +
      `${majorLabel(next)} takes everything from ${majorLabel(k.major)} and adds ${answer}.`,
  }
}

// --- intervals on the staff (visual twin of the ear quiz) ---

export interface IntervalStaffQuestion {
  kind: 'interval-staff'
  /** Rendered as two sequential notes, always ascending for readability. */
  midis: [number, number]
  answer: string
  options: string[]
  explanation: string
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
    explanation: `On the staff, count letter names from the bottom note up, inclusive — line-space-line — to get the number. ${INTERVAL_EXPLANATIONS[semitones]}`,
  }
}

// --- chord spelling ---

export interface ChordSpellingQuestion {
  kind: 'chord-spelling'
  symbol: string
  prompt: string
  answer: string
  options: string[]
  explanation: string
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
    explanation: `${chord.symbol} = ${answer}. ${CHORD_QUALITY_EXPLANATIONS[quality]}`,
  }
}

// --- chord function (diatonic harmony, text only) ---

export interface ChordFunctionQuestion {
  kind: 'chord-function'
  prompt: string
  answer: string
  options: string[]
  explanation: string
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
  const degreeNumber = { 0: 1, 2: 2, 5: 4, 7: 5, 9: 6 }[semis]
  const rootName = Note.pitchClass(Note.transpose(key, intervalName(semis)))
  return {
    kind: 'chord-function',
    prompt: `In the key of ${key} major, which chord is ${numeral}?`,
    answer,
    options: makeOptions(pool, answer, 4, rng),
    explanation:
      `${numeral} means "the triad built on scale degree ${degreeNumber}" — in ${key} major that root is ${rootName}. ` +
      'Upper-case numerals are major chords, lower-case are minor.',
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
