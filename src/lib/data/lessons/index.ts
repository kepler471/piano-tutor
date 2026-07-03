import { cadenceLessons } from './cadences'
import { fiveFingerLessons } from './fiveFinger'
import { hanon1Lesson } from './hanon1'
import { scaleRoutineLessons } from './scaleRoutine'
import { makeSightReadingLesson } from './sightReading'
import type { Lesson } from './types'

export type { Lesson, LessonSegment, LessonStep } from './types'
export { makeSightReadingLesson }

/** Static lessons, grouped by method in display order. */
export function allLessons(): Lesson[] {
  return [
    ...fiveFingerLessons(),
    hanon1Lesson(),
    ...scaleRoutineLessons(),
    ...cadenceLessons(),
  ]
}
