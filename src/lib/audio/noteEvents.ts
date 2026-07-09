export type NoteSource = 'mono' | 'poly' | 'midi'

export interface NoteEvent {
  kind: 'on' | 'off'
  /** MIDI note number 21..108 */
  midi: number
  /**
   * Time in seconds in the source's own clock (AudioContext time for mic
   * sources, performance.now()/1000 for MIDI). Only comparable within one
   * source — use tMs to relate events across sources or to the metronome.
   */
  t: number
  /** Wall-clock timestamp (performance.now() ms), stamped at emit time. */
  tMs?: number
  /** Detection confidence 0..1 (mono: pitchy clarity; poly: model amplitude; midi: 1) */
  confidence: number
  /** Mono only: cents offset from equal temperament, for the tuner */
  cents?: number
  /** MIDI only: key velocity 0..1 */
  velocity?: number
  source: NoteSource
}

export type NoteEventListener = (ev: NoteEvent) => void

export function frequencyToMidi(freq: number, a4 = 440): { midi: number; cents: number } {
  const midiFloat = 69 + 12 * Math.log2(freq / a4)
  const midi = Math.round(midiFloat)
  return { midi, cents: (midiFloat - midi) * 100 }
}

export function midiToFrequency(midi: number, a4 = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12)
}

/**
 * Tuning-calibration step: if a reference A4 read `avgCents` off under the
 * current tuning, this is the A4 that would read it as 0. (Callers clamp to
 * a sane range — see settings.clampA4.)
 */
export function calibratedA4(currentA4: number, avgCents: number): number {
  return currentA4 * Math.pow(2, avgCents / 1200)
}
