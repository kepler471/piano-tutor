export type NoteSource = 'mono' | 'poly'

export interface NoteEvent {
  kind: 'on' | 'off'
  /** MIDI note number 21..108 */
  midi: number
  /** AudioContext time in seconds */
  t: number
  /** Detection confidence 0..1 (mono: pitchy clarity; poly: model amplitude) */
  confidence: number
  /** Mono only: cents offset from equal temperament, for the tuner */
  cents?: number
  source: NoteSource
}

export type NoteEventListener = (ev: NoteEvent) => void

export function frequencyToMidi(freq: number): { midi: number; cents: number } {
  const midiFloat = 69 + 12 * Math.log2(freq / 440)
  const midi = Math.round(midiFloat)
  return { midi, cents: (midiFloat - midi) * 100 }
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}
