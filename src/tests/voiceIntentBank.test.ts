import { describe, expect, it } from 'vitest'
import { allLessons } from '../lib/data/lessons'
import { bankGrammarWords, INTENT_BANK } from '../lib/voice/intentBank'
import type { Intent } from '../lib/voice/intents'
import { buildGrammar } from '../lib/voice/parser'

/** What each template must resolve to (kind only; slots vary by transcript). */
const EXPECTED_KIND: Record<string, Intent['kind']> = {
  'nav-home': 'navigate',
  'nav-scales': 'navigate',
  'nav-chords': 'navigate',
  'nav-practice': 'navigate',
  'nav-play': 'navigate',
  'nav-tuner': 'navigate',
  'metronome-start': 'metronome',
  'metronome-stop': 'metronome',
  'bpm-relative': 'set-bpm',
  'bpm-absolute': 'set-bpm',
  'demo-play': 'play-demo',
  'demo-style': 'play-demo',
  'lesson-next': 'lesson',
  'lesson-previous': 'lesson',
  'lesson-restart': 'lesson',
  'lesson-exit': 'lesson',
  'freeplay-record': 'free-play',
  'freeplay-clear': 'free-play',
  'mic-start': 'mic',
  help: 'help',
  'stop-all': 'stop-all',
  'voice-off': 'voice-off',
}

describe('INTENT_BANK structure', () => {
  it('covers exactly the expected templates', () => {
    expect(INTENT_BANK.map((t) => t.id).sort()).toEqual(Object.keys(EXPECTED_KIND).sort())
  })

  it('template ids are unique', () => {
    const ids = INTENT_BANK.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every template has at least 3 examples, lowercase words only', () => {
    for (const t of INTENT_BANK) {
      expect(t.examples.length).toBeGreaterThanOrEqual(3)
      for (const e of t.examples) expect(e).toMatch(/^[a-z]+( [a-z]+)*$/)
    }
  })

  it('no example is shared between templates', () => {
    const all = INTENT_BANK.flatMap((t) => t.examples)
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('INTENT_BANK self-consistency', () => {
  // Every template must resolve its own example phrasings — this drives the
  // real slot extractors against realistic transcripts.
  for (const t of INTENT_BANK) {
    for (const example of t.examples) {
      it(`${t.id}: "${example}"`, () => {
        const intent = t.resolve(example)
        expect(intent).not.toBeNull()
        expect(intent!.kind).toBe(EXPECTED_KIND[t.id])
      })
    }
  }
})

describe('slot resolution from the actual transcript', () => {
  const byId = new Map(INTENT_BANK.map((t) => [t.id, t]))

  it('bpm-absolute reads the spoken number, not the example number', () => {
    expect(byId.get('bpm-absolute')!.resolve('can we go at seventy five')).toEqual({
      kind: 'set-bpm',
      bpm: 75,
    })
    expect(byId.get('bpm-absolute')!.resolve('make it one hundred and ten')).toEqual({
      kind: 'set-bpm',
      bpm: 110,
    })
  })

  it('bpm-absolute without a usable number → null (required slot)', () => {
    expect(byId.get('bpm-absolute')!.resolve('can we go at some point')).toBeNull()
    // 5 is outside the sane BPM range wordsToNumber accepts.
    expect(byId.get('bpm-absolute')!.resolve('make it five')).toBeNull()
  })

  it('metronome-start picks up an optional bpm', () => {
    expect(byId.get('metronome-start')!.resolve('give me a beat at ninety')).toEqual({
      kind: 'metronome',
      action: 'start',
      bpm: 90,
    })
    expect(byId.get('metronome-start')!.resolve('count me in')).toEqual({
      kind: 'metronome',
      action: 'start',
      bpm: undefined,
    })
  })

  it('bpm-relative reads the direction from the transcript', () => {
    expect(byId.get('bpm-relative')!.resolve('can we go much faster')).toEqual({
      kind: 'set-bpm',
      delta: 10,
    })
    expect(byId.get('bpm-relative')!.resolve('take it down a little')).toEqual({
      kind: 'set-bpm',
      delta: -10,
    })
    // No direction word → refuse rather than guess.
    expect(byId.get('bpm-relative')!.resolve('change the pace please')).toBeNull()
  })

  it('demo-style reads the style from the transcript', () => {
    expect(byId.get('demo-style')!.resolve('play them all together')).toEqual({
      kind: 'play-demo',
      variant: 'block',
    })
    expect(byId.get('demo-style')!.resolve('i want it note by note')).toEqual({
      kind: 'play-demo',
      variant: 'arpeggio',
    })
    expect(byId.get('demo-style')!.resolve('play it nicely please')).toBeNull()
  })

  it('fixed templates ignore transcript noise', () => {
    expect(byId.get('nav-chords')!.resolve('umm i want to see the chords')).toEqual({
      kind: 'navigate',
      route: '/chords',
    })
  })
})

describe('grammar coverage invariant', () => {
  // Every bank example must be decodable by the grammar-constrained Vosk
  // recognizer, or the fallback can never receive it.
  const grammar = new Set(buildGrammar(allLessons()))

  for (const t of INTENT_BANK) {
    it(`all words of ${t.id} examples are in the grammar`, () => {
      for (const example of t.examples) {
        for (const word of example.split(' ')) {
          expect(grammar, `"${word}" (from "${example}") missing from grammar`).toContain(word)
        }
      }
    })
  }

  it('bankGrammarWords returns unique normalized words', () => {
    const words = bankGrammarWords()
    expect(new Set(words).size).toBe(words.length)
    for (const w of words) expect(w).toMatch(/^[a-z]+$/)
  })
})
