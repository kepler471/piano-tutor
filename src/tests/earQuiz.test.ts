import { describe, expect, it } from 'vitest'
import {
  CADENCE_LEVEL_DEFS,
  CADENCE_LEVELS,
  ECHO_LEVELS,
  ECHO_POSITIONS,
  SCALE_TYPE_LABELS,
  SCALE_TYPE_ROOTS_BY_LEVEL,
  INTERVAL_EXPLANATIONS,
  INTERVAL_LABELS,
  INTERVAL_LEVEL_DEFS,
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
    for (let level = 1; level <= INTERVAL_LEVEL_DEFS.length; level++) {
      for (const seed of seeds) {
        const q = makeIntervalQuestion(level, seededRng(seed))
        const semitones = Math.abs(q.midis[1] - q.midis[0])
        expect(INTERVAL_LEVEL_DEFS[level - 1].set).toContain(semitones)
      }
    }
  })

  it('levels 1–4 keep the original melodic sets (saved progress stays meaningful)', () => {
    expect(INTERVAL_LEVEL_DEFS.slice(0, 4).map((d) => d.set)).toEqual(INTERVAL_LEVELS)
    for (const d of INTERVAL_LEVEL_DEFS.slice(0, 4)) expect(d.playback).toBe('melodic')
  })

  it('stays in a comfortable playback range', () => {
    for (let level = 1; level <= INTERVAL_LEVEL_DEFS.length; level++) {
      for (const seed of seeds) {
        const q = makeIntervalQuestion(level, seededRng(seed))
        for (const m of q.midis) {
          expect(m).toBeGreaterThanOrEqual(43) // G2
          expect(m).toBeLessThanOrEqual(79) // G5
        }
      }
    }
  })

  it('levels 1–4 stay melodic; level 5 is always harmonic and never a unison', () => {
    for (const seed of seeds) {
      for (const level of [1, 2, 3, 4]) {
        expect(makeIntervalQuestion(level, seededRng(seed)).harmonic).toBe(false)
      }
      const q = makeIntervalQuestion(5, seededRng(seed))
      expect(q.harmonic).toBe(true)
      // Two distinct notes, stacked upward, so they can sound together.
      expect(q.midis[1]).toBeGreaterThan(q.midis[0])
    }
  })

  it('level 6 mixes melodic and harmonic questions', () => {
    const kinds = new Set(seeds.map((seed) => makeIntervalQuestion(6, seededRng(seed)).harmonic))
    expect(kinds).toEqual(new Set([true, false]))
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

  it('levels 1–4 stay in root position (explanations never mention a voicing)', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const seed of seeds) {
        expect(makeChordQuestion(level, seededRng(seed)).explanation).not.toContain('voiced in')
      }
    }
  })

  it('levels 5+ use inversions but keep 3–4 ascending midis and determinism', () => {
    for (const level of [5, 6]) {
      for (const seed of seeds) {
        const q = makeChordQuestion(level, seededRng(seed))
        expect(q.midis.length === 3 || q.midis.length === 4).toBe(true)
        for (let i = 1; i < q.midis.length; i++) expect(q.midis[i]).toBeGreaterThan(q.midis[i - 1])
      }
    }
    expect(makeChordQuestion(5, seededRng(3))).toEqual(makeChordQuestion(5, seededRng(3)))
    // Across seeds, at least one question is genuinely inverted.
    expect(seeds.some((seed) => makeChordQuestion(5, seededRng(seed)).explanation.includes('voiced in'))).toBe(true)
  })
})

