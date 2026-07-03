import { describe, expect, it } from 'vitest'
import { allScales } from '../lib/theory/scales'
import { CHORD_QUALITIES, inversionsFor } from '../lib/theory/chords'
import { scaleFingerings } from '../lib/data/scaleFingerings'
import { chordFingering } from '../lib/data/chordFingerings'

describe('scale fingerings', () => {
  it('every scale in the library has a fingering', () => {
    for (const s of allScales()) {
      expect(scaleFingerings[s.id], `missing fingering for ${s.id}`).toBeDefined()
    }
  })

  it('fingerings are 8 valid fingers per hand', () => {
    for (const [id, f] of Object.entries(scaleFingerings)) {
      for (const hand of [f.rh, f.lh]) {
        expect(hand, id).toHaveLength(8)
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
