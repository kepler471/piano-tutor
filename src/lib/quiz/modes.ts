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
  | 'key-signature'
  | 'circle-of-fifths'
  | 'interval-staff'
  | 'chord-spelling'
  | 'chord-function'

/** Highest selectable level per mode (must match the LEVELS arrays in the generators). */
export const QUIZ_LEVEL_COUNTS: Record<QuizModeId, number> = {
  intervals: 4,
  chords: 4,
  'scale-type': 4,
  cadence: 3,
  echo: 3,
  'rhythm-dictation': 4,
  'note-naming': 4,
  'key-signature': 4,
  'circle-of-fifths': 4,
  'interval-staff': 4,
  'chord-spelling': 3,
  'chord-function': 3,
}