describe('makeEchoQuestion', () => {
  it('starts on the position root and stays inside the five-finger position', () => {
    for (let level = 1; level <= ECHO_LEVELS.length; level++) {
      const def = ECHO_LEVELS[level - 1]
      for (const seed of seeds) {
        const q = makeEchoQuestion(level, seededRng(seed))
        const root = ECHO_POSITIONS[q.positionLabel]
        expect(q.midis[0]).toBe(root)
        for (const m of q.midis) expect(def.offsets).toContain(m - root)
      }
    }
  })

  it('levels 1–3 keep the original major-pentascale positions and lengths', () => {
    expect(ECHO_LEVELS.slice(0, 3)).toEqual([
      { positions: ['C position'], minLen: 3, maxLen: 4, offsets: [0, 2, 4, 5, 7] },
      { positions: ['C position', 'G position', 'F position'], minLen: 4, maxLen: 5, offsets: [0, 2, 4, 5, 7] },
      {
        positions: ['C position', 'G position', 'F position', 'D position'],
        minLen: 5,
        maxLen: 6,
        offsets: [0, 2, 4, 5, 7],
      },
    ])
  })

  it('level 5 uses minor pentascale positions', () => {
    for (const seed of seeds) {
      const q = makeEchoQuestion(5, seededRng(seed))
      expect(q.positionLabel).toContain('minor')
    }
  })

  it('respects the level phrase length and position pool', () => {
    for (let level = 1; level <= ECHO_LEVELS.length; level++) {
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
    for (const level of [3, ECHO_LEVELS.length]) {
      for (const seed of seeds) {
        const q = makeEchoQuestion(level, seededRng(seed))
        for (let i = 1; i < q.midis.length; i++) expect(q.midis[i]).not.toBe(q.midis[i - 1])
      }
    }
  })
})

describe('makeScaleTypeQuestion', () => {
  it('answer is in unique options drawn from the level set', () => {
    for (let level = 1; level <= SCALE_TYPE_LEVELS.length; level++) {
      const labels = new Set(SCALE_TYPE_LEVELS[level - 1].map((t) => SCALE_TYPE_LABELS[t]))
      for (const seed of seeds) {
        const q = makeScaleTypeQuestion(level, seededRng(seed))
        expect(q.options.filter((o) => o === q.answer)).toHaveLength(1)
        expect(new Set(q.options).size).toBe(q.options.length)
        expect(labels.has(q.answer), q.answer).toBe(true)
      }
    }
  })

  it('levels 1–4 keep the original C/G/F roots; top levels widen', () => {
    for (const roots of SCALE_TYPE_ROOTS_BY_LEVEL.slice(0, 4)) expect(roots).toEqual(['C', 'G', 'F'])
    expect(SCALE_TYPE_ROOTS_BY_LEVEL.length).toBe(SCALE_TYPE_LEVELS.length)
    expect(SCALE_TYPE_ROOTS_BY_LEVEL[SCALE_TYPE_LEVELS.length - 1].length).toBeGreaterThan(3)
  })

  it('plays an ascending scale at every level', () => {
    for (let level = 1; level <= SCALE_TYPE_LEVELS.length; level++) {
      for (const seed of seeds) {
        const q = makeScaleTypeQuestion(level, seededRng(seed))
        expect(q.midis.length).toBeGreaterThanOrEqual(6)
        for (let i = 1; i < q.midis.length; i++) expect(q.midis[i]).toBeGreaterThan(q.midis[i - 1])
        expect(q.midis[q.midis.length - 1] - q.midis[0]).toBe(12)
      }
    }
  })
})

describe('makeCadenceQuestion', () => {
  it('answer is in unique options from the level set', () => {
    for (let level = 1; level <= CADENCE_LEVEL_DEFS.length; level++) {
      for (const seed of seeds) {
        const q = makeCadenceQuestion(level, seededRng(seed))
        expect(q.options.filter((o) => o === q.answer)).toHaveLength(1)
        expect(new Set(q.options).size).toBe(q.options.length)
        expect(q.options.length).toBe(CADENCE_LEVELS[level - 1].length)
      }
    }
  })

  it('levels 1–3 stay in major keys with the original cadence sets', () => {
    expect(CADENCE_LEVELS.slice(0, 3)).toEqual([
      ['authentic', 'plagal'],
      ['authentic', 'plagal', 'half'],
      ['authentic', 'plagal', 'half', 'deceptive'],
    ])
    for (const def of CADENCE_LEVEL_DEFS.slice(0, 3)) expect(def.modes).toEqual(['major'])
  })

  it('level 4 plays minor-key cadences that still match their labels', () => {
    for (const seed of seeds) {
      const q = makeCadenceQuestion(4, seededRng(seed))
      const tonicChord = q.chords[0]
      // Root-position minor triad establishes the key.
      expect(tonicChord[1] - tonicChord[0]).toBe(3)
      expect(tonicChord[2] - tonicChord[0]).toBe(7)
      const last = q.chords[q.chords.length - 1]
      if (q.answer.startsWith('Perfect') || q.answer.startsWith('Plagal')) {
        expect(last).toEqual(tonicChord)
      } else {
        expect(last).not.toEqual(tonicChord)
      }
      expect(q.explanation).toContain('minor')
    }
  })

  it('level 5 mixes major and minor keys', () => {
    const thirds = new Set(
      seeds.map((seed) => {
        const q = makeCadenceQuestion(5, seededRng(seed))
        return q.chords[0][1] - q.chords[0][0]
      }),
    )
    expect(thirds).toEqual(new Set([3, 4]))
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
