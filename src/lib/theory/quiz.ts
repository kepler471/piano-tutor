import { Note } from 'tonal'
import { getChord } from './chords'
import { getScale } from './scales'
import { CIRCLE_KEYS, RELATIVE_MINOR, SHARP_ORDER, fifthDown, fifthUp, neighborsOf, sigAccidentals } from './circle'
import {
  CHORD_QUALITY_EXPLANATIONS,
  INTERVAL_EXPLANATIONS,
  INTERVAL_LABELS,
  INTERVAL_LEVELS,
  type Rng,
} from '../ear/quiz'
import { MAJOR_DEGREES, MINOR_DEGREES, type DegreeQuality } from './progressions'
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
export const NOTE_NAMING_LEVELS: {
  clefs: ('treble' | 'bass')[]
  range: [number, number]
  accidentals: boolean
  /** Octave-precise answers ('C4' style) — trains register reading. */
  octaves?: boolean
}[] = [
  { clefs: ['treble'], range: [60, 79], accidentals: false }, // C4–G5, in-staff treble
  { clefs: ['treble', 'bass'], range: [41, 79], accidentals: false }, // adds bass F2–B3
  { clefs: ['treble', 'bass'], range: [33, 88], accidentals: false }, // ledger lines both sides
  { clefs: ['treble', 'bass'], range: [41, 79], accidentals: true }, // sharps and flats
  { clefs: ['treble', 'bass'], range: [33, 88], accidentals: true }, // ledger lines AND accidentals
  { clefs: ['treble', 'bass'], range: [36, 84], accidentals: false, octaves: true }, // which C is it?
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
  const name = Note.pitchClass(Note.fromMidi(midi))
  if (def.octaves) {
    // Octave-precise naming (naturals only): the letter is easy, the register
    // is the question. Distractors are the same letter an octave off and the
    // neighbouring letters, so guessing by letter alone doesn't work.
    const octave = Math.floor(midi / 12) - 1
    const answer = `${name}${octave}`
    const li = LETTERS.indexOf(name)
    const below = LETTERS[(li + 6) % 7]
    const above = LETTERS[(li + 1) % 7]
    const pool = [
      `${name}${octave - 1}`,
      `${name}${octave + 1}`,
      `${below}${name === 'C' ? octave - 1 : octave}`,
      `${above}${name === 'B' ? octave + 1 : octave}`,
    ]
    return {
      kind: 'note-naming',
      midi,
      clef,
      answer,
      options: makeOptions([answer, ...pool], answer, 4, rng),
      explanation: `This is ${answer}. Middle C is C4, and the octave number steps up at every new C. ${CLEF_MNEMONICS[clef]}`,
    }
  }
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
  keySignature: string
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
  /** When set, the phrase is diatonic to one of these major keys and its signature is rendered. */
  keys?: string[]
}[] = [
  { clefs: ['treble'], range: [60, 72], accidentals: false, count: 3 }, // C4–C5, in-staff treble
  { clefs: ['treble', 'bass'], range: [41, 79], accidentals: false, count: 4 }, // adds bass clef
  { clefs: ['treble', 'bass'], range: [36, 84], accidentals: false, count: 5 }, // wider, longer phrase
  { clefs: ['treble', 'bass'], range: [55, 77], accidentals: true, count: 4 }, // sharps and flats
  { clefs: ['treble', 'bass'], range: [50, 81], accidentals: true, count: 6 }, // longer chromatic phrase
  { clefs: ['treble', 'bass'], range: [55, 79], accidentals: false, count: 5, keys: ['G', 'F', 'D', 'Bb'] }, // reading in a key
]

const midiName = (midi: number) => Note.pitchClass(Note.fromMidi(midi)).replace('#', '♯').replace('b', '♭')

// Full chromatic in the same spelling makeReadMelodyQuestion produces (flats).
const CHROMATIC_NAMES = Array.from({ length: 12 }, (_, pc) => midiName(60 + pc))

const uniPc = (name: string) => name.replace('#', '♯').replace('b', '♭')

