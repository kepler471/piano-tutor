/**
 * Quiz mode registry shared by the quiz screen and the learning guide's
 * deep links. Pure data — no Svelte/DOM imports.
 */
export type QuizModeId =
  // by ear
  | 'intervals'
  | 'chords'
  | 'scale-type'
  | 'cadence'
  | 'echo'
  | 'rhythm-dictation'
  // reading & theory
  | 'note-naming'
  | 'read-melody'
  | 'sight-read'
  | 'key-signature'
  | 'circle-of-fifths'
  | 'interval-staff'
  | 'chord-spelling'
  | 'chord-function'

/** Highest selectable level per mode (must match the LEVELS arrays in the generators). */
export const QUIZ_LEVEL_COUNTS: Record<QuizModeId, number> = {
  intervals: 6,
  chords: 6,
  'scale-type': 6,
  cadence: 5,
  echo: 5,
  'rhythm-dictation': 5,
  'note-naming': 6,
  'read-melody': 6,
  'sight-read': 4,
  'key-signature': 6,
  'circle-of-fifths': 6,
  'interval-staff': 6,
  'chord-spelling': 5,
  'chord-function': 6,
}
