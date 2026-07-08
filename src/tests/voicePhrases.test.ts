import { describe, expect, it } from 'vitest'
import { allLessons } from '../lib/data/lessons'
import { buildGrammar, normalizeTranscript, parseTranscript, WAKE_WORD } from '../lib/voice/parser'
import { expandPhrase, SCOPE_PHRASES, SPOKEN_HELP_EXAMPLES } from '../lib/voice/phrases'

/**
 * The mimicry invariant (ACIxD: users parrot the prompts they hear/see).
 * Every phrase we advertise — in the HUD command list or spoken by the help
 * command — must (a) parse to a real intent and (b) survive grammar-
 * constrained decoding, or the advertised phrase can never work.
 */

const grammar = new Set(buildGrammar(allLessons()))

const allVariants: { scope: string; variant: string }[] = Object.entries(SCOPE_PHRASES).flatMap(
  ([scope, phrases]) =>
    phrases.flatMap((phrase) => expandPhrase(phrase).map((variant) => ({ scope, variant }))),
)

describe('expandPhrase', () => {
  it('splits slash alternatives and trims', () => {
    expect(expandPhrase('slower / faster')).toEqual(['slower', 'faster'])
    expect(expandPhrase('left hand')).toEqual(['left hand'])
  })
})

describe('every advertised phrase parses to a real intent', () => {
  for (const { scope, variant } of allVariants) {
    it(`${scope}: "${variant}"`, () => {
      const intent = parseTranscript(`${WAKE_WORD} ${variant}`)
      expect(intent).not.toBeNull()
      expect(intent!.kind).not.toBe('unknown')
    })
  }
})

describe('every advertised word survives the Vosk grammar', () => {
  const texts = [
    ...allVariants.map(({ variant }) => variant),
    ...SPOKEN_HELP_EXAMPLES,
  ]
  for (const text of texts) {
    it(`"${text}"`, () => {
      for (const word of normalizeTranscript(text).split(' ').filter(Boolean)) {
        expect(grammar, `word "${word}" of "${text}" missing from grammar`).toContain(word)
      }
    })
  }
})

describe('spoken help examples', () => {
  it('has at most two (three or more sounds like a menu)', () => {
    expect(SPOKEN_HELP_EXAMPLES.length).toBeLessThanOrEqual(2)
  })

  it('each example parses to a real intent', () => {
    for (const example of SPOKEN_HELP_EXAMPLES) {
      expect(parseTranscript(`${WAKE_WORD} ${example}`)).not.toMatchObject({ kind: 'unknown' })
    }
  })
})

describe('phrases never contain the wake word', () => {
  // The HUD prefixes "piano, " itself, and spoken strings that contain the
  // wake word could re-trigger recognition through the speakers (tts.ts).
  it('scope phrases and help examples are wake-word-free', () => {
    for (const { variant } of allVariants) {
      expect(variant.toLowerCase()).not.toContain(WAKE_WORD)
    }
    for (const example of SPOKEN_HELP_EXAMPLES) {
      expect(example.toLowerCase()).not.toContain(WAKE_WORD)
    }
  })
})
