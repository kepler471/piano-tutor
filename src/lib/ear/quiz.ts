import { getChord } from '../theory/chords'
import { getScale } from '../theory/scales'
import type { ChordQualityId, ScaleTypeId } from '../theory/types'

/**
 * Ear-training question generators. Pure logic — an injectable RNG keeps
 * tests deterministic; the screens play the midis and check the answer.
 */
export type Rng = () => number

export interface IntervalQuestion {
  kind: 'interval'
  /** Played in order (second note above or below the first). */
  midis: [number, number]
  answer: string
  options: string[]
}

export interface ChordQuestion {
  kind: 'chord'
  midis: number[]
  answer: string
  options: string[]
}

export interface EchoQuestion {
  kind: 'echo'
  /** Phrase to play back; always starts on the position's root. */
  midis: number[]
  positionLabel: string
}

export const INTERVAL_LABELS: Record<number, string> = {
  0: 'Unison',
  1: 'Minor 2nd',
  2: 'Major 2nd',
  3: 'Minor 3rd',
  4: 'Major 3rd',
  5: 'Perfect 4th',
  6: 'Tritone',
  7: 'Perfect 5th',
  8: 'Minor 6th',
  9: 'Major 6th',
  10: 'Minor 7th',
  11: 'Major 7th',
  12: 'Octave',
}

/** Semitone sets per level — wider and more confusable as levels rise. */
export const INTERVAL_LEVELS: number[][] = [
  [0, 2, 4, 7, 12],
  [0, 1, 2, 3, 4, 5, 7, 12],
  [0, 1, 2, 3, 4, 5, 7, 8, 9, 12],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
]

export const CHORD_LEVELS: ChordQualityId[][] = [
  ['major', 'minor'],
  ['major', 'minor', 'diminished', 'augmented'],
  ['major', 'minor', 'diminished', 'augmented', 'dominant 7th', 'major 7th', 'minor 7th'],
  [
    'major',
    'minor',
    'diminished',
    'augmented',
    'dominant 7th',
    'major 7th',
    'minor 7th',
    'half-diminished',
    'diminished 7th',
    'major 6th',
  ],
]

const CHORD_LABELS: Record<ChordQualityId, string> = {
  major: 'Major',
  minor: 'Minor',
  diminished: 'Diminished',
  augmented: 'Augmented',
  'dominant 7th': 'Dominant 7th',
  'major 7th': 'Major 7th',
  'minor 7th': 'Minor 7th',
  'half-diminished': 'Half-diminished (m7♭5)',
  'diminished 7th': 'Diminished 7th',
  'major 6th': 'Major 6th',
}

/** Five-finger positions for echo phrases: label → root midi. */
export const ECHO_POSITIONS: Record<string, number> = {
  'C position': 60,
  'G position': 55,
  'F position': 65,
  'D position': 62,
}

export const ECHO_LEVELS: { positions: string[]; minLen: number; maxLen: number }[] = [
  { positions: ['C position'], minLen: 3, maxLen: 4 },
  { positions: ['C position', 'G position', 'F position'], minLen: 4, maxLen: 5 },
  { positions: ['C position', 'G position', 'F position', 'D position'], minLen: 5, maxLen: 6 },
]

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

/** Up to `max` answer options: the correct one plus distractors from the level's set. */
function makeOptions(all: string[], answer: string, max: number, rng: Rng): string[] {
  const distractors = shuffle(
    all.filter((o) => o !== answer),
    rng,
  ).slice(0, max - 1)
  return shuffle([answer, ...distractors], rng)
}

export function makeIntervalQuestion(level: number, rng: Rng = Math.random): IntervalQuestion {
  const set = INTERVAL_LEVELS[clampLevel(level, INTERVAL_LEVELS.length) - 1]
  const semitones = pick(set, rng)
  const up = semitones === 0 || rng() < 0.5
  // Root somewhere around middle C so both directions stay in comfortable range.
  const root = 55 + Math.floor(rng() * 13)
  const midis: [number, number] = [root, up ? root + semitones : root - semitones]
  const answer = INTERVAL_LABELS[semitones]
  return { kind: 'interval', midis, answer, options: makeOptions(set.map((s) => INTERVAL_LABELS[s]), answer, 4, rng) }
}

const QUIZ_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

export function makeChordQuestion(level: number, rng: Rng = Math.random): ChordQuestion {
  const set = CHORD_LEVELS[clampLevel(level, CHORD_LEVELS.length) - 1]
  const quality = pick(set, rng)
  const root = pick(QUIZ_ROOTS, rng)
  const answer = CHORD_LABELS[quality]
  return {
    kind: 'chord',
    midis: getChord(root, quality, 0).midi,
    answer,
    options: makeOptions(set.map((q) => CHORD_LABELS[q]), answer, 4, rng),
  }
}

/** Five-finger scale degrees above the root (major pentascale). */
const POSITION_OFFSETS = [0, 2, 4, 5, 7]

// --- scale-type identification ---

