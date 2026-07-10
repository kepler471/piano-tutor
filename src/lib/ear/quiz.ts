import { getChord, inversionsFor, INVERSION_LABELS } from '../theory/chords'
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
  /** True when both notes sound together (levels 5+) instead of in sequence. */
  harmonic: boolean
  answer: string
  options: string[]
  /** Why: shown after the reveal so a wrong answer still teaches. */
  explanation: string
}

export interface ChordQuestion {
  kind: 'chord'
  midis: number[]
  answer: string
  options: string[]
  explanation: string
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

/**
 * Post-answer teaching lines, keyed by semitones. Each names the semitone
 * count plus a song hook — the standard way to learn intervals by ear.
 */
export const INTERVAL_EXPLANATIONS: Record<number, string> = {
  0: 'A unison is the same note twice — 0 semitones apart. Nothing moves.',
  1: 'A minor 2nd is 1 semitone — the smallest step, tense and creeping: the "Jaws" theme.',
  2: 'A major 2nd is 2 semitones — a plain whole step: the start of "Happy Birthday" (hap-py).',
  3: 'A minor 3rd is 3 semitones — soft and melancholy: the opening of "Greensleeves" (a-las).',
  4: 'A major 3rd is 4 semitones — bright and open: "Oh, When the Saints" (oh, when).',
  5: 'A perfect 4th is 5 semitones — sturdy and ceremonial: "Here Comes the Bride" (here comes).',
  6: 'A tritone is 6 semitones — the famously unstable one: "The Simpsons" (the SIMP-sons).',
  7: 'A perfect 5th is 7 semitones — hollow and strong: "Twinkle, Twinkle" (twin-kle twin-kle) or the "Star Wars" leap.',
  8: 'A minor 6th is 8 semitones — bittersweet and yearning: the theme from "Love Story" (whe-re).',
  9: 'A major 6th is 9 semitones — warm and lifting: "My Bonnie Lies Over the Ocean" (my bon-nie).',
  10: 'A minor 7th is 10 semitones — wide and unresolved: "Somewhere" from West Side Story (there\'s a).',
  11: 'A major 7th is 11 semitones — one shy of the octave, dissonant and reaching: the big leap in "Take On Me".',
  12: 'An octave is 12 semitones — the same note, higher: "Somewhere Over the Rainbow" (some-where).',
}

/** Semitone sets per level — wider and more confusable as levels rise. */
export const INTERVAL_LEVELS: number[][] = [
  [0, 2, 4, 7, 12],
  [0, 1, 2, 3, 4, 5, 7, 12],
  [0, 1, 2, 3, 4, 5, 7, 8, 9, 12],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
]

/**
 * Full interval ladder: levels 1–4 are the melodic sets above (unchanged so
 * saved progress keeps its meaning); level 5 plays both notes together
 * (harmonic — no unison, which would just be one note); level 6 mixes
 * melodic and harmonic questions over the full chromatic set.
 */
export const INTERVAL_LEVEL_DEFS: { set: number[]; playback: 'melodic' | 'harmonic' | 'mixed' }[] = [
  { set: INTERVAL_LEVELS[0], playback: 'melodic' },
  { set: INTERVAL_LEVELS[1], playback: 'melodic' },
  { set: INTERVAL_LEVELS[2], playback: 'melodic' },
  { set: INTERVAL_LEVELS[3], playback: 'melodic' },
  { set: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], playback: 'harmonic' },
  { set: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], playback: 'mixed' },
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
  // Level 5 — the level-3 qualities again, but voiced in a random inversion:
  // same colour, different bottom note. Level 6 — every quality, any inversion.
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

