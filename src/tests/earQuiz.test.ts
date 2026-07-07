import { describe, expect, it } from 'vitest'
import {
  CADENCE_LEVELS,
  ECHO_LEVELS,
  ECHO_POSITIONS,
  INTERVAL_EXPLANATIONS,
  INTERVAL_LABELS,
  INTERVAL_LEVELS,
  SCALE_TYPE_LEVELS,
  makeCadenceQuestion,
  makeChordQuestion,
  makeEchoQuestion,
  makeIntervalQuestion,
  makeScaleTypeQuestion,
  type Rng,
} from '../lib/ear/quiz'

/** Deterministic LCG so every generator path is reproducible. */
function seededRng(seed: number): Rng {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

const seeds = Array.from({ length: 50 }, (_, i) => i + 1)

describe('makeIntervalQuestion', () => {
  it('always includes the answer exactly once among unique options', () => {
    for (const seed of seeds) {
      const q = makeIntervalQuestion(4, seededRng(seed))
      expect(q.options.filter((o) => o === q.answer)).toHaveLength(1)
      expect(new Set(q.options).size).toBe(q.options.length)
      expect(q.options.length).toBeLessThanOrEqual(4)
      expect(q.options.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('keeps the interval inside the level set', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const seed of seeds) {
        const q = makeIntervalQuestion(level, seededRng(seed))
        const semitones = Math.abs(q.midis[1] - q.midis[0])
        expect(INTERVAL_LEVELS[level - 1]).toContain(semitones)
      }
    }
  })

  it('stays in a comfortable playback range', () => {
    for (const seed of seeds) {
      const q = makeIntervalQuestion(4, seededRng(seed))
      for (const m of q.midis) {
        expect(m).toBeGreaterThanOrEqual(43) // G2
        expect(m).toBeLessThanOrEqual(79) // G5
      }
    }
  })

  it('is deterministic under a fixed seed', () => {
    expect(makeIntervalQuestion(3, seededRng(7))).toEqual(makeIntervalQuestion(3, seededRng(7)))
  })

  it('explanation matches the played interval and names its semitone count', () => {
    expect(Object.keys(INTERVAL_EXPLANATIONS).sort()).toEqual(Object.keys(INTERVAL_LABELS).sort())
    for (const level of [1, 2, 3, 4]) {
      for (const seed of seeds) {
        const q = makeIntervalQuestion(level, seededRng(seed))
        const semitones = Math.abs(q.midis[1] - q.midis[0])
        expect(q.explanation).toBe(INTERVAL_EXPLANATIONS[semitones])
        expect(q.explanation).toContain(`${semitones} semitone`)
      }
    }
  })
})

describe('question explanations', () => {
  it('every option-based ear question carries a non-empty explanation', () => {
    for (const seed of seeds) {
      expect(makeIntervalQuestion(4, seededRng(seed)).explanation.length).toBeGreaterThan(20)
      expect(makeChordQuestion(4, seededRng(seed)).explanation.length).toBeGreaterThan(20)
      expect(makeScaleTypeQuestion(4, seededRng(seed)).explanation.length).toBeGreaterThan(20)
      expect(makeCadenceQuestion(3, seededRng(seed)).explanation.length).toBeGreaterThan(20)
    }
  })

  it('cadence explanation restates the answer label', () => {
    for (const seed of seeds) {
      const q = makeCadenceQuestion(3, seededRng(seed))
      // Both the answer and its explanation lead with the same cadence name.
      expect(q.explanation.startsWith(q.answer.split(' ')[0])).toBe(true)
    }
  })
})

describe('makeChordQuestion', () => {
  it('answer is in options and options come from the level set', () => {
    for (const level of [1, 2, 3]) {
      for (const seed of seeds) {
        const q = makeChordQuestion(level, seededRng(seed))
        expect(q.options).toContain(q.answer)
        expect(new Set(q.options).size).toBe(q.options.length)
        expect(q.midis.length === 3 || q.midis.length === 4).toBe(true)
      }
    }
  })

  it('level 1 offers only major and minor', () => {
    for (const seed of seeds) {
      const q = makeChordQuestion(1, seededRng(seed))
      for (const o of q.options) expect(['Major', 'Minor']).toContain(o)
    }
  })

  it('midis ascend', () => {
    for (const seed of seeds) {
      const q = makeChordQuestion(3, seededRng(seed))
      for (let i = 1; i < q.midis.length; i++) expect(q.midis[i]).toBeGreaterThan(q.midis[i - 1])
    }
  })
})

describe('makeEchoQuestion', () => {
  it('starts on the position root and stays inside the five-finger position', () => {
    for (const level of [1, 2, 3]) {
      for (const seed of seeds) {
        const q = makeEchoQuestion(level, seededRng(seed))
        const root = ECHO_POSITIONS[q.positionLabel]
        expect(q.midis[0]).toBe(root)
        for (const m of q.midis) expect([0, 2, 4, 5, 7]).toContain(m - root)
      }
    }
  })

  it('respects the level phrase length and position pool', () => {
    for (const level of [1, 2, 3]) {
      const def = ECHO_LEVELS[level - 1]
      for (const seed of seeds) {
        const q = makeEchoQuestion(level, seededRng(seed))
        expect(q.midis.length).toBeGreaterThanOrEqual(def.minLen)
        expect(q.midis.length).toBeLessThanOrEqual(def.maxLen)
        expect(def.positions).toContain(q.positionLabel)
      }
    }
  })

  it('never repeats a note back-to-back (phrases always move)', () => {
    for (const seed of seeds) {
      const q = makeEchoQuestion(3, seededRng(seed))
      for (let i = 1; i < q.midis.length; i++) expect(q.midis[i]).not.toBe(q.midis[i - 1])
    }
  })
})

describe('makeScaleTypeQuestion', () => {
  it('answer is in unique options drawn from the level set', () => {
    for (const level of [1, 2, 3, 4]) {
      const labels = new Set(
        ['Major', 'Natural minor', 'Harmonic minor', 'Blues', 'Major pentatonic', 'Dorian', 'Mixolydian'].slice(
          0,
          SCALE_TYPE_LEVELS[level - 1].length,
        ),
      )
      for (const seed of seeds) {
        const q = makeScaleTypeQuestion(level, seededRng(seed))
        expect(q.options.filter((o) => o === q.answer)).toHaveLength(1)
        expect(new Set(q.options).size).toBe(q.options.length)
        expect(labels.has(q.answer), q.answer).toBe(true)
      }
    }
  })

  it('plays an ascending scale', () => {
    for (const seed of seeds) {
      const q = makeScaleTypeQuestion(4, seededRng(seed))
      expect(q.midis.length).toBeGreaterThanOrEqual(6)
      for (let i = 1; i < q.midis.length; i++) expect(q.midis[i]).toBeGreaterThan(q.midis[i - 1])
      expect(q.midis[q.midis.length - 1] - q.midis[0]).toBe(12)
    }
  })
})

describe('makeCadenceQuestion', () => {
  it('answer is in unique options from the level set', () => {
    for (const level of [1, 2, 3]) {
      for (const seed of seeds) {
        const q = makeCadenceQuestion(level, seededRng(seed))
        expect(q.options.filter((o) => o === q.answer)).toHaveLength(1)
        expect(new Set(q.options).size).toBe(q.options.length)
        expect(q.options.length).toBe(CADENCE_LEVELS[level - 1].length)
      }
    }
  })

  it('every progression starts on the tonic and matches its label', () => {
    for (const seed of seeds) {
      const q = makeCadenceQuestion(3, seededRng(seed))
      const tonicChord = q.chords[0]
      // Root-position major triad establishes the key.
      expect(tonicChord[1] - tonicChord[0]).toBe(4)
      expect(tonicChord[2] - tonicChord[0]).toBe(7)
      const last = q.chords[q.chords.length - 1]
      if (q.answer.startsWith('Perfect') || q.answer.startsWith('Plagal')) {
        expect(last).toEqual(tonicChord) // ends home
      } else {
        expect(last).not.toEqual(tonicChord) // half/deceptive end away
      }
    }
  })

  it('chords stay in a comfortable register', () => {
    for (const seed of seeds) {
      const q = makeCadenceQuestion(3, seededRng(seed))
      for (const chord of q.chords) {
        for (const m of chord) {
          expect(m).toBeGreaterThanOrEqual(48)
          expect(m).toBeLessThanOrEqual(84)
        }
      }
    }
  })
})
