// @vitest-environment node
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { allLessons } from '../lib/data/lessons'
import { createFallbackResolver, type EmbedFn, type FallbackResolver } from '../lib/voice/fallback'
import { INTENT_BANK } from '../lib/voice/intentBank'
import {
  cosineSimilarity,
  DEFAULT_MARGIN,
  DEFAULT_THRESHOLD,
  matchIntent,
  SUGGEST_THRESHOLD,
} from '../lib/voice/intentMatcher'
import { buildGrammar, parseTranscript } from '../lib/voice/parser'

/**
 * Integration tests against the REAL MiniLM model, fully offline: the same
 * vendored files the browser serves from public/model-minilm. Runs in node
 * env (jsdom lacks what onnxruntime needs); everything here is deterministic.
 *
 * This suite is the calibration authority for DEFAULT_THRESHOLD and
 * DEFAULT_MARGIN in intentMatcher.ts — tune them here, not by hand.
 */

const MODEL_DIR = fileURLToPath(new URL('../../public/model-minilm', import.meta.url))

/**
 * Paraphrases a user might actually say. Every row must:
 *  - resolve to the expected intent through the real embedding pipeline,
 *  - be invisible to the regex fast path (honesty guard: kind === 'unknown'),
 *  - use only words in the Vosk grammar (or it could never be decoded).
 */
const POSITIVE_ROWS: [string, object][] = [
  ['take us back home', { kind: 'navigate', route: '/' }],
  ['back to the main menu please', { kind: 'navigate', route: '/' }],
  ['where should i start', { kind: 'navigate', route: '/guide' }],
  ['i do not know where to begin', { kind: 'navigate', route: '/guide' }],
  ['could you open up the scales', { kind: 'navigate', route: '/scales' }],
  ['i would like to see some scales', { kind: 'navigate', route: '/scales' }],
  ['can i look at the chords', { kind: 'navigate', route: '/chords' }],
  ['i want to see the chords', { kind: 'navigate', route: '/chords' }],
  ['i need something to practice', { kind: 'navigate', route: '/practice' }],
  ['what should i be practicing', { kind: 'navigate', route: '/practice' }],
  ['let me play what i like', { kind: 'navigate', route: '/play' }],
  ['i just want to play around a bit', { kind: 'navigate', route: '/play' }],
  ['what note is that', { kind: 'navigate', route: '/tuner' }],
  ['tell me the note i am playing', { kind: 'navigate', route: '/tuner' }],
  ['i want a steady beat', { kind: 'metronome', action: 'start' }],
  ['give me a beat at eighty', { kind: 'metronome', action: 'start', bpm: 80 }],
  ['no more beat', { kind: 'metronome', action: 'stop' }],
  ['the beat can stop now', { kind: 'metronome', action: 'stop' }],
  ['a bit faster please', { kind: 'set-bpm', delta: 10 }],
  ['can we pick up the pace', { kind: 'set-bpm', delta: 10 }],
  ['a bit slower please', { kind: 'set-bpm', delta: -10 }],
  ['take it down a notch', { kind: 'set-bpm', delta: -10 }],
  ['can we go at seventy', { kind: 'set-bpm', bpm: 70 }],
  ['make it eighty please', { kind: 'set-bpm', bpm: 80 }],
  ['let me hear that', { kind: 'play-demo' }],
  ['how does that sound', { kind: 'play-demo' }],
  ['can i hear them one at a time', { kind: 'play-demo', variant: 'arpeggio' }],
  ['i want to hear the notes one by one', { kind: 'play-demo', variant: 'arpeggio' }],
  ['play all of the notes together', { kind: 'play-demo', variant: 'block' }],
  ['everything at once', { kind: 'play-demo', variant: 'block' }],
  ['time to move on', { kind: 'lesson', action: 'next' }],
  ['i am ready for the next part', { kind: 'lesson', action: 'next' }],
  ['take me back one step', { kind: 'lesson', action: 'previous' }],
  ['the one before please', { kind: 'lesson', action: 'previous' }],
  ['from the top please', { kind: 'lesson', action: 'restart' }],
  ['take it from the top again', { kind: 'lesson', action: 'restart' }],
  ['no more of this lesson', { kind: 'lesson', action: 'exit' }],
  ['we can stop the lesson now', { kind: 'lesson', action: 'exit' }],
  ['write down my notes', { kind: 'free-play', action: 'record' }],
  ['keep track of what i play', { kind: 'free-play', action: 'record' }],
  ['wipe everything away', { kind: 'free-play', action: 'clear' }],
  ['delete all of the notes', { kind: 'free-play', action: 'clear' }],
  ['tell me if i play it right', { kind: 'mic', action: 'start' }],
  ['am i playing this right', { kind: 'mic', action: 'start' }],
  ['what are the options here', { kind: 'help' }],
  ['i do not know what i can say', { kind: 'help' }],
  ['enough of this', { kind: 'stop-all' }],
  ['that is enough now', { kind: 'stop-all' }],
  ['i am done talking now', { kind: 'voice-off' }],
  ['you can sleep now', { kind: 'voice-off' }],
]

