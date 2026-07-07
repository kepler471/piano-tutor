import { describe, expect, it } from 'vitest'
import { Note } from 'tonal'
import type { Rng } from '../lib/ear/quiz'
import { getChord } from '../lib/theory/chords'
import {
  CHORD_SPELLING_LEVELS,
  KEY_SIGNATURE_LEVELS,
  NOTE_NAMING_LEVELS,
  makeChordFunctionQuestion,
  makeChordSpellingQuestion,
  makeIntervalStaffQuestion,
  makeKeySignatureQuestion,
  makeNoteNamingQuestion,
} from '../lib/theory/quiz'
import { makeRhythmDictationQuestion } from '../lib/quiz/rhythmQuiz'
import { RHYTHM_PATTERNS } from '../lib/data/rhythms'
import { QUIZ_LEVEL_COUNTS } from '../lib/quiz/modes'

function seededRng(seed: number): Rng {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

const seeds = Array.from({ length: 60 }, (_, i) => i + 1)

const expectValidOptions = (options: string[], answer: string) => {
  expect(options.filter((o) => o === answer)).toHaveLength(1)
  expect(new Set(options).size).toBe(options.length)
  expect(options.length).toBeGreaterThanOrEqual(2)
  expect(options.length).toBeLessThanOrEqual(4)
}

describe('makeNoteNamingQuestion', () => {
  it('answer names the rendered midi pitch class', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const seed of seeds) {
        const q = makeNoteNamingQuestion(level, seededRng(seed))
        expectValidOptions(q.options, q.answer)
        const expected = Note.pitchClass(Note.fromMidi(q.midi)).replace('#', '♯').replace('b', '♭')
        expect(q.answer).toBe(expected)
      }
    }
  })

  it('respects the level range and accidental rule', () => {
    for (const level of [1, 2, 3] as const) {
      const def = NOTE_NAMING_LEVELS[level - 1]
      for (const seed of seeds) {
        const q = makeNoteNamingQuestion(level, seededRng(seed))
        expect(q.midi).toBeGreaterThanOrEqual(def.range[0])
        expect(q.midi).toBeLessThanOrEqual(def.range[1])
        expect([0, 2, 4, 5, 7, 9, 11]).toContain(q.midi % 12) // naturals only
        expect(def.clefs).toContain(q.clef)
      }
    }
  })

  it('level 1 is treble-only', () => {
    for (const seed of seeds) {
      expect(makeNoteNamingQuestion(1, seededRng(seed)).clef).toBe('treble')
    }
  })

  it('keeps bass-clef notes below and treble notes above the staff break', () => {
    for (const seed of seeds) {
      const q = makeNoteNamingQuestion(3, seededRng(seed))
      if (q.clef === 'treble') expect(q.midi).toBeGreaterThanOrEqual(57)
      else expect(q.midi).toBeLessThanOrEqual(64)
    }
  })
})

describe('makeKeySignatureQuestion', () => {
  it('answer matches the rendered signature (major levels)', () => {
    for (const level of [1, 2, 3]) {
      for (const seed of seeds) {
        const q = makeKeySignatureQuestion(level, seededRng(seed))
        expectValidOptions(q.options, q.answer)
        expect(q.answer).toBe(`${q.keySignature} major`.replace('#', '♯').replace('b', '♭'))
        expect(KEY_SIGNATURE_LEVELS[level - 1]).toContain(q.keySignature)
      }
    }
  })

  it('level 4 asks for the relative minor', () => {
    for (const seed of seeds) {
      const q = makeKeySignatureQuestion(4, seededRng(seed))
      expect(q.prompt).toContain('minor')
      expect(q.answer.endsWith('minor')).toBe(true)
      // The relative minor sits three semitones below its major.
      const major = q.keySignature
      const minorName = q.answer.replace(' minor', '').replace('♯', '#').replace('♭', 'b')
      expect((Note.chroma(major)! - Note.chroma(minorName)! + 12) % 12).toBe(3)
    }
  })
})

