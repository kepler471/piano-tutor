import { describe, expect, it } from 'vitest'
import { NoiseFloor } from '../lib/audio/noiseFloor'

/** Live-ish frame cadence: 2048-sample frames at 50% hop, 44100 Hz. */
const STEP = 1024 / 44100

describe('NoiseFloor', () => {
  it('starts at zero and converges to a steady ambient level', () => {
    const nf = new NoiseFloor()
    let t = 0
    for (; t < 0.7; t += STEP) {
      nf.update(0.01, t)
      expect(nf.floor).toBe(0)
    }
    for (; t < 3; t += STEP) nf.update(0.01, t)
    expect(nf.floor).toBeCloseTo(0.01, 5)
  })

  it('drops back after the noise stops', () => {
    const nf = new NoiseFloor()
    let t = 0
    for (; t < 3; t += STEP) nf.update(0.01, t)
    expect(nf.floor).toBeCloseTo(0.01, 5)
    for (; t < 6; t += STEP) nf.update(0.0005, t)
    expect(nf.floor).toBeCloseTo(0.0005, 5)
  })

  it('ignores transient note bursts over quiet ambient', () => {
    const nf = new NoiseFloor()
    const ambient = 0.003
    // A loud 0.4 s "note" at the start of every second; every block still
    // contains inter-note gap frames, so the minimum stays at ambient.
    for (let t = 0; t < 5; t += STEP) {
      nf.update(t % 1 < 0.4 ? 0.3 : ambient, t)
    }
    expect(nf.floor).toBeCloseTo(ambient, 5)
  })

  it('clamps the floor in a very loud room', () => {
    const nf = new NoiseFloor()
    for (let t = 0; t < 3; t += STEP) nf.update(0.5, t)
    expect(nf.floor).toBe(0.02)
  })

  it('resets when time goes backwards', () => {
    const nf = new NoiseFloor()
    for (let t = 0; t < 3; t += STEP) nf.update(0.01, t)
    expect(nf.floor).toBeCloseTo(0.01, 5)
    nf.update(0.01, 0.1)
    expect(nf.floor).toBe(0)
  })
})
