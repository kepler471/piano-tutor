import { Note } from 'tonal'
import type { ChordQualityId, Hand, ScaleTypeId } from '../theory/types'
import { bankGrammarWords } from './intentBank'
import type { Intent } from './intents'

/**
 * Pure transcript → Intent parser. Input is whatever Vosk emits: lowercase
 * words separated by spaces, with out-of-grammar audio decoded as "[unk]".
 * No DOM/audio types here so vitest covers it directly.
 */

export const WAKE_WORD = 'piano'
const WAKE_PREFIXES = new Set(['hey', 'okay', 'ok'])

/** Recognizer/homophone fixups for spoken note letters. */
const NOTE_HOMOPHONES: Record<string, string> = {
  ay: 'a',
  be: 'b',
  bee: 'b',
  sea: 'c',
  see: 'c',
  dee: 'd',
  ef: 'f',
  gee: 'g',
}

const NOTE_LETTERS = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g'])

const UNITS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
}
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
}

/** Lesson names the recognizer can't hear (out-of-vocab) or common shorthands. */
export const SPOKEN_LESSON_ALIASES: Record<string, string> = {
  'finger exercise': 'hanon',
  'finger exercises': 'hanon',
}

function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\[unk\]/g, ' ')
    .replace(/[^a-z0-9#\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Public alias so the intent-fallback modules normalize exactly like the parser. */
export const normalizeTranscript = normalize

/**
 * Parses spoken number words or digits, e.g. "ninety", "one hundred and
 * twenty", "120". Returns null when absent or outside a sane BPM range.
 */
export function wordsToNumber(tokens: string[]): number | null {
  let total = 0
  let seen = false
  for (const tok of tokens) {
    if (tok === 'and') continue
    if (/^\d+$/.test(tok)) {
      total += parseInt(tok, 10)
      seen = true
    } else if (tok in UNITS) {
      total += UNITS[tok]
      seen = true
    } else if (tok in TENS) {
      total += TENS[tok]
      seen = true
    } else if (tok === 'hundred') {
      total = (total || 1) * 100
      seen = true
    } else if (seen) {
      break
    }
  }
  if (!seen) return null
  return total >= 30 && total <= 240 ? total : null
}

/** Extracts a trailing number, optionally after "at"/"to", e.g. "metronome on at ninety". */
function trailingNumber(tokens: string[]): number | undefined {
  for (let i = 0; i < tokens.length; i++) {
    const n = wordsToNumber(tokens.slice(i))
    if (n !== null) return n
  }
  return undefined
}

/**
 * Maps a spoken root like "c sharp" to the spelling used by a screen's root
 * list ("Db" vs "C#") by pitch class, so enharmonics always land.
 */
export function matchRoot(spoken: string, available: string[]): string | null {
  const chroma = Note.chroma(spoken)
  if (chroma === undefined) return null
  return available.find((r) => Note.chroma(r) === chroma) ?? null
}

const AFTER_ROOT_KEYWORDS = new Set([
  'major', 'minor', 'diminished', 'dim', 'augmented', 'dominant',
  'seventh', 'seven', 'chord', 'scale', 'harmonic', 'natural',
])

/** Finds a note root in the token stream; returns canonical form like "C#", "Bb". */
function findRoot(tokens: string[]): { root: string } | null {
  for (let i = 0; i < tokens.length; i++) {
    const homophone = tokens[i] in NOTE_HOMOPHONES
    const letter = NOTE_HOMOPHONES[tokens[i]] ?? tokens[i]
    if (!NOTE_LETTERS.has(letter)) continue
    const next = tokens[i + 1]
    if (next === 'sharp') return { root: letter.toUpperCase() + '#' }
    if (next === 'flat') return { root: letter.toUpperCase() + 'b' }
    // "a"/"e" double as articles ("show me a d major") and homophones double
    // as ordinary words ("can i SEE the chords" must not become C); only
    // treat them as roots when a quality/scale keyword follows immediately.
    if ((homophone || letter === 'a' || letter === 'e') && !(next && AFTER_ROOT_KEYWORDS.has(next)))
      continue
    return { root: letter.toUpperCase() }
  }
  return null
}

function findScaleType(text: string): ScaleTypeId | undefined {
  if (text.includes('harmonic minor')) return 'harmonic minor'
  if (text.includes('natural minor') || /\bminor\b/.test(text)) return 'natural minor'
  if (/\bmajor\b/.test(text)) return 'major'
  return undefined
}

function findChordQuality(text: string): ChordQualityId | undefined {
  if (/minor (seventh|seven)/.test(text)) return 'minor 7th'
  if (/major (seventh|seven)/.test(text)) return 'major 7th'
  if (/dominant (seventh|seven)/.test(text) || /\b(seventh|seven)\b/.test(text)) return 'dominant 7th'
  if (/\b(diminished|dim)\b/.test(text)) return 'diminished'
  if (/\baugmented\b/.test(text)) return 'augmented'
  if (/\bminor\b/.test(text)) return 'minor'
  if (/\bmajor\b/.test(text)) return 'major'
  return undefined
}

function findInversion(text: string): 0 | 1 | 2 | 3 | undefined {
  if (text.includes('root position')) return 0
  if (text.includes('first inversion')) return 1
  if (text.includes('second inversion')) return 2
  if (text.includes('third inversion')) return 3
  return undefined
}

function findHand(text: string): Hand | undefined {
  if (text.includes('left hand')) return 'L'
  if (text.includes('right hand')) return 'R'
  return undefined
}

/** Everything slot-like that can be pulled out of a transcript, in one pass. */
export interface Slots {
  root?: string
  scaleType?: ScaleTypeId
  chordQuality?: ChordQualityId
  inversion?: 0 | 1 | 2 | 3
  hand?: Hand
  bpm?: number
}

/**
 * Slot extraction for the embedding-based intent fallback: reuses the exact
 * same finders as parseTranscript so both tiers agree on what "b flat" means.
 */
export function extractSlots(raw: string): Slots {
  const tokens = normalize(raw).split(' ').filter(Boolean)
  const text = tokens.join(' ')
  return {
    root: findRoot(tokens)?.root,
    scaleType: findScaleType(text),
    chordQuality: findChordQuality(text),
    inversion: findInversion(text),
    hand: findHand(text),
    bpm: trailingNumber(tokens),
  }
}

const NAV_TARGETS: [string, Intent & { kind: 'navigate' }][] = [
  ['home', { kind: 'navigate', route: '/' }],
  ['scales', { kind: 'navigate', route: '/scales' }],
  ['chords', { kind: 'navigate', route: '/chords' }],
  ['practice', { kind: 'navigate', route: '/practice' }],
  ['free play', { kind: 'navigate', route: '/play' }],
  ['tuner', { kind: 'navigate', route: '/tuner' }],
  ['note detector', { kind: 'navigate', route: '/tuner' }],
]

const NAV_FILLERS = new Set(['go', 'to', 'open', 'show', 'me', 'the', 'screen', 'page'])

const LESSON_KEYWORDS = ['five finger', 'hanon', 'finger exercise', 'scale routine', 'cadence', 'sight reading']

/**
 * Parses one final transcript. Returns null when the wake word is absent
 * (utterance is ignored silently); {kind:'unknown'} when the wake word was
 * heard but the command didn't parse.
 */
export function parseTranscript(raw: string, opts: { armed?: boolean } = {}): Intent | null {
  let tokens = normalize(raw).split(' ').filter(Boolean)
  if (tokens.length === 0) return null

  // Wake word: optional "hey"/"okay" prefix, then "piano".
  if (WAKE_PREFIXES.has(tokens[0])) tokens = tokens.slice(1)
  if (tokens[0] === WAKE_WORD) {
    tokens = tokens.slice(1)
    if (tokens.length === 0) return { kind: 'wake' }
  } else if (!opts.armed) {
    return null
  }

  const text = tokens.join(' ')

  // --- order matters: multi-word "stop X" phrases before bare "stop" ---
  if (/\bstop recording\b/.test(text)) return { kind: 'free-play', action: 'stop-recording' }
  if (/(stop|turn off) (the )?metronome/.test(text) || /metronome off/.test(text))
    return { kind: 'metronome', action: 'stop' }
  if (/stop (the )?(mic|microphone)|stop listening/.test(text)) return { kind: 'mic', action: 'stop' }
  if (/voice off|go to sleep|turn off voice|stop voice/.test(text)) return { kind: 'voice-off' }
  if (/^(stop|cancel|quiet|be quiet)$/.test(text)) return { kind: 'stop-all' }
  if (/\bhelp\b|what can (i say|you do)|\bcommands\b/.test(text)) return { kind: 'help' }

  // Navigation: after removing filler verbs the phrase must be exactly a target.
  const navText = tokens.filter((t) => !NAV_FILLERS.has(t)).join(' ')
  for (const [key, intent] of NAV_TARGETS) {
    if (navText === key) return intent
  }

  // Metronome / tempo.
  if (/\bmetronome\b/.test(text)) {
    return { kind: 'metronome', action: 'start', bpm: trailingNumber(tokens) }
  }
  if (/\btempo\b|\bspeed\b/.test(text)) {
    const bpm = trailingNumber(tokens)
    if (bpm !== undefined) return { kind: 'set-bpm', bpm }
  }
  if (/^(slower|slow down)$/.test(text)) return { kind: 'set-bpm', delta: -10 }
  if (/^(faster|speed up)$/.test(text)) return { kind: 'set-bpm', delta: 10 }

  // Free play controls.
  if (/melody mode/.test(text)) return { kind: 'free-play', action: 'set-mode', mode: 'melody' }
  if (/(chord|chords) mode/.test(text)) return { kind: 'free-play', action: 'set-mode', mode: 'chords' }
  if (/\brecord\b/.test(text)) return { kind: 'free-play', action: 'record', bpm: trailingNumber(tokens) }
  if (/^clear( the (notes|score))?$/.test(text)) return { kind: 'free-play', action: 'clear' }
  if (/\bcopy\b/.test(text)) return { kind: 'free-play', action: 'copy' }

  // Pitch-detection mic.
  if (/start listening|check my (chord|playing)|listen to (me|my playing)/.test(text))
    return { kind: 'mic', action: 'start' }

  // Lesson flow.
  if (/^(restart|start over|again|start again)$/.test(text)) return { kind: 'lesson', action: 'restart' }
  if (/^next( (part|segment|section))?$/.test(text)) return { kind: 'lesson', action: 'next' }
  if (/^previous( (part|segment|section))?$/.test(text) || /^go back$/.test(text))
    return { kind: 'lesson', action: 'previous' }
  if (/back to (the )?lessons|exit( lesson)?$/.test(text)) return { kind: 'lesson', action: 'exit' }
  if (/new melody/.test(text)) return { kind: 'lesson', action: 'new-melody' }

  // Demo playback.
  if (/^(play|play it|play that|demo|play the (demo|scale|chord)|play it again)$/.test(text))
    return { kind: 'play-demo' }
  if (/^block( chord)?$/.test(text)) return { kind: 'play-demo', variant: 'block' }
  if (/arpeggio|arpeggiate|break it up/.test(text)) return { kind: 'play-demo', variant: 'arpeggio' }

  // Named lessons: "practice five finger", "open the scale routine", or a bare keyword.
  const lessonVerb = /^(practice|start|do) (.+)$/.exec(text)
  if (lessonVerb) return { kind: 'open-lesson', query: lessonVerb[2] }
  if (LESSON_KEYWORDS.some((k) => text.includes(k))) {
    const query = tokens.filter((t) => !NAV_FILLERS.has(t)).join(' ')
    return { kind: 'open-lesson', query }
  }

  // Hand only ("left hand") — before root parsing so "b flat left hand" still works below.
  const hand = findHand(text)
  const inversion = findInversion(text)

  // Scale / chord selection.
  const rootMatch = findRoot(tokens)
  const wantsChord =
    /\bchord\b/.test(text) ||
    inversion !== undefined ||
    /seventh|seven|diminished|dim\b|augmented/.test(text)
  if (rootMatch) {
    if (wantsChord) {
      return {
        kind: 'show-chord',
        root: rootMatch.root,
        quality: findChordQuality(text),
        inversion,
        hand,
      }
    }
    return {
      kind: 'show-scale',
      root: rootMatch.root,
      scaleType: findScaleType(text),
      hand,
      explicit: /\bscale\b/.test(text) || undefined,
    }
  }
  if (inversion !== undefined) return { kind: 'set-inversion', inversion }
  if (hand) return { kind: 'set-hand', hand }
  const scaleType = findScaleType(text)
  if (scaleType && /\bscale\b/.test(text)) return { kind: 'show-scale', scaleType }

  return { kind: 'unknown', text }
}

/**
 * Token-overlap match of a spoken lesson query against lesson titles/methods.
 * Returns the best lesson id or null.
 */
export function matchLesson(
  query: string,
  lessons: { id: string; title: string; method: string }[],
): string | null {
  let q = normalize(query)
  for (const [alias, replacement] of Object.entries(SPOKEN_LESSON_ALIASES)) {
    q = q.replace(alias, replacement)
  }
  // Collapse "b flat" → "bb", "f sharp" → "f#" so spoken roots match titles.
  q = q.replace(/\b([a-g]) flat\b/g, '$1b').replace(/\b([a-g]) sharp\b/g, '$1#')
  const qTokens = new Set(q.split(' ').filter(Boolean))
  let best: { id: string; score: number } | null = null
  for (const lesson of lessons) {
    const lTokens = normalize(`${lesson.title} ${lesson.method}`).split(' ').filter(Boolean)
    let score = 0
    for (const t of new Set(lTokens)) if (qTokens.has(t)) score++
    if (score > 0 && (!best || score > best.score)) best = { id: lesson.id, score }
  }
  return best?.id ?? null
}

/** Words that the small model doesn't know; keep them out of the grammar. */
const GRAMMAR_DENYLIST = new Set(['hanon'])

/**
 * Conversational filler so paraphrases ("can you show me the chords page
 * please") survive grammar-constrained decoding instead of collapsing to
 * [unk]. The regex parser ignores these; the embedding fallback needs them.
 */
const FILLER_WORDS = `
  please could would like want lets us need see try
  little bit more much this another how about going for
`

/**
 * Builds the Kaldi grammar word list. Vosk compiles this into a loop FST, so
 * listing vocabulary words permits any sequence of them; the parser handles
 * ordering. "[unk]" makes everything else (piano notes, chatter) decode as
 * unknown instead of being force-fitted onto command words.
 */
export function buildGrammar(lessons: { title: string; method: string }[]): string[] {
  const words = new Set<string>(['[unk]', WAKE_WORD])
  const staticWords = `
    hey okay ok
    go to open show me the a an of screen page
    home scales chords practice free play tuner note detector
    start stop turn off on cancel quiet be help what can i say you do commands
    metronome tempo speed at set slower faster slow down up
    record recording clear copy notes score
    listening listen check my chord playing voice sleep mic microphone
    restart over again next previous part segment section back exit lessons lesson new melody
    demo it that block arpeggio arpeggiate break
    sharp flat major minor natural harmonic diminished augmented dominant seventh seven
    root position first second third inversion left right hand
    mode
    b c d e f g
    and hundred
  `
  for (const w of staticWords.split(/\s+/).filter(Boolean)) words.add(w)
  for (const w of FILLER_WORDS.split(/\s+/).filter(Boolean)) words.add(w)
  // Every word used by the embedding fallback's example bank must be
  // decodable, or paraphrases can never reach it (invariant covered by tests).
  for (const w of bankGrammarWords()) {
    if (!GRAMMAR_DENYLIST.has(w)) words.add(w)
  }
  for (const w of Object.keys(UNITS)) words.add(w)
  for (const w of Object.keys(TENS)) words.add(w)
  for (const alias of Object.keys(SPOKEN_LESSON_ALIASES)) {
    for (const w of alias.split(' ')) words.add(w)
  }
  for (const lesson of lessons) {
    for (const w of normalize(`${lesson.title} ${lesson.method}`).split(' ')) {
      if (/^[a-z]+$/.test(w) && !GRAMMAR_DENYLIST.has(w)) words.add(w)
    }
  }
  return [...words]
}