/** Recipe + how it sounds — shared with the reading quizzes in theory/quiz.ts. */
export const CHORD_QUALITY_EXPLANATIONS: Record<ChordQualityId, string> = {
  major: 'Major stacks a major 3rd then a minor 3rd (4+3 semitones) — bright, stable, "happy".',
  minor: 'Minor lowers the middle note: minor 3rd then major 3rd (3+4) — darker and sadder than major.',
  diminished: 'Diminished is two minor 3rds (3+3) — cramped and tense; it wants to resolve somewhere.',
  augmented: 'Augmented is two major 3rds (4+4) — dreamlike and unsettled, neither major nor minor.',
  'dominant 7th':
    'A dominant 7th is a major triad plus a flat 7th — bright but restless; listen for the pull back home, down a 5th.',
  'major 7th': 'A major 7th is a major triad plus a major 7th — soft, warm and jazzy, no pull anywhere.',
  'minor 7th': 'A minor 7th is a minor triad plus a flat 7th — mellow and smooth, the gentlest of the 7ths.',
  'half-diminished':
    'Half-diminished is a diminished triad plus a flat 7th (m7♭5) — suspenseful, darker than a minor 7th but softer than diminished.',
  'diminished 7th':
    'A diminished 7th stacks minor 3rds all the way up — maximum tension, the classic silent-movie "drama" chord.',
  'major 6th': 'A major 6th is a major triad plus the 6th scale note — sweet and settled, a vintage-jazz ending colour.',
}

/** Five-finger positions for echo phrases: label → root midi. */
export const ECHO_POSITIONS: Record<string, number> = {
  'C position': 60,
  'G position': 55,
  'F position': 65,
  'D position': 62,
  'A position': 57,
  'A minor position': 57,
  'D minor position': 62,
  'C minor position': 60,
}

/** Five-finger scale degrees above the root. */
const MAJOR_PENTASCALE = [0, 2, 4, 5, 7]
const MINOR_PENTASCALE = [0, 2, 3, 5, 7]

export const ECHO_LEVELS: { positions: string[]; minLen: number; maxLen: number; offsets: number[] }[] = [
  { positions: ['C position'], minLen: 3, maxLen: 4, offsets: MAJOR_PENTASCALE },
  { positions: ['C position', 'G position', 'F position'], minLen: 4, maxLen: 5, offsets: MAJOR_PENTASCALE },
  {
    positions: ['C position', 'G position', 'F position', 'D position'],
    minLen: 5,
    maxLen: 6,
    offsets: MAJOR_PENTASCALE,
  },
  // Level 4 — a fifth major position and longer phrases.
  {
    positions: ['C position', 'G position', 'F position', 'D position', 'A position'],
    minLen: 6,
    maxLen: 7,
    offsets: MAJOR_PENTASCALE,
  },
  // Level 5 — minor five-finger positions: same hand shape, darker colour.
  {
    positions: ['A minor position', 'D minor position', 'C minor position'],
    minLen: 6,
    maxLen: 8,
    offsets: MINOR_PENTASCALE,
  },
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
  const def = INTERVAL_LEVEL_DEFS[clampLevel(level, INTERVAL_LEVEL_DEFS.length) - 1]
  const semitones = pick(def.set, rng)
  const harmonic = def.playback === 'harmonic' || (def.playback === 'mixed' && rng() < 0.5)
  // Harmonic pairs always stack upward; melodic ones go either way.
  const up = harmonic || semitones === 0 || rng() < 0.5
  // Root somewhere around middle C so both directions stay in comfortable range.
  const root = 55 + Math.floor(rng() * 13)
  const midis: [number, number] = [root, up ? root + semitones : root - semitones]
  const answer = INTERVAL_LABELS[semitones]
  return {
    kind: 'interval',
    midis,
    harmonic,
    answer,
    options: makeOptions(def.set.map((s) => INTERVAL_LABELS[s]), answer, 4, rng),
    explanation: INTERVAL_EXPLANATIONS[semitones],
  }
}

const QUIZ_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

