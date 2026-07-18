import { accompanimentLessons } from './accompaniment'
import { arpeggioLessons } from './arpeggios'
import { brokenChordLessons } from './brokenChords'
import { cadenceLessons } from './cadences'
import { chromaticScaleLessons } from './chromaticScale'
import { contraryMotionLessons } from './contraryMotion'
import { diatonicLessons } from './diatonic'
import { fiveFingerLessons } from './fiveFinger'
import { hanon1Lesson } from './hanon1'
import { inversionLessons } from './inversions'
import { jazzLessons } from './jazz'
import { melodicMinorLessons } from './melodicMinor'
import { chordProgressionLessons } from './progressions'
import { scaleRoutineLessons } from './scaleRoutine'
import { seventhLessons } from './sevenths'
import { makeSightReadingLesson } from './sightReading'
import { triadLessons } from './triads'
import type { Lesson } from './types'

export type { Lesson, LessonSegment, LessonStep } from './types'
export { makeSightReadingLesson }

/** Static lessons, grouped by method in display order. */
export function allLessons(): Lesson[] {
  return [
    ...fiveFingerLessons(),
    hanon1Lesson(),
    ...scaleRoutineLessons(),
    ...melodicMinorLessons(),
    ...chromaticScaleLessons(),
    ...contraryMotionLessons(),
    ...arpeggioLessons(),
    ...brokenChordLessons(),
    ...triadLessons(),
    ...inversionLessons(),
    ...diatonicLessons(),
    ...cadenceLessons(),
    ...chordProgressionLessons(),
    ...seventhLessons(),
    ...accompanimentLessons(),
    ...jazzLessons(),
  ]
}
