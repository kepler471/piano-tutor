export interface RawPolyNote {
  pitchMidi: number
  amplitude: number
  startTimeSeconds: number
  durationSeconds: number
}

/** Notes quieter than this are usually harmonic ghosts (verified on synthetic chords). */
export const MIN_AMPLITUDE = 0.4
/** Octave, 12th, double octave, 17th above a louder simultaneous note. */
const HARMONIC_INTERVALS = [12, 19, 24, 28]
const HARMONIC_AMP_RATIO = 1.4
const SIMULTANEOUS_SEC = 0.06

/**
 * Post-filter for Basic Pitch output: drop quiet detections and harmonic
 * ghosts — piano strings are rich in harmonics and the model sometimes
 * reports the octave/12th above a strongly-struck note as its own quiet note.
 */
export function filterPolyNotes(notes: RawPolyNote[]): RawPolyNote[] {
  return notes.filter((n) => {
    if (n.amplitude < MIN_AMPLITUDE) return false
    const isGhost = notes.some(
      (other) =>
        HARMONIC_INTERVALS.includes(n.pitchMidi - other.pitchMidi) &&
        Math.abs(other.startTimeSeconds - n.startTimeSeconds) < SIMULTANEOUS_SEC &&
        other.amplitude > n.amplitude * HARMONIC_AMP_RATIO,
    )
    return !isGhost
  })
}
