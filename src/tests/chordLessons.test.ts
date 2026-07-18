import { describe, expect, it } from 'vitest'
import { allLessons } from '../lib/data/lessons'
import { accompanimentLessons } from '../lib/data/lessons/accompaniment'
import { diatonicLessons } from '../lib/data/lessons/diatonic'
import { inversionLessons } from '../lib/data/lessons/inversions'
import { chordProgressionLessons } from '../lib/data/lessons/progressions'
import { seventhLessons } from '../lib/data/lessons/sevenths'
import { triadLessons } from '../lib/data/lessons/triads'

const chordPathLessons = () => [
  ...triadLessons(),
  ...inversionLessons(),
  ...diatonicLessons(),
  ...chordProgressionLessons(),
  ...seventhLessons(),
  ...accompanimentLessons(),
]

describe('chord path lessons', () => {
  it('are all registered in allLessons with unique ids', () => {
    const all = allLessons().map((l) => l.id)
    expect(new Set(all).size).toBe(all.length)
    for (const lesson of chordPathLessons()) {
      expect(all).toContain(lesson.id)
    }
  })

  it('every step is well-formed: fingers match midis, notes in piano range', () => {
    for (const lesson of chordPathLessons()) {
      for (const segment of lesson.segments) {
        expect(segment.steps.length).toBeGreaterThan(0)
        for (const step of segment.steps) {
          expect(step.fingers.length).toBe(step.midis.length)
          if (step.hands) expect(step.hands.length).toBe(step.midis.length)
          for (const midi of step.midis) {
            expect(midi).toBeGreaterThanOrEqual(21)
            expect(midi).toBeLessThanOrEqual(108)
          }
        }
      }
    }
  })

  it('chordal lessons are poly; melodic pattern drills are mono', () => {
    const byId = new Map(chordPathLessons().map((l) => [l.id, l]))
    for (const id of ['triad-blocks-majors', 'inversion-ladder-C', 'diatonic-triads-C', 'cadence-types-C', 'prog-pop-C', 'sevenths-blocks-C', 'accomp-block-C', 'lead-sheet-capstone']) {
      expect(byId.get(id)?.detectionMode).toBe('poly')
    }
    for (const id of ['accomp-broken-C', 'accomp-alberti-C']) {
      expect(byId.get(id)?.detectionMode).toBe('mono')
      for (const seg of byId.get(id)!.segments) {
        for (const step of seg.steps) expect(step.midis.length).toBe(1)
      }
    }
  })

  it('keeps chord steps within a graded hand span (max 5 notes, one octave-and-a-bit)', () => {
    for (const lesson of chordPathLessons()) {
      for (const segment of lesson.segments) {
        for (const step of segment.steps) {
          if (step.hands) continue // hands-together steps span two hands
          expect(step.midis.length).toBeLessThanOrEqual(5)
          if (step.midis.length > 1) {
            expect(Math.max(...step.midis) - Math.min(...step.midis)).toBeLessThanOrEqual(14)
          }
        }
      }
    }
  })

  it('voice-leads progressions smoothly: no voice leaps over a 4th', () => {
    const byId = new Map(chordPathLessons().map((l) => [l.id, l]))
    for (const id of ['prog-pop-C', 'prog-pop-G', 'prog-pop-F', 'prog-50s-C', 'prog-50s-G', 'prog-blues-triads-C']) {
      const steps = byId.get(id)!.segments[0].steps
      for (let i = 1; i < steps.length; i++) {
        const prev = steps[i - 1].midis
        const cur = steps[i].midis
        const jump = Math.max(...cur.map((m, v) => Math.abs(m - prev[v])))
        expect(jump, `${id} step ${i}`).toBeLessThanOrEqual(5)
      }
    }
  })

  it('diatonic triads ascend from the tonic with the right numerals', () => {
    for (const lesson of diatonicLessons()) {
      const steps = lesson.segments[0].steps
      expect(steps.length).toBe(8)
      expect(steps.map((s) => s.label?.split(' ')[0])).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', 'I'])
      for (let i = 1; i < steps.length; i++) {
        expect(steps[i].midis[0]).toBeGreaterThan(steps[i - 1].midis[0])
      }
    }
  })

  it('the V7 resolution drills resolve the tritone inward by semitones', () => {
    for (const lesson of seventhLessons().filter((l) => l.id.startsWith('v7-resolve-'))) {
      const tritone = lesson.segments.find((s) => s.label === 'Tritone only')!
      const [tension, resolved] = tritone.steps
      expect(tension.midis.length).toBe(2)
      expect((tension.midis[1] - tension.midis[0]) % 12).toBe(6) // a tritone apart
      expect(resolved.midis[0] - tension.midis[0]).toBe(1) // leading tone up
      expect(resolved.midis[1] - tension.midis[1]).toBe(-1) // seventh down
    }
  })

  it('the lead-sheet capstone reads from symbols: reading hints, 16 bars, L+R hands', () => {
    const capstone = accompanimentLessons().find((l) => l.id === 'lead-sheet-capstone')!
    expect(capstone.hints).toBe('reading')
    const steps = capstone.segments[0].steps
    expect(steps.length).toBe(16)
    for (const step of steps) {
      expect(step.label).toMatch(/^[A-G][b#]?(7)?$/)
      expect(step.hands?.[0]).toBe('L')
      expect(step.hands?.slice(1).every((h) => h === 'R')).toBe(true)
    }
  })
})
