import { describe, expect, it } from 'vitest'
import { gradeTiming, swungBeat, type TimedExpectation } from '../lib/practice/timingGrader'
import { patternToNotation, RHYTHM_PATTERNS } from '../lib/data/rhythms'

// 120 BPM → 500 ms per beat; anchor at 10 000 ms for readable numbers.
const BPM = 120
const ANCHOR = 10_000
const beatMs = (beat: number) => ANCHOR + beat * 500

const grid = (...beats: number[]): TimedExpectation[] => beats.map((startBeat) => ({ startBeat }))

describe('gradeTiming', () => {
  it('rates exact hits perfect', () => {
    const r = gradeTiming(grid(0, 1, 2, 3), [0, 1, 2, 3].map((b) => ({ tMs: beatMs(b) })), BPM, ANCHOR)
    expect(r.hits.map((h) => h.rating)).toEqual(['perfect', 'perfect', 'perfect', 'perfect'])
    expect(r.missed).toEqual([])
    expect(r.extra).toEqual([])
    expect(r.accuracy).toBe(1)
  })

  it('rates within tolerance bands', () => {
    const r = gradeTiming(
      grid(0, 1, 2, 3),
      [
        { tMs: beatMs(0) + 30 }, // perfect (≤40)
        { tMs: beatMs(1) - 80 }, // good (≤100)
        { tMs: beatMs(2) - 150 }, // early
        { tMs: beatMs(3) + 150 }, // late
      ],
      BPM,
      ANCHOR,
    )
    expect(r.hits.map((h) => h.rating)).toEqual(['perfect', 'good', 'early', 'late'])
  })

  it('reports missed expectations and stray taps', () => {
    const r = gradeTiming(grid(0, 2), [{ tMs: beatMs(0) }, { tMs: beatMs(1) }], BPM, ANCHOR)
    expect(r.hits).toHaveLength(1)
    expect(r.missed).toEqual([1])
    expect(r.extra).toEqual([1]) // the beat-1 tap matches nothing
  })

  it('never double-books one onset onto two expectations', () => {
    const r = gradeTiming(grid(0, 0.5), [{ tMs: beatMs(0.25) }], BPM, ANCHOR)
    expect(r.hits).toHaveLength(1)
    expect(r.missed).toHaveLength(1)
  })

  it('filters matches by pitch when both sides carry midis', () => {
    const r = gradeTiming(
      [{ startBeat: 0, midis: [60] }],
      [{ tMs: beatMs(0), midi: 64 }],
      BPM,
      ANCHOR,
    )
    expect(r.hits).toHaveLength(0)
    expect(r.missed).toEqual([0])
    expect(r.extra).toEqual([0])
  })

  it('swing moves off-beat eighths late', () => {
    // Straight off-beat tap at 0.5 should read EARLY under 2/3 swing...
    const swung = gradeTiming(grid(0.5), [{ tMs: beatMs(0.5) }], BPM, ANCHOR, { swingRatio: 2 / 3 })
    expect(swung.hits[0].offsetMs).toBeLessThan(0)
    // ...and a tap at 2/3 of the beat is perfect.
    const perfect = gradeTiming(grid(0.5), [{ tMs: beatMs(2 / 3) }], BPM, ANCHOR, { swingRatio: 2 / 3 })
    expect(perfect.hits[0].rating).toBe('perfect')
    // On-beat notes are unaffected.
    expect(swungBeat(2, 2 / 3)).toBe(2)
    expect(swungBeat(1.5, 2 / 3)).toBeCloseTo(1 + 2 / 3)
  })

  it('empty expectations give accuracy 1 and all-extra onsets', () => {
    const r = gradeTiming([], [{ tMs: beatMs(0) }], BPM, ANCHOR)
    expect(r.accuracy).toBe(1)
    expect(r.extra).toEqual([0])
  })
})

describe('rhythm patterns', () => {
  it('every pattern fits exactly inside its bars, sorted and non-overlapping', () => {
    for (const p of RHYTHM_PATTERNS) {
      const beatsPerBar = (p.timeSignature[0] * 4) / p.timeSignature[1]
      const total = p.bars * beatsPerBar
      let prevEnd = 0
      for (const ev of p.events) {
        expect(ev.startBeat, p.id).toBeGreaterThanOrEqual(0)
        expect(ev.startBeat + 1e-6, p.id).toBeGreaterThanOrEqual(prevEnd)
        expect(ev.startBeat + ev.durationBeats, p.id).toBeLessThanOrEqual(total + 1e-6)
        prevEnd = ev.startBeat + ev.durationBeats
      }
    }
  })

  it('every level has at least two patterns', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(RHYTHM_PATTERNS.filter((p) => p.level === level).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('notation expansion fills every pattern to its full length', () => {
    for (const p of RHYTHM_PATTERNS) {
      const beatsPerBar = (p.timeSignature[0] * 4) / p.timeSignature[1]
      const { events, noteIndices } = patternToNotation(p)
      const total = events.reduce((s, e) => s + e.durationBeats, 0)
      expect(total, p.id).toBeCloseTo(p.bars * beatsPerBar, 5)
      expect(noteIndices, p.id).toHaveLength(p.events.length)
      for (const idx of noteIndices) expect(events[idx].rest, p.id).toBe(false)
    }
  })

  it('notation events never cross barlines', () => {
    for (const p of RHYTHM_PATTERNS) {
      const beatsPerBar = (p.timeSignature[0] * 4) / p.timeSignature[1]
      let cursor = 0
      for (const ev of patternToNotation(p).events) {
        const barPos = cursor % beatsPerBar
        expect(barPos + ev.durationBeats, p.id).toBeLessThanOrEqual(beatsPerBar + 1e-6)
        cursor += ev.durationBeats
      }
    }
  })
})
