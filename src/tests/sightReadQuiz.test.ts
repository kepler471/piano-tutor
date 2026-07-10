import { describe, expect, it } from 'vitest'
import { makeSightReadQuestion } from '../lib/quiz/sightReadQuiz'

describe('makeSightReadQuestion', () => {
  it('returns a non-empty single-line phrase with real midis for levels 1–4', () => {
    for (const level of [1, 2, 3, 4]) {
      const q = makeSightReadQuestion(level)
      expect(q.kind).toBe('sight-read')
      expect(['treble', 'bass']).toContain(q.clef)
      expect(q.keySignature).toBeTruthy()
      expect(q.steps.length).toBeGreaterThan(0)
      for (const step of q.steps) {
        expect(step.midis.length).toBeGreaterThan(0)
        for (const m of step.midis) expect(m).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('clamps out-of-range levels into 1–4 (never the poly grand-staff level 5)', () => {
    expect(makeSightReadQuestion(0).clef).not.toBe('grand')
    expect(makeSightReadQuestion(9).clef).not.toBe('grand')
    // Level 5's grand staff would have hands on both clefs; capping keeps us single-line.
    for (const level of [5, 6, 10]) {
      const q = makeSightReadQuestion(level)
      expect(['treble', 'bass']).toContain(q.clef)
    }
  })

  it('is deterministic under a fixed seed', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const seed of [7, 42, 1234]) {
        const a = makeSightReadQuestion(level, seed)
        const b = makeSightReadQuestion(level, seed)
        expect(a.steps).toEqual(b.steps)
        expect(a.keySignature).toBe(b.keySignature)
        expect(a.clef).toBe(b.clef)
      }
    }
  })
})
