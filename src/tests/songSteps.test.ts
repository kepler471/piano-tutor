import { describe, expect, it } from 'vitest'
import { SONG_CATALOG } from '../lib/data/songs/catalog'
import { beatsPerMeasure } from '../lib/data/songs/types'
import { barsParam, parseBarsParam, songSlices, stepsFromSong } from '../lib/practice/songSteps'
import { songSystems } from '../lib/notation/songScore'

const ode = SONG_CATALOG.find((s) => s.id === 'ode-to-joy')!
const blues = SONG_CATALOG.find((s) => s.id === 'twelve-bar-blues-c')!

describe('song catalog validation', () => {
  it('every note fits inside its measure and the piano range', () => {
    for (const song of SONG_CATALOG) {
      const bpm = beatsPerMeasure(song)
      for (const [m, measure] of song.measures.entries()) {
        for (const n of measure.notes) {
          expect(n.midi, `${song.id} bar ${m + 1}`).toBeGreaterThanOrEqual(21)
          expect(n.midi, `${song.id} bar ${m + 1}`).toBeLessThanOrEqual(108)
          expect(n.startBeat, `${song.id} bar ${m + 1}`).toBeGreaterThanOrEqual(0)
          expect(n.startBeat + n.durationBeats, `${song.id} bar ${m + 1}`).toBeLessThanOrEqual(bpm + 1e-6)
          expect(n.durationBeats).toBeGreaterThan(0)
        }
      }
    }
  })

  it('sections reference valid measure ranges', () => {
    for (const song of SONG_CATALOG) {
      for (const s of song.sections) {
        expect(s.fromMeasure).toBeGreaterThanOrEqual(0)
        expect(s.toMeasure).toBeLessThan(song.measures.length)
        expect(s.fromMeasure).toBeLessThanOrEqual(s.toMeasure)
      }
    }
  })

  it('right-hand parts sit above left-hand parts on average (hands not flipped)', () => {
    // Real repertoire crosses voices within a bar, so compare per-song means
    // rather than per-measure extremes — this still catches swapped hands.
    for (const song of SONG_CATALOG) {
      const mean = (hand: string) => {
        const midis = song.measures.flatMap((m) => m.notes.filter((n) => n.hand === hand).map((n) => n.midi))
        return midis.reduce((a, b) => a + b, 0) / midis.length
      }
      expect(mean('R'), song.id).toBeGreaterThan(mean('L'))
    }
  })
})

describe('stepsFromSong', () => {
  it('merges simultaneous notes across hands into one chord step', () => {
    const steps = stepsFromSong(ode, { hands: 'both', fromMeasure: 0, toMeasure: 0 })
    // Bar 1: E E F G melody + whole-note C3 → first step is a 2-note chord.
    expect(steps[0].midis).toEqual([48, 64])
    expect(steps[0].hands).toEqual(['L', 'R'])
    expect(steps).toHaveLength(4)
    expect(steps[1].midis).toEqual([64])
  })

  it('hand filtering drops the other hand entirely', () => {
    const rh = stepsFromSong(ode, { hands: 'R' })
    expect(rh.every((s) => s.hands!.every((h) => h === 'R'))).toBe(true)
    const lh = stepsFromSong(ode, { hands: 'L' })
    expect(lh.every((s) => s.midis.every((m) => m < 60))).toBe(true)
  })

  it('steps are ordered by onset with range-relative startBeats', () => {
    const steps = stepsFromSong(ode, { hands: 'both', fromMeasure: 4, toMeasure: 7 })
    expect(steps[0].startBeat).toBe(0)
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].startBeat!).toBeGreaterThan(steps[i - 1].startBeat!)
    }
  })

  it('blues chord steps carry all four voicing notes', () => {
    const steps = stepsFromSong(blues, { hands: 'both', fromMeasure: 0, toMeasure: 0 })
    expect(steps).toHaveLength(2) // beat 0 and beat 2
    expect(steps[0].midis).toEqual([48, 58, 64, 70]) // C3 Bb3 E4 Bb4
  })
})

describe('songSystems', () => {
  it('splits into systems of 4 measures with aligned step maps', () => {
    const systems = songSystems(ode, { hands: 'both' })
    expect(systems).toHaveLength(2)
    expect(systems[0].fromMeasure).toBe(0)
    expect(systems[0].toMeasure).toBe(3)
    expect(systems[1].model.timeSignature).toBeUndefined() // only first system shows it
    expect(systems[0].model.timeSignature).toBe('4/4')
  })

  it('every non-rest event maps to a valid step index', () => {
    const steps = stepsFromSong(ode, { hands: 'both' })
    for (const system of songSystems(ode, { hands: 'both' })) {
      for (const [staveEvents, staveSteps] of [
        [system.model.treble, system.trebleSteps],
        [system.model.bass, system.bassSteps],
      ] as const) {
        expect(staveEvents.length).toBe(staveSteps.length)
        staveSteps.forEach((step, i) => {
          if (staveEvents[i].rest) expect(step).toBeNull()
          else {
            expect(step).not.toBeNull()
            expect(step!).toBeGreaterThanOrEqual(0)
            expect(step!).toBeLessThan(steps.length)
          }
        })
      }
    }
  })

  it('each stave measure fills its full duration (notes + rests)', () => {
    for (const song of SONG_CATALOG) {
      const bpm = beatsPerMeasure(song)
      for (const system of songSystems(song, { hands: 'both' })) {
        for (const stave of [system.model.treble, system.model.bass]) {
          const beats = (ev: (typeof stave)[number]) => {
            const base: Record<string, number> = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25 }
            let b = base[ev.duration] ?? 1
            if (ev.dots) b *= 1.5
            return b
          }
          const total = stave.reduce((sum, ev) => sum + beats(ev), 0)
          const measuresInSystem = system.toMeasure - system.fromMeasure + 1
          expect(total, `${song.id} system @${system.fromMeasure}`).toBeCloseTo(bpm * measuresInSystem, 5)
        }
      }
    }
  })

  it('single-hand view keeps the other stave as rests', () => {
    for (const system of songSystems(ode, { hands: 'R' })) {
      expect(system.model.bass.every((ev) => ev.rest)).toBe(true)
      expect(system.bassSteps.every((s) => s === null)).toBe(true)
    }
  })
})

describe('bars URL param', () => {
  it('round-trips a 0-based range through the 1-based param', () => {
    expect(barsParam(2, 5)).toBe('3-6')
    expect(parseBarsParam('3-6', 10)).toEqual({ fromMeasure: 2, toMeasure: 5 })
    expect(parseBarsParam(barsParam(0, 9), 10)).toEqual({ fromMeasure: 0, toMeasure: 9 })
  })

  it('clamps the end of the range to the song length', () => {
    expect(parseBarsParam('3-99', 10)).toEqual({ fromMeasure: 2, toMeasure: 9 })
  })

  it('rejects absent, malformed, and out-of-range values', () => {
    expect(parseBarsParam(undefined, 10)).toBeNull()
    expect(parseBarsParam('', 10)).toBeNull()
    expect(parseBarsParam('3', 10)).toBeNull()
    expect(parseBarsParam('a-b', 10)).toBeNull()
    expect(parseBarsParam('0-4', 10)).toBeNull() // 1-based
    expect(parseBarsParam('6-3', 10)).toBeNull() // inverted
    expect(parseBarsParam('11-12', 10)).toBeNull() // starts past the end
  })
})