/**
 * Gibberish and clearly off-domain utterances: must produce NO outcome at
 * all — not even a spoken "did you mean" suggestion — so they calibrate
 * SUGGEST_THRESHOLD (the suggest floor). These may use open vocabulary — the
 * open-vocab Vosk fallback path exists, and the matcher must reject whatever
 * reaches it.
 */
const HARD_NEGATIVE_ROWS: string[] = [
  'purple monkey dishwasher',
  'the weather is nice today',
  'what time is it',
  'my sister plays the violin',
  'turn on the kitchen lights',
]

/**
 * On-domain chatter that must never be silently ACTED on. Landing in the
 * suggest band is acceptable by design: a wrong "…— right?" costs the user
 * one "no", a wrong action costs undoing it.
 */
const NEAR_MISS_ROWS: string[] = [
  'i like this piano',
  'that sounds nice',
  'my hands are tired',
  'this song is really hard',
]

let embed: EmbedFn
let resolver: FallbackResolver

beforeAll(async () => {
  const { pipeline, env } = await import('@huggingface/transformers')
  env.allowRemoteModels = false
  env.localModelPath = MODEL_DIR
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    dtype: 'q8',
  })
  embed = async (texts) => {
    const out = await extractor(texts, { pooling: 'mean', normalize: true })
    const [n, dim] = out.dims as [number, number]
    const data = out.data as Float32Array
    return Array.from({ length: n }, (_, i) => data.slice(i * dim, (i + 1) * dim))
  }
  resolver = createFallbackResolver(embed)
  await resolver.ready
}, 120_000)

describe('paraphrase table (real model)', () => {
  const grammar = new Set(buildGrammar(allLessons()))

  for (const [phrase, expected] of POSITIVE_ROWS) {
    it(`"${phrase}"`, async () => {
      // Honesty guard: the row must genuinely exercise the fallback…
      expect(parseTranscript(`piano ${phrase}`)).toMatchObject({ kind: 'unknown' })
      // …and be decodable under the grammar-constrained recognizer.
      for (const word of phrase.split(' ')) {
        expect(grammar, `"${word}" not in Vosk grammar`).toContain(word)
      }
      expect(await resolver.resolve(phrase)).toMatchObject({ kind: 'match', intent: expected })
    })
  }
})

describe('adversarial negatives (real model)', () => {
  for (const phrase of HARD_NEGATIVE_ROWS) {
    it(`hard: "${phrase}" → null (not even a suggestion)`, async () => {
      expect(await resolver.resolve(phrase)).toBeNull()
    })
  }

  for (const phrase of NEAR_MISS_ROWS) {
    it(`near-miss: "${phrase}" → never a silent match`, async () => {
      const outcome = await resolver.resolve(phrase)
      expect(outcome?.kind).not.toBe('match')
    })
  }
})

describe('threshold calibration', () => {
  it('documents the headroom of DEFAULT_THRESHOLD / DEFAULT_MARGIN', async () => {
    const examples = INTENT_BANK.flatMap((t) => t.examples)
    const groups = INTENT_BANK.flatMap((t, g) => t.examples.map(() => g))
    const bankVectors = await embed(examples)

    const positiveScores: number[] = []
    const positiveGaps: number[] = []
    for (const [phrase] of POSITIVE_ROWS) {
      const [q] = await embed([phrase])
      const m = matchIntent(q, bankVectors, groups, { threshold: 0, margin: 0 })
      positiveScores.push(m!.score)
      positiveGaps.push(m!.margin)
    }
    const bestScoreFor = async (phrase: string): Promise<number> => {
      const [q] = await embed([phrase])
      let best = -Infinity
      for (const v of bankVectors) best = Math.max(best, cosineSimilarity(q, v))
      return best
    }
    const hardNegativeScores = await Promise.all(HARD_NEGATIVE_ROWS.map(bestScoreFor))
    const nearMissScores = await Promise.all(NEAR_MISS_ROWS.map(bestScoreFor))

    const minPositive = Math.min(...positiveScores)
    const minGap = Math.min(...positiveGaps)
    const maxHardNegative = Math.max(...hardNegativeScores)
    const maxNearMiss = Math.max(...nearMissScores)
    // eslint-disable-next-line no-console
    console.log(
      `[calibration] positives: min=${minPositive.toFixed(3)} minGap=${minGap.toFixed(3)} ` +
        `| hard negatives: max=${maxHardNegative.toFixed(3)} | near misses: max=${maxNearMiss.toFixed(3)} ` +
        `| threshold=${DEFAULT_THRESHOLD} margin=${DEFAULT_MARGIN} suggest=${SUGGEST_THRESHOLD}`,
    )

    // Every accepted paraphrase needs headroom above both accept gates; hard
    // negatives must sit below the suggest floor (no spurious "did you
    // mean"); near misses must at least stay out of silent-accept territory.
    // If any fails, tune the constants or the example bank HERE — this test
    // is the calibration record.
    expect(minPositive).toBeGreaterThan(DEFAULT_THRESHOLD)
    expect(minGap).toBeGreaterThan(DEFAULT_MARGIN)
    expect(maxHardNegative).toBeLessThan(SUGGEST_THRESHOLD)
    expect(maxNearMiss).toBeLessThan(DEFAULT_THRESHOLD)
  }, 120_000)
})
