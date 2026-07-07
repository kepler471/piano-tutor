import { describe, expect, it } from 'vitest'
import { SONG_CATALOG } from '../lib/data/songs/catalog'

/** Structural invariants for the bundled repertoire (hand-written and imported). */

const beatsPerMeasure = (ts: [number, number]) => (ts[0] * 4) / ts[1]

describe('song catalog invariants', () => {
  it('ids are unique and grades ascend through the list', () => {
    const ids = SONG_CATALOG.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (let i = 1; i < SONG_CATALOG.length; i++) {
      expect(SONG_CATALOG[i].grade).toBeGreaterThanOrEqual(SONG_CATALOG[i - 1].grade)
    }
  })

  it('grades are 1–7 and both styles appear at most grades', () => {
    for (const s of SONG_CATALOG) {
      expect(s.grade).toBeGreaterThanOrEqual(1)
      expect(s.grade).toBeLessThanOrEqual(7)
    }
    for (const grade of [1, 2, 3, 4, 5]) {
      expect(SONG_CATALOG.some((s) => s.grade === grade), `grade ${grade} empty`).toBe(true)
    }
  })

  it('every note fits inside its measure', () => {
    for (const song of SONG_CATALOG) {
      const beats = beatsPerMeasure(song.timeSignature)
      song.measures.forEach((measure, i) => {
        for (const n of measure.notes) {
          expect(n.startBeat, `${song.id} bar ${i}`).toBeGreaterThanOrEqual(0)
          expect(n.startBeat + n.durationBeats, `${song.id} bar ${i} midi ${n.midi}`).toBeLessThanOrEqual(
            beats + 1e-6,
          )
          expect(n.durationBeats, `${song.id} bar ${i}`).toBeGreaterThan(0)
          expect(n.midi).toBeGreaterThanOrEqual(21)
          expect(n.midi).toBeLessThanOrEqual(108)
          if (n.finger !== undefined) {
            expect(n.finger).toBeGreaterThanOrEqual(1)
            expect(n.finger).toBeLessThanOrEqual(5)
          }
        }
      })
    }
  })

  it('no duplicate (hand, midi, onset) within a measure', () => {
    for (const song of SONG_CATALOG) {
      song.measures.forEach((measure, i) => {
        const seen = new Set<string>()
        for (const n of measure.notes) {
          const key = `${n.hand}:${n.midi}@${n.startBeat}`
          expect(seen.has(key), `${song.id} bar ${i}: ${key}`).toBe(false)
          seen.add(key)
        }
      })
    }
  })

  it('sections cover valid measure ranges', () => {
    for (const song of SONG_CATALOG) {
      expect(song.sections.length).toBeGreaterThan(0)
      for (const sec of song.sections) {
        expect(sec.fromMeasure).toBeGreaterThanOrEqual(0)
        expect(sec.toMeasure).toBeGreaterThanOrEqual(sec.fromMeasure)
        expect(sec.toMeasure, `${song.id}: ${sec.label}`).toBeLessThan(song.measures.length)
      }
    }
  })

  it('songs use both hands', () => {
    for (const song of SONG_CATALOG) {
      const hands = new Set(song.measures.flatMap((m) => m.notes.map((n) => n.hand)))
      expect(hands.has('R'), song.id).toBe(true)
      expect(hands.has('L'), song.id).toBe(true)
    }
  })
})
