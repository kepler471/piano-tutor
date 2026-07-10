import { makeSightReading, type SightLevel } from '../sightread/generator'
import type { LessonStep } from '../data/lessons/types'

/**
 * "Play what you read": a short phrase is drawn on the staff and the player
 * performs it on the real piano while the mic verifies each note. A thin
 * wrapper over the sight-reading melody generator (its own file because it
 * depends on lesson data, not pure theory).
 *
 * Levels cap at 4 — the mono single-line reads. Level 5 of the underlying
 * generator is a hands-together grand staff needing polyphonic detection,
 * which doesn't fit a single-cursor mic quiz.
 */
export interface SightReadQuestion {
  kind: 'sight-read'
  clef: 'treble' | 'bass'
  keySignature: string
  steps: LessonStep[]
}

export const SIGHT_READ_QUIZ_MAX_LEVEL = 4

export function makeSightReadQuestion(level: number, seed?: number): SightReadQuestion {
  const lv = Math.max(1, Math.min(SIGHT_READ_QUIZ_MAX_LEVEL, Math.floor(level))) as SightLevel
  const lesson = makeSightReading(lv, seed)
  const segment = lesson.segments[0]
  // Levels 1–4 are always single-staff (treble or bass); never grand.
  const clef = segment.clef === 'grand' ? 'treble' : segment.clef
  return {
    kind: 'sight-read',
    clef,
    keySignature: lesson.keySignature,
    steps: segment.steps,
  }
}