export function makeChordQuestion(level: number, rng: Rng = Math.random): ChordQuestion {
  const lvl = clampLevel(level, CHORD_LEVELS.length)
  const set = CHORD_LEVELS[lvl - 1]
  const quality = pick(set, rng)
  const root = pick(QUIZ_ROOTS, rng)
  // From level 5 the chord may be voiced in any inversion — recognizing the
  // quality without the root on the bottom is the next listening skill.
  const inversion = lvl >= 5 ? pick(inversionsFor(quality), rng) : 0
  const answer = CHORD_LABELS[quality]
  const explanation =
    inversion > 0
      ? `${CHORD_QUALITY_EXPLANATIONS[quality]} This one was voiced in ${INVERSION_LABELS[inversion]}, so the root was not the lowest note.`
      : CHORD_QUALITY_EXPLANATIONS[quality]
  return {
    kind: 'chord',
    midis: getChord(root, quality, inversion).midi,
    answer,
    options: makeOptions(set.map((q) => CHORD_LABELS[q]), answer, 4, rng),
    explanation,
  }
}

// --- scale-type identification ---

export interface ScaleTypeQuestion {
  kind: 'scale-type'
  /** Scale played ascending. */
  midis: number[]
  answer: string
  options: string[]
  explanation: string
}

export const SCALE_TYPE_LABELS: Record<ScaleTypeId, string> = {
  major: 'Major',
  'natural minor': 'Natural minor',
  'harmonic minor': 'Harmonic minor',
  blues: 'Blues',
  'major pentatonic': 'Major pentatonic',
  'minor pentatonic': 'Minor pentatonic',
  dorian: 'Dorian',
  mixolydian: 'Mixolydian',
  lydian: 'Lydian',
  phrygian: 'Phrygian',
  locrian: 'Locrian',
}

/** What to listen for, per scale type. */
export const SCALE_TYPE_EXPLANATIONS: Record<ScaleTypeId, string> = {
  major: 'Major is the plain do-re-mi ladder — bright and settled, no surprises on the way up.',
  'natural minor': 'Natural minor lowers the 3rd, 6th and 7th — sad and folky, with a soft ending step.',
  'harmonic minor':
    'Harmonic minor raises the 7th, leaving an exotic extra-wide gap near the top — listen for that "snake-charmer" leap.',
  blues: 'The blues scale has only six notes with crushed "blue" notes inside — it swaggers rather than climbs.',
  'major pentatonic':
    'Major pentatonic is five notes with no semitones at all — open and folky, nothing clashes.',
  dorian: 'Dorian sounds minor but with a brighter, raised 6th — think "Scarborough Fair".',
  mixolydian: 'Mixolydian sounds major until the lowered 7th near the top — bluesy, never quite finishing.',
  'minor pentatonic':
    'Minor pentatonic is five notes, minor and bluesy — the blues scale without its "blue" note.',
  lydian: 'Lydian is major with a raised 4th — floating and film-score bright, one step dreamier than major.',
  phrygian: 'Phrygian is minor with a lowered 2nd right at the start — dark and Spanish-sounding.',
  locrian: 'Locrian lowers both the 2nd and the 5th — unstable and unresolved, it never quite lands.',
}

/** Familiar low-accidental roots while the scale colours are still new. */
const SCALE_QUIZ_ROOTS = ['C', 'G', 'F']
/** Wider transposition for the top levels — it's ear-only, so more keys is a mild bump. */
const SCALE_QUIZ_ROOTS_WIDE = ['C', 'G', 'D', 'A', 'F', 'Bb', 'Eb', 'E']

