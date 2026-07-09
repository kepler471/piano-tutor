import type { Hand } from '../theory/types'

/**
 * Pure playback scheduling: beats → seconds, swing, articulation, velocity.
 * No Tone/DOM imports so vitest covers it directly; playback.ts maps the
 * resulting plan onto sampler calls.
 */

export interface PlayableNote {
  midi: number
  /** Absolute onset in beats (quarter = 1) */
  startBeat: number
  durationBeats: number
  /** Enables hand-based velocity shaping; uniform velocity when absent */
  hand?: Hand
}

export interface ScheduledNote {
  midi: number
  timeSec: number
  durSec: number
  /** 0..1 */
  velocity: number
}

export const SWING_RATIO = 2 / 3
/** 5% detach between consecutive notes, as before. */
const ARTICULATION = 0.95
const MIN_DUR_SEC = 0.1
const VEL_RIGHT = 0.9
const VEL_LEFT = 0.65
const VEL_DEFAULT = 0.85

/**
 * Piecewise-linear swing map of the beat axis: within each beat 0→0,
 * 0.5→ratio, 1→1. Applied to both a note's start and end so straight
 * eighths become clean triplet swing with no gaps or overlaps; notes on
 * integer beats (and integer-beat durations) pass through unchanged.
 * Agrees with timingGrader's swungBeat at every x.0/x.5 onset it handles.
 */
export function swingMapBeat(beat: number, ratio = SWING_RATIO): number {
  const whole = Math.floor(beat)
  const frac = beat - whole
  const mapped = frac <= 0.5 ? frac * (ratio / 0.5) : ratio + (frac - 0.5) * ((1 - ratio) / 0.5)
  return whole + mapped
}

export function schedulePlan(notes: PlayableNote[], bpm: number, swing = false): ScheduledNote[] {
  const beatSec = 60 / bpm
  const map = (b: number) => (swing ? swingMapBeat(b) : b)
  return notes
    .map((n) => {
      const timeSec = map(n.startBeat) * beatSec
      const endSec = map(n.startBeat + n.durationBeats) * beatSec
      return {
        midi: n.midi,
        timeSec,
        durSec: Math.max(MIN_DUR_SEC, (endSec - timeSec) * ARTICULATION),
        velocity: n.hand === 'L' ? VEL_LEFT : n.hand === 'R' ? VEL_RIGHT : VEL_DEFAULT,
      }
    })
    .sort((a, b) => a.timeSec - b.timeSec)
}

export function planEndSec(plan: ScheduledNote[]): number {
  return plan.reduce((end, n) => Math.max(end, n.timeSec + n.durSec), 0)
}
