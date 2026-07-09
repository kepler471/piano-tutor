import { describe, expect, it } from 'vitest'
import { planEndSec, schedulePlan, swingMapBeat, type PlayableNote } from '../lib/audio/schedule'

const eighths = (count: number, midi = 60): PlayableNote[] =>
  Array.from({ length: count }, (_, i) => ({ midi, startBeat: i * 0.5, durationBeats: 0.5 }))

describe('swingMapBeat', () => {
  it('maps the canonical points of each beat', () => {
    expect(swingMapBeat(0)).toBe(0)
    expect(swingMapBeat(0.25)).toBeCloseTo(1 / 3)
    expect(swingMapBeat(0.5)).toBeCloseTo(2 / 3)
    expect(swingMapBeat(0.75)).toBeCloseTo(5 / 6)
    expect(swingMapBeat(1)).toBe(1)
    expect(swingMapBeat(2.5)).toBeCloseTo(2 + 2 / 3)
  })

  it('leaves integer beats fixed and stays monotonic', () => {
    let prev = -1
    for (let b = 0; b <= 4; b += 1 / 16) {
      const mapped = swingMapBeat(b)
      expect(mapped).toBeGreaterThan(prev)
      prev = mapped
    }
    expect(swingMapBeat(3)).toBe(3)
  })

  it('agrees with timingGrader-style x.5 shifts', () => {
    expect(swingMapBeat(1.5)).toBeCloseTo(1 + 2 / 3)
    expect(swingMapBeat(7.5)).toBeCloseTo(7 + 2 / 3)
  })
})

describe('schedulePlan — straight', () => {
  it('places eighths evenly with a 5% detach', () => {
    const plan = schedulePlan(eighths(4), 120)
    plan.forEach((n, i) => {
      expect(n.timeSec).toBeCloseTo(i * 0.25)
      expect(n.durSec).toBeCloseTo(0.25 * 0.95)
    })
  })

  it('returns an empty plan for no notes', () => {
    expect(schedulePlan([], 100)).toEqual([])
    expect(planEndSec([])).toBe(0)
  })
})

describe('schedulePlan — swing', () => {
  it('tiles consecutive eighths with no gap and no overlap', () => {
    const plan = schedulePlan(eighths(6), 100, true)
    for (let i = 0; i < plan.length - 1; i++) {
      const fullEnd = plan[i].timeSec + plan[i].durSec / 0.95
      expect(fullEnd).toBeCloseTo(plan[i + 1].timeSec)
    }
  })

  it('gives on-beat eighths 2/3 of a beat and off-beat eighths 1/3', () => {
    const beatSec = 60 / 100
    const [on, off] = schedulePlan(eighths(2), 100, true)
    expect(on.durSec).toBeCloseTo((2 / 3) * beatSec * 0.95)
    expect(off.durSec).toBeCloseTo((1 / 3) * beatSec * 0.95)
  })

  it('keeps syncopated and long notes their full length', () => {
    const beatSec = 60 / 90
    const [sync, long] = schedulePlan(
      [
        { midi: 62, startBeat: 0.5, durationBeats: 1 },
        { midi: 64, startBeat: 2, durationBeats: 2 },
      ],
      90,
      true,
    )
    expect(sync.timeSec).toBeCloseTo((2 / 3) * beatSec)
    expect(sync.durSec).toBeCloseTo(1 * beatSec * 0.95)
    expect(long.timeSec).toBeCloseTo(2 * beatSec)
    expect(long.durSec).toBeCloseTo(2 * beatSec * 0.95)
  })
})

describe('schedulePlan — duration floor and velocity', () => {
  it('never schedules below the 0.1 s floor, swing or not', () => {
    const short: PlayableNote[] = [{ midi: 60, startBeat: 0, durationBeats: 0.1 }]
    expect(schedulePlan(short, 200)[0].durSec).toBe(0.1)
    expect(schedulePlan(eighths(2), 400, true)[1].durSec).toBe(0.1)
  })

  it('shapes velocity by hand with a uniform default', () => {
    const plan = schedulePlan(
      [
        { midi: 60, startBeat: 0, durationBeats: 1, hand: 'R' },
        { midi: 48, startBeat: 0, durationBeats: 1, hand: 'L' },
        { midi: 72, startBeat: 1, durationBeats: 1 },
      ],
      100,
    )
    const byMidi = Object.fromEntries(plan.map((n) => [n.midi, n.velocity]))
    expect(byMidi[60]).toBe(0.9)
    expect(byMidi[48]).toBe(0.65)
    expect(byMidi[72]).toBe(0.85)
    plan.forEach((n) => {
      expect(n.velocity).toBeGreaterThan(0)
      expect(n.velocity).toBeLessThanOrEqual(1)
    })
  })

  it('reports the plan end as the last sounding moment', () => {
    const plan = schedulePlan(
      [
        { midi: 60, startBeat: 0, durationBeats: 4 },
        { midi: 64, startBeat: 1, durationBeats: 1 },
      ],
      60,
    )
    expect(planEndSec(plan)).toBeCloseTo(4 * 0.95)
  })
})
