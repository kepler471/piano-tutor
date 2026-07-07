import { describe, expect, it } from 'vitest'
import { Note } from 'tonal'
import { makeSightReading, type SightLevel } from '../lib/sightread/generator'
import { getScale } from '../lib/theory/scales'

const seeds = Array.from({ length: 30 }, (_, i) => i * 7 + 1)
const LEVELS: SightLevel[] = [1, 2, 3, 4, 5]

/** All pitch classes of the lesson's key, as midi mod 12. */
function keyPitchClasses(key: string): Set<number> {
  return new Set(getScale(key, 'major').midi.map((m) => m % 12))
}

describe('makeSightReading', () => {
  it('is deterministic under a fixed seed', () => {
    for (const level of LEVELS) {
      expect(makeSightReading(level, 42)).toEqual(makeSightReading(level, 42))
    }
  })

  it('every note belongs to the key', () => {
    for (const level of LEVELS) {
      for (const seed of seeds) {
        const lesson = makeSightReading(level, seed)
        const pcs = keyPitchClasses(lesson.keySignature)
        for (const step of lesson.segments[0].steps) {
          for (const m of step.midis) {
            expect(pcs.has(m % 12), `${lesson.id}: midi ${m} (${Note.fromMidi(m)}) not in ${lesson.keySignature}`).toBe(true)
          }
        }
      }
    }
  })

  it('rhythms fill exactly two 4/4 bars with valid startBeats', () => {
    for (const level of LEVELS) {
      for (const seed of seeds) {
        const steps = makeSightReading(level, seed).segments[0].steps
        let cursor = 0
        for (const s of steps) {
          expect(s.startBeat, `level ${level} seed ${seed}`).toBeCloseTo(cursor, 5)
          cursor += s.durationBeats!
        }
        expect(cursor, `level ${level} seed ${seed}`).toBe(8)
      }
    }
  })

  it('level 1 stays in the C five-finger position', () => {
    for (const seed of seeds) {
      const lesson = makeSightReading(1, seed)
      expect(lesson.keySignature).toBe('C')
      for (const step of lesson.segments[0].steps) {
        expect(step.midis[0]).toBeGreaterThanOrEqual(60)
        expect(step.midis[0]).toBeLessThanOrEqual(67)
        expect(step.durationBeats).toBe(1)
      }
    }
  })

  it('is a reading lesson: fingering appears only as a first-note position cue', () => {
    for (const level of LEVELS) {
      for (const seed of seeds) {
        const lesson = makeSightReading(level, seed)
        expect(lesson.hints).toBe('reading')
        const steps = lesson.segments[0].steps
        // First step may carry a starting finger; every later step must not.
        for (const step of steps.slice(1)) {
          expect(step.fingers.every((f) => f === null), `${lesson.id}`).toBe(true)
        }
      }
    }
  })

  it('level 3 is a bass-clef left-hand line in low register', () => {
    for (const seed of seeds) {
      const lesson = makeSightReading(3, seed)
      const seg = lesson.segments[0]
      expect(seg.clef).toBe('bass')
      expect(seg.hand).toBe('L')
      for (const step of seg.steps) expect(step.midis[0]).toBeLessThan(60)
    }
  })

  it('level 4 includes eighth or dotted rhythms somewhere across seeds', () => {
    const hasShort = seeds.some((seed) =>
      makeSightReading(4, seed).segments[0].steps.some((s) => s.durationBeats! < 1 || s.durationBeats === 1.5),
    )
    expect(hasShort).toBe(true)
  })

  it('level 5 is grand-staff, both hands, LH anchored on root and fifth', () => {
    for (const seed of seeds) {
      const lesson = makeSightReading(5, seed)
      const seg = lesson.segments[0]
      expect(seg.clef).toBe('grand')
      expect(seg.hand).toBe('both')
      expect(seg.detectionMode).toBe('poly')
      const root = getScale(lesson.keySignature, 'major').midi[0] - 24
      for (const step of seg.steps) {
        expect(step.midis).toHaveLength(2)
        expect(step.hands).toEqual(['L', 'R'])
        expect([root, root + 7]).toContain(step.midis[0])
      }
    }
  })
})
