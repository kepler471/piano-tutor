import { RHYTHM_PATTERNS, type RhythmPattern } from '../data/rhythms'
import type { Rng } from '../ear/quiz'

/**
 * Rhythm dictation: hear a pattern tapped on one note, pick the notation
 * that matches. The inverse of the tap-along trainer (notation → taps).
 */

export interface RhythmDictationQuestion {
  kind: 'rhythm-dictation'
  /** The pattern that is played. */
  answer: RhythmPattern
  /** Candidate notations (contains the answer exactly once). */
  options: RhythmPattern[]
  /** Why: the pattern's name plus its authored counting hint. */
  explanation: string
}

export const RHYTHM_DICTATION_LEVELS = [1, 2, 3, 4, 5] as const

function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function makeRhythmDictationQuestion(
  level: number,
  rng: Rng = Math.random,
): RhythmDictationQuestion {
  const lv = Math.max(1, Math.min(RHYTHM_DICTATION_LEVELS.length, Math.floor(level))) as RhythmPattern['level']
  const pool = RHYTHM_PATTERNS.filter((p) => p.level === lv)
  const shuffled = shuffle(pool, rng)
  const answer = shuffled[0]
  // Distractors must share the answer's meter — otherwise a 3/4 answer
  // could be picked by its time signature without listening.
  const sameMeter = shuffled.filter(
    (p) => p.timeSignature[0] === answer.timeSignature[0] && p.timeSignature[1] === answer.timeSignature[1],
  )
  const options = shuffle(sameMeter.slice(0, Math.min(3, sameMeter.length)), rng)
  const explanation = `"${answer.label}".${answer.hint ? ` ${answer.hint}` : ''}`
  return { kind: 'rhythm-dictation', answer, options, explanation }
}
