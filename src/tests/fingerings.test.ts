import { describe, expect, it } from 'vitest'
import { allScales } from '../lib/theory/scales'
import { CHORD_QUALITIES, inversionsFor } from '../lib/theory/chords'
import { scaleFingerings } from '../lib/data/scaleFingerings'
import { chordFingering } from '../lib/data/chordFingerings'
import { scaleRoutineLessons, twoOctaveLh, twoOctaveRh } from '../lib/data/lessons/scaleRoutine'
import { arpeggioLessons, ARPEGGIO_KEYS } from '../lib/data/lessons/arpeggios'
import { brokenChordLessons } from '../lib/data/lessons/brokenChords'

describe('scale fingerings', () => {
  it('every scale in the library has a fingering', () => {
    for (const s of allScales()) {
      expect(scaleFingerings[s.id], `missing fingering for ${s.id}`).toBeDefined()
    }
  })

  it('fingerings cover one octave (scale length + 1) with valid fingers', () => {
    const lengths = new Map(allScales().map((s) => [s.id, s.midi.length]))
    for (const [id, f] of Object.entries(scaleFingerings)) {
      for (const hand of [f.rh, f.lh]) {
        expect(hand.length, id).toBe(lengths.get(id))
        for (const finger of hand) {
          expect(finger).toBeGreaterThanOrEqual(1)
          expect(finger).toBeLessThanOrEqual(5)
        }
      }
    }
  })

  it('C major uses the canonical fingering', () => {
    expect(scaleFingerings['C major'].rh).toEqual([1, 2, 3, 1, 2, 3, 4, 5])
    expect(scaleFingerings['C major'].lh).toEqual([5, 4, 3, 2, 1, 3, 2, 1])
  })

  it('adjacent notes never repeat a finger', () => {
    for (const [id, f] of Object.entries(scaleFingerings)) {
      for (const hand of [f.rh, f.lh]) {
        for (let i = 1; i < hand.length; i++) {
          expect(hand[i], `${id} repeats finger at position ${i}`).not.toBe(hand[i - 1])
        }
      }
    }
  })
})

describe('two-octave fingering expansion', () => {
  it('C major RH continues the pattern across the octave', () => {
    expect(twoOctaveRh([1, 2, 3, 1, 2, 3, 4, 5])).toEqual([1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 5])
  })

  it('C major LH crosses 4 over at the octave', () => {
    expect(twoOctaveLh([5, 4, 3, 2, 1, 3, 2, 1])).toEqual([5, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 3, 2, 1])
  })

  it('expansions have 15 fingers and never repeat adjacent fingers', () => {
    // Two-octave routines exist only for the 7-note scales (8-entry fingerings).
    const sevenNote = Object.entries(scaleFingerings).filter(([, f]) => f.rh.length === 8)
    for (const [id, f] of sevenNote) {
      for (const expanded of [twoOctaveRh(f.rh), twoOctaveLh(f.lh)]) {
        expect(expanded, id).toHaveLength(15)
        for (let i = 1; i < expanded.length; i++) {
          expect(expanded[i], `${id} repeats finger at position ${i}`).not.toBe(expanded[i - 1])
        }
      }
    }
  })
})

describe('technique lesson generators', () => {
  it('scale routine covers 12 majors and 12 harmonic minors with 6 segments each', () => {
    const lessons = scaleRoutineLessons()
    expect(lessons).toHaveLength(24)
    for (const l of lessons) {
      expect(l.segments).toHaveLength(6)
      const together = l.segments.filter((s) => s.hand === 'both')
      expect(together).toHaveLength(2)
      for (const seg of together) {
        expect(seg.clef).toBe('grand')
        expect(seg.detectionMode).toBe('poly')
        for (const step of seg.steps) {
          expect(step.midis).toHaveLength(2)
          expect(step.midis[1] - step.midis[0]).toBe(12) // parallel octaves
          expect(step.hands).toEqual(['L', 'R'])
        }
      }
    }
  })

  it('arpeggio lessons exist for every configured key with valid fingers', () => {
    const lessons = arpeggioLessons()
    expect(lessons).toHaveLength(ARPEGGIO_KEYS.length)
    for (const l of lessons) {
      for (const seg of l.segments) {
        // up-down through 1 octave (4 notes) = 7 steps; 2 octaves (7 notes) = 13
        expect([7, 13]).toContain(seg.steps.length)
        for (const step of seg.steps) {
          expect(step.fingers[0]).toBeGreaterThanOrEqual(1)
          expect(step.fingers[0]).toBeLessThanOrEqual(5)
        }
      }
    }
  })

  it('broken chords walk each inversion up and down', () => {
    for (const l of brokenChordLessons()) {
      for (const seg of l.segments) {
        expect(seg.steps).toHaveLength(15) // 3 inversions × 5 steps
        for (let inv = 0; inv < 3; inv++) {
          const group = seg.steps.slice(inv * 5, inv * 5 + 5)
          expect(group[0].midis[0]).toBe(group[4].midis[0]) // returns to start
          expect(group[1].midis[0]).toBe(group[3].midis[0])
        }
      }
    }
  })
})

describe('chord fingerings', () => {
  it('every quality and inversion has a fingering of the right size', () => {
    for (const q of CHORD_QUALITIES) {
      for (const inv of inversionsFor(q.id)) {
        const f = chordFingering(q.size, inv)
        expect(f.rh).toHaveLength(q.size)
        expect(f.lh).toHaveLength(q.size)
      }
    }
  })
})
