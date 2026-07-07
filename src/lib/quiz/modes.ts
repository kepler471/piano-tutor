/**
 * Quiz mode registry shared by the quiz screen and the learning guide's
 * deep links. Pure data — no Svelte/DOM imports.
 */
export type QuizModeId = 'intervals' | 'chords' | 'echo'

/** Highest selectable level per mode (must match the LEVELS arrays in ear/quiz.ts). */
export const QUIZ_LEVEL_COUNTS: Record<QuizModeId, number> = {
  intervals: 4,
  chords: 4,
  echo: 3,
}