/** Stepwise random walk, biased small, staying inside the allowed set. */
function stepwiseWalk(count: number, lo: number, hi: number, allowed: (m: number) => boolean, rng: Rng): number[] {
  const pickAllowed = () => {
    let m = lo + Math.floor(rng() * (hi - lo + 1))
    while (!allowed(m)) m = lo + Math.floor(rng() * (hi - lo + 1))
    return m
  }
  const midis = [pickAllowed()]
  for (let i = 1; i < count; i++) {
    const prev = midis[i - 1]
    const next = shuffle([1, 2, -1, -2, 3, -3, 4, -4], rng)
      .map((d) => prev + d)
      .find(allowed)
    midis.push(next ?? pickAllowed())
  }
  return midis
}

export function makeReadMelodyQuestion(level: number, rng: Rng = Math.random): ReadMelodyQuestion {
  const def = READ_MELODY_LEVELS[clampLevel(level, READ_MELODY_LEVELS.length) - 1]
  const clef = pick(def.clefs, rng)
  // Keep the whole phrase on the readable side of middle C for the chosen clef.
  const [lo, hi] =
    clef === 'treble' ? [Math.max(def.range[0], 57), def.range[1]] : [def.range[0], Math.min(def.range[1], 64)]

  if (def.keys) {
    // Reading in a key: the phrase is diatonic, the signature is rendered,
    // and the notes it alters must be named with their sharps/flats even
    // though no accidental is printed — the real key-signature skill.
    const key = pick(def.keys, rng)
    const spellings = new Map(getScale(key, 'major').notes.map((n) => [Note.chroma(n)!, n]))
    const allowed = (m: number) => m >= lo && m <= hi && spellings.has(m % 12)
    const midis = stepwiseWalk(def.count, lo, hi, allowed, rng)
    const names = midis.map((m) => uniPc(spellings.get(m % 12)!))
    // 12 buttons: the key's own spellings where the scale provides one,
    // default (flat) spellings for the rest.
    const optionPool = Array.from({ length: 12 }, (_, pc) =>
      spellings.has(pc) ? uniPc(spellings.get(pc)!) : midiName(60 + pc),
    )
    return {
      kind: 'read-melody',
      clef,
      keySignature: key,
      midis,
      names,
      optionPool,
      explanation: `In ${uniPc(key)} major the key signature applies to every matching letter: ${names.join(' ')}.`,
    }
  }

  const allowed = (m: number) => m >= lo && m <= hi && (def.accidentals || NATURAL_PCS.has(m % 12))
  const midis = stepwiseWalk(def.count, lo, hi, allowed, rng)
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

const ALL_MAJOR_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db']

export type KeySignatureAsk = 'major' | 'minor' | 'either' | 'pair'

/**
 * Majors ordered by accidental count. Levels 1–3 grow the key set asked as
 * majors; level 4 asks the same signatures as relative minors; level 5 flips
 * a coin per question (major or minor); level 6 asks for the full pair.
 */
export const KEY_SIGNATURE_LEVEL_DEFS: { keys: string[]; ask: KeySignatureAsk }[] = [
  { keys: ['C', 'G', 'D', 'F', 'Bb'], ask: 'major' },
  { keys: ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab'], ask: 'major' },
  { keys: ALL_MAJOR_KEYS, ask: 'major' },
  { keys: ALL_MAJOR_KEYS, ask: 'minor' },
  { keys: ALL_MAJOR_KEYS, ask: 'either' },
  { keys: ALL_MAJOR_KEYS, ask: 'pair' },
]

/** Key sets per level (kept as a derived view for tests and callers). */
export const KEY_SIGNATURE_LEVELS: string[][] = KEY_SIGNATURE_LEVEL_DEFS.map((d) => d.keys)

export function makeKeySignatureQuestion(level: number, rng: Rng = Math.random): KeySignatureQuestion {
  const lv = clampLevel(level, KEY_SIGNATURE_LEVEL_DEFS.length)
  const def = KEY_SIGNATURE_LEVEL_DEFS[lv - 1]
  const major = pick(def.keys, rng)
  const ask = def.ask === 'either' ? (rng() < 0.5 ? 'major' : 'minor') : def.ask
  const label = (m: string) => {
    if (ask === 'pair') return `${uniPc(m)} major / ${uniPc(RELATIVE_MINOR[m])} minor`
    return ask === 'minor' ? `${uniPc(RELATIVE_MINOR[m])} minor` : `${uniPc(m)} major`
  }
  const answer = label(major)
  const majorLabel = `${uniPc(major)} major`
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
  if (ask === 'minor') {
    explanation += ` ${answer} shares this signature — the relative minor, three semitones below ${majorLabel}.`
  } else if (ask === 'pair') {
    explanation += ` ${uniPc(RELATIVE_MINOR[major])} minor shares the same signature — the relative minor, three semitones below ${majorLabel}.`
  }
  const prompt =
    ask === 'pair'
      ? 'Which major/minor pair shares this key signature?'
      : ask === 'minor'
        ? 'Which minor key has this key signature?'
        : 'Which major key has this key signature?'
  return {
    kind: 'key-signature',
    keySignature: major,
    prompt,
    answer,
    options: makeOptions(def.keys.map(label), answer, 4, rng),
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

/**
 * Enharmonic spellings at and around the six-o'clock seam, asked in both
 * directions. Each entry: [asked key, its accidentals, answer key, its
 * accidentals].
 */
export const SEAM_PAIRS: [string, string, string, string][] = [
  ['F♯', 'six sharps', 'G♭', 'six flats'],
  ['G♭', 'six flats', 'F♯', 'six sharps'],
  ['C♯', 'seven sharps', 'D♭', 'five flats'],
  ['D♭', 'five flats', 'C♯', 'seven sharps'],
  ['C♭', 'seven flats', 'B', 'five sharps'],
  ['B', 'five sharps', 'C♭', 'seven flats'],
]

const SEAM_KEY_LABELS = ['F♯ major', 'G♭ major', 'C♯ major', 'D♭ major', 'C♭ major', 'B major']

export const CIRCLE_LEVEL_COUNT = 6

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

  if (lv === 4) {
    // Circle geometry: neighbour pairs, the enharmonic seam, the added sharp.
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
      const [from, fromDesc, to, toDesc] = pick(SEAM_PAIRS, rng)
      const answer = `${to} major`
      return {
        kind: 'circle-of-fifths',
        prompt: `Near six o'clock the sharp and flat sides of the circle overlap. ${from} major is the same piano keys as…?`,
        answer,
        options: makeOptions(SEAM_KEY_LABELS, answer, 4, rng),
        explanation:
          `${from} major (${fromDesc}) and ${to} major (${toDesc}) are enharmonic — the same piano keys spelled two ways. ` +
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

  if (lv === 5) {
    // Circle distances: two steps, or straight across.
    const twoStep = rng() < 0.5
    if (twoStep) {
      const k = pick(CIRCLE_KEYS, rng)
      const up = rng() < 0.5
      const target = up ? fifthUp(fifthUp(k.major)) : fifthDown(fifthDown(k.major))
      const answer = majorLabel(target)
      return {
        kind: 'circle-of-fifths',
        prompt: `Which key is two fifths ${up ? 'up' : 'down'} from ${majorLabel(k.major)}?`,
        answer,
        options: makeOptions(allMajors, answer, 4, rng),
        explanation:
          `Two steps ${up ? 'clockwise' : 'anticlockwise'} from ${uni(k.major)} lands on ${uni(target)} — ` +
          `${up ? 'two more sharps (or two fewer flats)' : 'two more flats (or two fewer sharps)'}, and a whole step ${up ? 'up' : 'down'} in pitch.`,
      }
    }
    const k = pick(CIRCLE_KEYS, rng)
    const opposite = CIRCLE_KEYS[(k.index + 6) % 12].major
    const answer = majorLabel(opposite)
    return {
      kind: 'circle-of-fifths',
      prompt: `Which key sits directly opposite ${majorLabel(k.major)} on the circle (six steps away)?`,
      answer,
      options: makeOptions(allMajors, answer, 4, rng),
      explanation:
        `${uni(opposite)} is six fifths from ${uni(k.major)} — a tritone away, the most distant key on the circle. ` +
        'Opposite keys share almost no notes, which is why the jump sounds so alien.',
    }
  }

  // Level 6 — the inner (minor) ring.
  const variant = pick(['minor-neighbour', 'minor-count', 'minor-reverse'] as const, rng)
  const allMinors = CIRCLE_KEYS.map((c) => `${uni(c.minor)} minor`)
  if (variant === 'minor-neighbour') {
    const k = pick(CIRCLE_KEYS, rng)
    const up = rng() < 0.5
    const target = CIRCLE_KEYS[(k.index + (up ? 1 : 11)) % 12]
    const answer = `${uni(target.minor)} minor`
    return {
      kind: 'circle-of-fifths',
      prompt: `On the circle's inner ring, which minor key is one step ${up ? 'clockwise' : 'anticlockwise'} from ${uni(k.minor)} minor?`,
      answer,
      options: makeOptions(allMinors, answer, 4, rng),
      explanation:
        `The inner ring moves in fifths too: ${uni(target.minor)} minor is a fifth ${up ? 'up' : 'down'} from ${uni(k.minor)} minor, ` +
        `and it shares its signature with ${majorLabel(target.major)}.`,
    }
  }
  const k = pick(CIRCLE_KEYS.filter((c) => c.accidentals.kind !== 'none'), rng)
  const acc = k.accidentals
  const word = acc.kind === 'sharps' ? 'sharp' : 'flat'
  const n = acc.names.length
  const explanation =
    `${uni(k.minor)} minor shares its key signature with its relative major, ${majorLabel(k.major)} — ` +
    `${n} ${word}${n === 1 ? '' : 's'}: ${acc.names.join(', ')}. Minor keys have no signature of their own; they borrow.`
  if (variant === 'minor-count') {
    const answer = String(n)
    return {
      kind: 'circle-of-fifths',
      prompt: `How many ${word}s does ${uni(k.minor)} minor have?`,
      answer,
      options: makeOptions(['1', '2', '3', '4', '5', '6'], answer, 4, rng),
      explanation,
    }
  }
  const answer = `${uni(k.minor)} minor`
  return {
    kind: 'circle-of-fifths',
    prompt: `Which minor key has ${n} ${word}${n === 1 ? '' : 's'}?`,
    answer,
    options: makeOptions(allMinors, answer, 4, rng),
    explanation,
  }
}

// --- intervals on the staff (visual twin of the ear quiz) ---

export interface IntervalStaffQuestion {
  kind: 'interval-staff'
  /** Rendered ascending: sequentially, or stacked as one chord when harmonic. */
  midis: [number, number]
  clef: 'treble' | 'bass'
  /** Both notes drawn as a single stacked chord (level 6). */
  harmonic: boolean
  answer: string
  options: string[]
  explanation: string
}

/**
 * Levels 1–4 mirror the ear quiz's melodic sets on the treble staff with
 * natural bottom notes (unchanged). Level 5 adds the bass clef and accidental
 * bottom notes; level 6 stacks the two notes as one written chord.
 */
export const INTERVAL_STAFF_LEVEL_DEFS: {
  set: number[]
  clefs: ('treble' | 'bass')[]
  harmonic: boolean
  naturalBottom: boolean
}[] = [
  { set: INTERVAL_LEVELS[0], clefs: ['treble'], harmonic: false, naturalBottom: true },
  { set: INTERVAL_LEVELS[1], clefs: ['treble'], harmonic: false, naturalBottom: true },
  { set: INTERVAL_LEVELS[2], clefs: ['treble'], harmonic: false, naturalBottom: true },
  { set: INTERVAL_LEVELS[3], clefs: ['treble'], harmonic: false, naturalBottom: true },
  { set: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], clefs: ['treble', 'bass'], harmonic: false, naturalBottom: false },
  { set: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], clefs: ['treble', 'bass'], harmonic: true, naturalBottom: false },
]

export function makeIntervalStaffQuestion(level: number, rng: Rng = Math.random): IntervalStaffQuestion {
  const def = INTERVAL_STAFF_LEVEL_DEFS[clampLevel(level, INTERVAL_STAFF_LEVEL_DEFS.length) - 1]
  const semitones = pick(def.set, rng)
  const clef = def.clefs.length === 1 ? def.clefs[0] : pick(def.clefs, rng)
  // Keep the bottom note inside the chosen staff.
  const lo = clef === 'treble' ? 60 : 43
  let root = lo + Math.floor(rng() * 13)
  if (def.naturalBottom) {
    while (!NATURAL_PCS.has(root % 12)) root = lo + Math.floor(rng() * 13)
  }
  const answer = INTERVAL_LABELS[semitones]
  return {
    kind: 'interval-staff',
    midis: [root, root + semitones],
    clef,
    harmonic: def.harmonic,
    answer,
    options: makeOptions(def.set.map((s) => INTERVAL_LABELS[s]), answer, 4, rng),
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

const SPELLING_ROOTS = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb']

/** All twelve conventional major-key roots (F♯ over G♭, D♭ over C♯). */
const ALL_SPELLING_ROOTS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F']

/**
 * Levels 1–3 unchanged. Level 4 adds the colour chords (half-diminished,
 * major 6th) on the familiar roots; level 5 keeps the common qualities but
 * spans all twelve roots. 'diminished 7th' is deliberately absent — its
 * double-flat 7th can't be spelled without 𝄫.
 */
export const CHORD_SPELLING_LEVEL_DEFS: { qualities: ChordQualityId[]; roots: string[] }[] = [
  { qualities: ['major', 'minor'], roots: SPELLING_ROOTS },
  { qualities: ['major', 'minor', 'diminished', 'augmented'], roots: SPELLING_ROOTS },
  { qualities: ['major', 'minor', 'dominant 7th', 'major 7th', 'minor 7th'], roots: SPELLING_ROOTS },
  {
    qualities: [
      'major',
      'minor',
      'diminished',
      'augmented',
      'dominant 7th',
      'major 7th',
      'minor 7th',
      'half-diminished',
      'major 6th',
    ],
    roots: SPELLING_ROOTS,
  },
  { qualities: ['major', 'minor', 'dominant 7th', 'major 7th', 'minor 7th'], roots: ALL_SPELLING_ROOTS },
]

/** Quality sets per level (kept as a derived view for tests and callers). */
export const CHORD_SPELLING_LEVELS: ChordQualityId[][] = CHORD_SPELLING_LEVEL_DEFS.map((d) => d.qualities)

const spellChord = (root: string, quality: ChordQualityId): string =>
  getChord(root, quality, 0)
    .noteNames.map((n) => Note.pitchClass(n).replace('#', '♯').replace('b', '♭'))
    .join(' – ')

/** tonal spells a few extreme combinations with 𝄫/𝄪 (e.g. E♭dim's B𝄫) — never show those. */
const hasDoubleAccidental = (root: string, quality: ChordQualityId): boolean =>
  getChord(root, quality, 0).noteNames.some((n) => n.includes('bb') || n.includes('##'))

export function makeChordSpellingQuestion(level: number, rng: Rng = Math.random): ChordSpellingQuestion {
  const def = CHORD_SPELLING_LEVEL_DEFS[clampLevel(level, CHORD_SPELLING_LEVEL_DEFS.length) - 1]
  let quality = pick(def.qualities, rng)
  let root = pick(def.roots, rng)
  while (hasDoubleAccidental(root, quality)) {
    quality = pick(def.qualities, rng)
    root = pick(def.roots, rng)
  }
  const chord = getChord(root, quality, 0)
  const answer = spellChord(root, quality)
  // Distractors: same root, different qualities — the confusable spellings.
  const pool = def.qualities.filter((q) => !hasDoubleAccidental(root, q)).map((q) => spellChord(root, q))
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

// Degree tables live in progressions.ts, shared with the chord-path lesson generators.

const MAJOR_FUNCTION_KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb']
const MINOR_FUNCTION_KEYS = ['A', 'E', 'D', 'G', 'C', 'B']

interface ChordFunctionVariant {
  mode: 'major' | 'minor'
  keys: string[]
  numerals: string[]
}

/**
 * Levels 1–3 unchanged (major keys, the classic five degrees, primary-only in
 * easy keys at level 1). Level 4 adds iii and vii°; level 5 moves to minor
 * keys with a starter set; level 6 mixes both modes with all seven degrees.
 */
export const CHORD_FUNCTION_LEVEL_DEFS: { variants: ChordFunctionVariant[] }[] = [
  { variants: [{ mode: 'major', keys: ['C', 'G', 'F'], numerals: ['I', 'IV', 'V'] }] },
  { variants: [{ mode: 'major', keys: ['C', 'G', 'D', 'F', 'Bb', 'A'], numerals: ['I', 'ii', 'IV', 'V', 'vi'] }] },
  { variants: [{ mode: 'major', keys: MAJOR_FUNCTION_KEYS, numerals: ['I', 'ii', 'IV', 'V', 'vi'] }] },
  { variants: [{ mode: 'major', keys: MAJOR_FUNCTION_KEYS, numerals: MAJOR_DEGREES.map(([n]) => n) }] },
  { variants: [{ mode: 'minor', keys: MINOR_FUNCTION_KEYS, numerals: ['i', 'iv', 'V', 'VI'] }] },
  {
    variants: [
      { mode: 'major', keys: MAJOR_FUNCTION_KEYS, numerals: MAJOR_DEGREES.map(([n]) => n) },
      { mode: 'minor', keys: MINOR_FUNCTION_KEYS, numerals: MINOR_DEGREES.map(([n]) => n) },
    ],
  },
]

export const CHORD_FUNCTION_LEVEL_COUNT = CHORD_FUNCTION_LEVEL_DEFS.length

export function makeChordFunctionQuestion(level: number, rng: Rng = Math.random): ChordFunctionQuestion {
  const def = CHORD_FUNCTION_LEVEL_DEFS[clampLevel(level, CHORD_FUNCTION_LEVEL_DEFS.length) - 1]
  const variant = def.variants.length === 1 ? def.variants[0] : pick(def.variants, rng)
  const key = pick(variant.keys, rng)
  const table = variant.mode === 'major' ? MAJOR_DEGREES : MINOR_DEGREES
  const degrees = table.filter(([n]) => variant.numerals.includes(n))
  const [numeral, interval, quality] = pick(degrees, rng)
  // Transpose by interval (not semitones) so spellings stay diatonic (Bb major → Eb for IV, not D#).
  const chordName = (iv: string, q: DegreeQuality) => `${Note.pitchClass(Note.transpose(key, iv))} ${q}`
  const answer = chordName(interval, quality)
  const pool = degrees.map(([, iv, q]) => chordName(iv, q))
  const degreeNumber = Number(interval[0])
  const rootName = Note.pitchClass(Note.transpose(key, interval))
  let qualityNote = 'Upper-case numerals are major chords, lower-case are minor.'
  if (quality === 'diminished') {
    qualityNote = 'The ° marks a diminished triad — minor, with the fifth lowered too.'
  } else if (variant.mode === 'minor' && numeral === 'V') {
    qualityNote = 'V stays major even in minor keys — the raised leading tone (harmonic minor) keeps its pull home.'
  }
  return {
    kind: 'chord-function',
    prompt: `In the key of ${key} ${variant.mode}, which chord is ${numeral}?`,
    answer,
    options: makeOptions(pool, answer, 4, rng),
    explanation:
      `${numeral} means "the triad built on scale degree ${degreeNumber}" — in ${key} ${variant.mode} that root is ${rootName}. ` +
      qualityNote,
  }
}
