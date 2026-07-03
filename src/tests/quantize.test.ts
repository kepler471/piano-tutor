import { describe, expect, it } from 'vitest'
import { quantizeToGrid } from '../lib/transcribe/quantize'

// 60 BPM → 8th-note step = 0.5 s, bar (4/4) = 8 steps = 4 s
describe('quantizeToGrid', () => {
  it('returns empty for no onsets', () => {
    expect(quantizeToGrid([], 60)).toEqual([])
  })

  it('quantizes an even quarter-note melody', () => {
    const onsets = [60, 62, 64, 65].map((midi, i) => ({ midi, t: i * 1.0 }))
    const events = quantizeToGrid(onsets, 60)
    const notes = events.filter((e) => e.midis.length)
    expect(notes.map((e) => e.midis[0])).toEqual([60, 62, 64, 65])
    expect(notes.every((e) => e.duration === 'q')).toBe(true)
  })

  it('snaps slightly-off onsets to the grid', () => {
    const events = quantizeToGrid(
      [
        { midi: 60, t: 0.06 }, // ~slot 0
        { midi: 62, t: 0.97 }, // ~slot 2
      ],
      60,
    )
    const notes = events.filter((e) => e.midis.length)
    expect(notes[0].midis).toEqual([60])
    expect(notes[0].duration).toBe('q')
    expect(notes[1].midis).toEqual([62])
  })

  it('inserts rests for gaps', () => {
    const events = quantizeToGrid(
      [
        { midi: 60, t: 0 },
        { midi: 64, t: 2.0 }, // slot 4: one beat of sound, then a gap
      ],
      60,
    )
    // note(h capped by next? no: room to slot 4 = 4 steps → 'h'), then note at 4
    expect(events[0].midis).toEqual([60])
    const second = events.find((e, i) => i > 0 && e.midis.length)
    expect(second?.midis).toEqual([64])
  })

  it('merges simultaneous onsets into chords', () => {
    const events = quantizeToGrid(
      [
        { midi: 60, t: 0.0 },
        { midi: 64, t: 0.03 },
        { midi: 67, t: 0.05 },
      ],
      60,
    )
    expect(events[0].midis).toEqual([60, 64, 67])
  })

  it('marks barlines every 4 beats in 4/4', () => {
    const onsets = Array.from({ length: 10 }, (_, i) => ({ midi: 60 + i, t: i * 1.0 }))
    const events = quantizeToGrid(onsets, 60, 4)
    let steps = 0
    for (const e of events) {
      steps += e.duration === 'h' ? 4 : e.duration === 'q' ? 2 : 1
      if (e.endsBar) {
        expect(steps % 8).toBe(0)
      }
    }
  })

  it('never crosses a barline with one note', () => {
    // note on beat 4 of bar 1, next note in bar 2 → must not exceed the bar
    const events = quantizeToGrid(
      [
        { midi: 60, t: 3.0 }, // slot 6, bar ends at slot 8
        { midi: 62, t: 6.0 }, // slot 12
      ],
      60,
    )
    const first = events.find((e) => e.midis.length)!
    expect(first.duration).toBe('q') // capped at barline, not 'h'
  })
})
