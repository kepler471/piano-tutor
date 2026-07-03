import { describe, expect, it } from 'vitest'
import { StepMatcher } from '../lib/practice/matcher'
import type { LessonStep } from '../lib/data/lessons'
import { allLessons, makeSightReadingLesson } from '../lib/data/lessons'

const mel = (...midis: number[]): LessonStep[] => midis.map((m) => ({ midis: [m], fingers: [1] }))

describe('StepMatcher (melodic)', () => {
  it('advances on correct notes and completes', () => {
    const m = new StepMatcher(mel(60, 62, 64))
    expect(m.onOnset(60)).toEqual({ advanced: true, wrong: false, done: false })
    expect(m.onOnset(62).advanced).toBe(true)
    expect(m.onOnset(64).done).toBe(true)
    expect(m.results).toEqual(['correct', 'correct', 'correct'])
    expect(m.mistakes).toBe(0)
  })

  it('waits on wrong notes without advancing', () => {
    const m = new StepMatcher(mel(60, 62))
    expect(m.onOnset(61)).toEqual({ advanced: false, wrong: true, done: false })
    expect(m.cursor).toBe(0)
    expect(m.onOnset(60).advanced).toBe(true)
    expect(m.results[0]).toBe('corrected')
    expect(m.mistakes).toBe(1)
  })

  it('ignores onsets after completion', () => {
    const m = new StepMatcher(mel(60))
    m.onOnset(60)
    expect(m.onOnset(99)).toEqual({ advanced: false, wrong: false, done: true })
    expect(m.mistakes).toBe(0)
  })
})

describe('StepMatcher (chords)', () => {
  const chord: LessonStep[] = [{ midis: [60, 64, 67], fingers: [1, 3, 5] }]

  it('collects chord tones in any order before advancing', () => {
    const m = new StepMatcher(chord)
    expect(m.onOnset(64).advanced).toBe(false)
    expect(m.remaining).toEqual(new Set([60, 67]))
    expect(m.onOnset(60).advanced).toBe(false)
    expect(m.onOnset(67).done).toBe(true)
    expect(m.results[0]).toBe('correct')
  })

  it('flags notes outside the chord', () => {
    const m = new StepMatcher(chord)
    expect(m.onOnset(62).wrong).toBe(true)
    expect(m.remaining).toEqual(new Set([60, 64, 67]))
  })
})

describe('lesson content sanity', () => {
  it('all lessons have segments with valid steps and fingers', () => {
    for (const lesson of [...allLessons(), makeSightReadingLesson()]) {
      expect(lesson.segments.length).toBeGreaterThan(0)
      for (const seg of lesson.segments) {
        expect(seg.steps.length).toBeGreaterThan(0)
        for (const step of seg.steps) {
          expect(step.midis.length).toBe(step.fingers.length)
          for (const midi of step.midis) {
            expect(midi).toBeGreaterThanOrEqual(21)
            expect(midi).toBeLessThanOrEqual(108)
          }
          for (const f of step.fingers) {
            if (f !== null) {
              expect(f).toBeGreaterThanOrEqual(1)
              expect(f).toBeLessThanOrEqual(5)
            }
          }
        }
      }
    }
  })

  it('Hanon bar 1 is the canonical C-E-F-G-A-G-F-E', () => {
    const hanon = allLessons().find((l) => l.id === 'hanon-1')!
    const rhBar1 = hanon.segments[0].steps.slice(0, 8).map((s) => s.midis[0])
    expect(rhBar1).toEqual([60, 64, 65, 67, 69, 67, 65, 64])
  })

  it('cadence voicings are I root, IV 2nd inv, V 1st inv in C', () => {
    const cadence = allLessons().find((l) => l.id === 'cadence-C')!
    const rh = cadence.segments[0].steps.map((s) => s.midis)
    expect(rh[0]).toEqual([60, 64, 67]) // C E G
    expect(rh[1]).toEqual([60, 65, 69]) // C F A
    expect(rh[2]).toEqual([59, 62, 67]) // B D G
    expect(rh[3]).toEqual([60, 64, 67])
  })
})
