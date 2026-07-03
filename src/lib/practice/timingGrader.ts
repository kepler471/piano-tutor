/**
 * Timing grader: compares played onsets against an expected beat grid.
 * Pure — used by the rhythm trainer, timed sight-reading, and song practice.
 */

export interface TimedExpectation {
  /** Onset in beats from the grid anchor (quarter note = 1 beat) */
  startBeat: number
  /** When present, an onset only matches if its midi is in this set */
  midis?: number[]
}

export interface TimedOnset {
  /** Wall-clock ms (performance.now() domain, same as the metronome anchor) */
  tMs: number
  midi?: number
}

export type HitRating = 'perfect' | 'good' | 'early' | 'late'

export interface TimingHit {
  /** Index into the expectations array */
  index: number
  /** Signed ms: negative = early, positive = late */
  offsetMs: number
  rating: HitRating
}

export interface TimingResult {
  hits: TimingHit[]
  /** Expectation indices nothing matched */
  missed: number[]
  /** Onset indices that matched no expectation (stray taps) */
  extra: number[]
  /** 0..1 — perfect 1, good 0.7, early/late 0.3, missed 0 */
  accuracy: number
}

export interface TimingOptions {
  /**
   * Swing: off-beat eighths (fractional beat .5) are expected late, at this
   * fraction of the beat (2/3 = classic triplet swing).
   */
  swingRatio?: number
  toleranceMs?: { perfect: number; good: number }
  /** Matching window on each side of an expectation, in beats */
  windowBeats?: number
}

const RATING_WEIGHT: Record<HitRating, number> = { perfect: 1, good: 0.7, early: 0.3, late: 0.3 }

/** Apply swing: beats at x.5 move to x + swingRatio. */
export function swungBeat(beat: number, swingRatio?: number): number {
  if (swingRatio === undefined) return beat
  const whole = Math.floor(beat)
  const frac = beat - whole
  return Math.abs(frac - 0.5) < 1e-6 ? whole + swingRatio : beat
}

export function gradeTiming(
  expected: TimedExpectation[],
  onsets: TimedOnset[],
  bpm: number,
  anchorMs: number,
  opts: TimingOptions = {},
): TimingResult {
  const beatMs = 60000 / bpm
  const tol = opts.toleranceMs ?? { perfect: 40, good: 100 }
  const windowMs = (opts.windowBeats ?? 0.5) * beatMs

  const expectedMs = expected.map((e) => anchorMs + swungBeat(e.startBeat, opts.swingRatio) * beatMs)

  const used = new Set<number>()
  const hits: TimingHit[] = []
  const missed: number[] = []

  expected.forEach((exp, i) => {
    let best = -1
    let bestAbs = Infinity
    onsets.forEach((onset, j) => {
      if (used.has(j)) return
      if (exp.midis && onset.midi !== undefined && !exp.midis.includes(onset.midi)) return
      const abs = Math.abs(onset.tMs - expectedMs[i])
      if (abs <= windowMs && abs < bestAbs) {
        best = j
        bestAbs = abs
      }
    })
    if (best === -1) {
      missed.push(i)
      return
    }
    used.add(best)
    const offsetMs = onsets[best].tMs - expectedMs[i]
    const rating: HitRating =
      Math.abs(offsetMs) <= tol.perfect ? 'perfect' : Math.abs(offsetMs) <= tol.good ? 'good' : offsetMs < 0 ? 'early' : 'late'
    hits.push({ index: i, offsetMs, rating })
  })

  const extra = onsets.map((_, j) => j).filter((j) => !used.has(j))
  const accuracy = expected.length === 0 ? 1 : hits.reduce((sum, h) => sum + RATING_WEIGHT[h.rating], 0) / expected.length

  return { hits, missed, extra, accuracy }
}
