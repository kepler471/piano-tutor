import { makeSightReading } from '../../sightread/generator'
import type { Lesson } from './types'

/**
 * Back-compat wrapper: the original single-level sight-reading drill is now
 * level 1 of the leveled generator in src/lib/sightread/generator.ts.
 */
export function makeSightReadingLesson(): Lesson {
  return makeSightReading(1)
}