export const SCALE_TYPE_LEVELS: ScaleTypeId[][] = [
  ['major', 'natural minor'],
  ['major', 'natural minor', 'harmonic minor'],
  ['major', 'natural minor', 'harmonic minor', 'blues', 'major pentatonic'],
  ['major', 'natural minor', 'harmonic minor', 'blues', 'major pentatonic', 'minor pentatonic', 'dorian', 'mixolydian'],
  // Levels 5–6: the remaining church modes join, brightest to darkest,
  // and (below) the roots widen from C/G/F to eight keys.
  [
    'major',
    'natural minor',
    'harmonic minor',
    'blues',
    'major pentatonic',
    'minor pentatonic',
    'dorian',
    'mixolydian',
    'lydian',
    'phrygian',
  ],
  [
    'major',
    'natural minor',
    'harmonic minor',
    'blues',
    'major pentatonic',
    'minor pentatonic',
    'dorian',
    'mixolydian',
    'lydian',
    'phrygian',
    'locrian',
  ],
]

/** Roots per level, parallel to SCALE_TYPE_LEVELS. */
export const SCALE_TYPE_ROOTS_BY_LEVEL: string[][] = [
  SCALE_QUIZ_ROOTS,
  SCALE_QUIZ_ROOTS,
  SCALE_QUIZ_ROOTS,
  SCALE_QUIZ_ROOTS,
  SCALE_QUIZ_ROOTS_WIDE,
  SCALE_QUIZ_ROOTS_WIDE,
]

export function makeScaleTypeQuestion(level: number, rng: Rng = Math.random): ScaleTypeQuestion {
  const lvl = clampLevel(level, SCALE_TYPE_LEVELS.length)
  const set = SCALE_TYPE_LEVELS[lvl - 1]
  const type = pick(set, rng)
  const root = pick(SCALE_TYPE_ROOTS_BY_LEVEL[lvl - 1], rng)
  const answer = SCALE_TYPE_LABELS[type]
  return {
    kind: 'scale-type',
    midis: getScale(root, type).midi,
    answer,
    options: makeOptions(set.map((t) => SCALE_TYPE_LABELS[t]), answer, 4, rng),
    explanation: SCALE_TYPE_EXPLANATIONS[type],
  }
}

// --- cadence identification ---

export interface CadenceQuestion {
  kind: 'cadence'
  /** Block chords played in order; the last move is the cadence. */
  chords: number[][]
  answer: string
  options: string[]
  explanation: string
}

export type CadenceId = 'authentic' | 'plagal' | 'half' | 'deceptive'

const CADENCE_LABELS: Record<CadenceId, string> = {
  authentic: 'Perfect (V → I)',
  plagal: 'Plagal (IV → I)',
  half: 'Half (ends on V)',
  deceptive: 'Deceptive (V → vi)',
}

export const CADENCE_EXPLANATIONS: Record<CadenceId, string> = {
  authentic:
    'Perfect (V → I): the tension chord falls home to the tonic — music\'s full stop. The bass drops a 5th and everything settles.',
  plagal:
    'Plagal (IV → I): the gentle "Amen" ending of hymns — it relaxes home without the strong pull of a V chord.',
  half: 'Half (ends on V): the phrase stops ON the tension chord — a question mark. It sounds unfinished because it is.',
  deceptive:
    'Deceptive (V → vi): sets up a full stop, then sidesteps to the minor vi chord — the "surprise" that keeps the music going.',
}

export type CadenceMode = 'major' | 'minor'

/**
 * Cadence ladder: levels 1–3 grow the cadence set in major (unchanged);
 * level 4 hears the same four cadences in minor keys; level 5 mixes modes.
 */
export const CADENCE_LEVEL_DEFS: { cadences: CadenceId[]; modes: CadenceMode[] }[] = [
  { cadences: ['authentic', 'plagal'], modes: ['major'] },
  { cadences: ['authentic', 'plagal', 'half'], modes: ['major'] },
  { cadences: ['authentic', 'plagal', 'half', 'deceptive'], modes: ['major'] },
  { cadences: ['authentic', 'plagal', 'half', 'deceptive'], modes: ['minor'] },
  { cadences: ['authentic', 'plagal', 'half', 'deceptive'], modes: ['major', 'minor'] },
]

export const CADENCE_LEVELS: CadenceId[][] = CADENCE_LEVEL_DEFS.map((d) => d.cadences)