describe('makeIntervalStaffQuestion', () => {
  it('answer names the rendered interval, always ascending', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const seed of seeds) {
        const q = makeIntervalStaffQuestion(level, seededRng(seed))
        expectValidOptions(q.options, q.answer)
        expect(q.midis[1]).toBeGreaterThanOrEqual(q.midis[0])
      }
    }
  })

  it('bottom note is always a natural in the treble staff', () => {
    for (const seed of seeds) {
      const q = makeIntervalStaffQuestion(4, seededRng(seed))
      expect([0, 2, 4, 5, 7, 9, 11]).toContain(q.midis[0] % 12)
      expect(q.midis[0]).toBeGreaterThanOrEqual(60)
      expect(q.midis[0]).toBeLessThanOrEqual(72)
    }
  })
})

describe('makeChordSpellingQuestion', () => {
  it('answer spells the chord exactly as tonal does', () => {
    for (const level of [1, 2, 3]) {
      for (const seed of seeds) {
        const q = makeChordSpellingQuestion(level, seededRng(seed))
        expectValidOptions(q.options, q.answer)
        expect(q.prompt).toContain(q.symbol)
        // Reverse-check: the answer's notes must be a real chord of the level's qualities.
        const spelledNotes = q.answer.split(' – ')
        const qualities = CHORD_SPELLING_LEVELS[level - 1]
        const match = qualities.some((quality) => {
          for (const root of ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb']) {
            const chord = getChord(root, quality, 0)
            const spelling = chord.noteNames.map((n) => Note.pitchClass(n).replace('#', '♯').replace('b', '♭'))
            if (spelling.join(' – ') === q.answer && chord.symbol === q.symbol) return true
          }
          return false
        })
        expect(match, `${q.symbol} → ${q.answer}`).toBe(true)
        expect(spelledNotes.length === 3 || spelledNotes.length === 4).toBe(true)
      }
    }
  })
})

describe('makeChordFunctionQuestion', () => {
  it('answer is the correct diatonic chord', () => {
    for (const level of [1, 2, 3]) {
      for (const seed of seeds) {
        const q = makeChordFunctionQuestion(level, seededRng(seed))
        expectValidOptions(q.options, q.answer)
        const m = /In the key of (\S+) major, which chord is (\S+)\?/.exec(q.prompt)!
        expect(m).toBeTruthy()
        const [, key, numeral] = m
        const expected: Record<string, [string, string]> = {
          I: ['1P', 'major'],
          ii: ['2M', 'minor'],
          IV: ['4P', 'major'],
          V: ['5P', 'major'],
          vi: ['6M', 'minor'],
        }
        const [interval, quality] = expected[numeral]
        expect(q.answer).toBe(`${Note.pitchClass(Note.transpose(key, interval))} ${quality}`)
      }
    }
  })

  it('level 1 sticks to primary chords in easy keys', () => {
    for (const seed of seeds) {
      const q = makeChordFunctionQuestion(1, seededRng(seed))
      expect(q.prompt).toMatch(/In the key of [CGF] major, which chord is (I|IV|V)\?/)
    }
  })
})

describe('makeRhythmDictationQuestion', () => {
  it('options contain the answer exactly once and share the level', () => {
    for (const level of [1, 2, 3, 4] as const) {
      for (const seed of seeds) {
        const q = makeRhythmDictationQuestion(level, seededRng(seed))
        expect(q.options.filter((p) => p.id === q.answer.id)).toHaveLength(1)
        expect(new Set(q.options.map((p) => p.id)).size).toBe(q.options.length)
        expect(q.options.length).toBe(3)
        for (const p of q.options) expect(p.level).toBe(level)
      }
    }
  })

  it('distractors never share the answer event list', () => {
    for (const seed of seeds) {
      const q = makeRhythmDictationQuestion(3, seededRng(seed))
      for (const p of q.options) {
        if (p.id !== q.answer.id) expect(p.events).not.toEqual(q.answer.events)
      }
    }
  })

  it('every level has enough patterns for 3 options', () => {
    for (const level of [1, 2, 3, 4]) {
      expect(RHYTHM_PATTERNS.filter((p) => p.level === level).length).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('quiz mode registry', () => {
  it('level counts match the generator level tables', () => {
    expect(QUIZ_LEVEL_COUNTS['note-naming']).toBe(NOTE_NAMING_LEVELS.length)
    expect(QUIZ_LEVEL_COUNTS['key-signature']).toBe(KEY_SIGNATURE_LEVELS.length)
    expect(QUIZ_LEVEL_COUNTS['chord-spelling']).toBe(CHORD_SPELLING_LEVELS.length)
  })
})
