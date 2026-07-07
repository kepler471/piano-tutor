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
 * Must NOT match anything: gibberish, off-domain, and near-misses. These may
 * use open vocabulary — the open-vocab Vosk fallback path exists, and the
 * matcher must reject whatever reaches it.
 */
const NEGATIVE_ROWS: string[] = [
  'purple monkey dishwasher',
  'the weather is nice today',
  'what time is it',
  'i like this piano',
  'that sounds nice',
  'my hands are tired',
  'this song is really hard',
  'my sister plays the violin',
  'turn on the kitchen lights',
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
      expect(await resolver.resolve(phrase)).toMatchObject(expected)
    })
  }
})

describe('adversarial negatives (real model)', () => {
  for (const phrase of NEGATIVE_ROWS) {
    it(`"${phrase}" → null`, async () => {
      expect(await resolver.resolve(phrase)).toBeNull()
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
    const negativeScores: number[] = []
    for (const phrase of NEGATIVE_ROWS) {
      const [q] = await embed([phrase])
      let best = -Infinity
      for (const v of bankVectors) best = Math.max(best, cosineSimilarity(q, v))
      negativeScores.push(best)
    }

    const minPositive = Math.min(...positiveScores)
    const minGap = Math.min(...positiveGaps)
    const maxNegative = Math.max(...negativeScores)
    // eslint-disable-next-line no-console
    console.log(
      `[calibration] positives: min=${minPositive.toFixed(3)} minGap=${minGap.toFixed(3)} ` +
        `| negatives: max=${maxNegative.toFixed(3)} ` +
        `| threshold=${DEFAULT_THRESHOLD} margin=${DEFAULT_MARGIN}`,
    )

    // Every accepted paraphrase needs headroom above both gates; every
    // negative must sit safely below the threshold. If either fails, tune the
    // constants or the example bank HERE — this test is the calibration record.
    expect(minPositive).toBeGreaterThan(DEFAULT_THRESHOLD)
    expect(minGap).toBeGreaterThan(DEFAULT_MARGIN)
    expect(maxNegative).toBeLessThan(DEFAULT_THRESHOLD)
  }, 120_000)
})