/** What changes when the same cadence is heard in a minor key. */
const MINOR_CADENCE_NOTES: Record<CadenceId, string> = {
  authentic:
    'Heard here in minor: home is a minor chord, but the V stays major (raised leading tone) so the pull home is just as strong.',
  plagal: 'Heard here in minor: both chords are minor, so the "Amen" turns melancholy.',
  half: 'Heard here in minor: the phrase parks on the major V — the raised leading tone leaves it hanging even harder.',
  deceptive:
    'Heard here in minor: the sidestep lands on the MAJOR VI chord — a sudden brightening instead of a darkening.',
}

/**
 * Close voicings around the tonic (same shapes as the cadence drills):
 * tonic root position, subdominant in 2nd inversion, V in 1st inversion,
 * the deceptive target in 1st inversion — smooth voice leading so only the
 * harmony changes. In minor, V keeps its major third (harmonic minor's
 * raised leading tone) and the deceptive cadence lands on the major VI.
 */
function cadenceChords(tonicMidi: number, cadence: CadenceId, mode: CadenceMode): number[][] {
  const t = tonicMidi
  const minor = mode === 'minor'
  const tonic = minor ? [t, t + 3, t + 7] : [t, t + 4, t + 7]
  const sub = minor ? [t, t + 5, t + 8] : [t, t + 5, t + 9]
  const V = [t - 1, t + 2, t + 7]
  const six = minor ? [t, t + 3, t + 8] : [t, t + 4, t + 9]
  switch (cadence) {
    case 'authentic':
      return [tonic, sub, V, tonic]
    case 'plagal':
      return [tonic, sub, tonic] // the "Amen" cadence
    case 'half':
      return [tonic, sub, V]
    case 'deceptive':
      return [tonic, sub, V, six]
  }
}

export function makeCadenceQuestion(level: number, rng: Rng = Math.random): CadenceQuestion {
  const def = CADENCE_LEVEL_DEFS[clampLevel(level, CADENCE_LEVEL_DEFS.length) - 1]
  const cadence = pick(def.cadences, rng)
  const mode = def.modes.length === 1 ? def.modes[0] : pick(def.modes, rng)
  const tonic = 57 + Math.floor(rng() * 8) // A3–E4: chords sit around middle C
  const answer = CADENCE_LABELS[cadence]
  const explanation =
    mode === 'minor' ? `${CADENCE_EXPLANATIONS[cadence]} ${MINOR_CADENCE_NOTES[cadence]}` : CADENCE_EXPLANATIONS[cadence]
  return {
    kind: 'cadence',
    chords: cadenceChords(tonic, cadence, mode),
    answer,
    options: makeOptions(def.cadences.map((c) => CADENCE_LABELS[c]), answer, 4, rng),
    explanation,
  }
}

export function makeEchoQuestion(level: number, rng: Rng = Math.random): EchoQuestion {
  const def = ECHO_LEVELS[clampLevel(level, ECHO_LEVELS.length) - 1]
  const positionLabel = pick(def.positions, rng)
  const rootMidi = ECHO_POSITIONS[positionLabel]
  const len = def.minLen + Math.floor(rng() * (def.maxLen - def.minLen + 1))
  const offsets = def.offsets
  const midis = [rootMidi] // start on the root so the ear has an anchor
  let idx = 0
  for (let i = 1; i < len; i++) {
    // Mostly stepwise, occasional skip, stay inside the five-finger position.
    const moves = [-2, -1, -1, 1, 1, 2]
    let next = idx + moves[Math.floor(rng() * moves.length)]
    next = Math.max(0, Math.min(offsets.length - 1, next))
    if (next === idx) next = idx + (idx === offsets.length - 1 ? -1 : 1)
    idx = next
    midis.push(rootMidi + offsets[idx])
  }
  return { kind: 'echo', midis, positionLabel }
}