export interface ScaleTypeQuestion {
  kind: 'scale-type'
  /** Scale played ascending. */
  midis: number[]
  answer: string
  options: string[]
}

const SCALE_TYPE_LABELS: Record<ScaleTypeId, string> = {
  major: 'Major',
  'natural minor': 'Natural minor',
  'harmonic minor': 'Harmonic minor',
  blues: 'Blues',
  'major pentatonic': 'Major pentatonic',
  dorian: 'Dorian',
  mixolydian: 'Mixolydian',
}

/** Roots every scale type supports (kept to low-accidental keys the library covers). */
const SCALE_QUIZ_ROOTS = ['C', 'G', 'F']

export const SCALE_TYPE_LEVELS: ScaleTypeId[][] = [
  ['major', 'natural minor'],
  ['major', 'natural minor', 'harmonic minor'],
  ['major', 'natural minor', 'harmonic minor', 'blues', 'major pentatonic'],
  ['major', 'natural minor', 'harmonic minor', 'blues', 'major pentatonic', 'dorian', 'mixolydian'],
]

export function makeScaleTypeQuestion(level: number, rng: Rng = Math.random): ScaleTypeQuestion {
  const set = SCALE_TYPE_LEVELS[clampLevel(level, SCALE_TYPE_LEVELS.length) - 1]
  const type = pick(set, rng)
  const root = pick(SCALE_QUIZ_ROOTS, rng)
  const answer = SCALE_TYPE_LABELS[type]
  return {
    kind: 'scale-type',
    midis: getScale(root, type).midi,
    answer,
    options: makeOptions(set.map((t) => SCALE_TYPE_LABELS[t]), answer, 4, rng),
  }
}

// --- cadence identification ---

export interface CadenceQuestion {
  kind: 'cadence'
  /** Block chords played in order; the last move is the cadence. */
  chords: number[][]
  answer: string
  options: string[]
}

type CadenceId = 'authentic' | 'plagal' | 'half' | 'deceptive'

const CADENCE_LABELS: Record<CadenceId, string> = {
  authentic: 'Perfect (V → I)',
  plagal: 'Plagal (IV → I)',
  half: 'Half (ends on V)',
  deceptive: 'Deceptive (V → vi)',
}

export const CADENCE_LEVELS: CadenceId[][] = [
  ['authentic', 'plagal'],
  ['authentic', 'plagal', 'half'],
  ['authentic', 'plagal', 'half', 'deceptive'],
]

/**
 * Close voicings around the tonic (same shapes as the cadence drills):
 * I root position, IV in 2nd inversion, V in 1st inversion, vi in 1st
 * inversion — smooth voice leading so only the harmony changes.
 */
function cadenceChords(tonicMidi: number, cadence: CadenceId): number[][] {
  const I = [tonicMidi, tonicMidi + 4, tonicMidi + 7]
  const IV = [tonicMidi, tonicMidi + 5, tonicMidi + 9]
  const V = [tonicMidi - 1, tonicMidi + 2, tonicMidi + 7]
  const vi = [tonicMidi, tonicMidi + 4, tonicMidi + 9]
  switch (cadence) {
    case 'authentic':
      return [I, IV, V, I]
    case 'plagal':
      return [I, IV, I] // the "Amen" cadence
    case 'half':
      return [I, IV, V]
    case 'deceptive':
      return [I, IV, V, vi]
  }
}

export function makeCadenceQuestion(level: number, rng: Rng = Math.random): CadenceQuestion {
  const set = CADENCE_LEVELS[clampLevel(level, CADENCE_LEVELS.length) - 1]
  const cadence = pick(set, rng)
  const tonic = 57 + Math.floor(rng() * 8) // A3–E4: chords sit around middle C
  const answer = CADENCE_LABELS[cadence]
  return {
    kind: 'cadence',
    chords: cadenceChords(tonic, cadence),
    answer,
    options: makeOptions(set.map((c) => CADENCE_LABELS[c]), answer, 4, rng),
  }
}

export function makeEchoQuestion(level: number, rng: Rng = Math.random): EchoQuestion {
  const def = ECHO_LEVELS[clampLevel(level, ECHO_LEVELS.length) - 1]
  const positionLabel = pick(def.positions, rng)
  const rootMidi = ECHO_POSITIONS[positionLabel]
  const len = def.minLen + Math.floor(rng() * (def.maxLen - def.minLen + 1))
  const midis = [rootMidi] // start on the root so the ear has an anchor
  let idx = 0
  for (let i = 1; i < len; i++) {
    // Mostly stepwise, occasional skip, stay inside the five-finger position.
    const moves = [-2, -1, -1, 1, 1, 2]
    let next = idx + moves[Math.floor(rng() * moves.length)]
    next = Math.max(0, Math.min(POSITION_OFFSETS.length - 1, next))
    if (next === idx) next = idx + (idx === POSITION_OFFSETS.length - 1 ? -1 : 1)
    idx = next
    midis.push(rootMidi + POSITION_OFFSETS[idx])
  }
  return { kind: 'echo', midis, positionLabel }
}
