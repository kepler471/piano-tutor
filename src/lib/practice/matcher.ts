import type { LessonStep } from '../data/lessons/types'

export type StepResult = 'pending' | 'correct' | 'corrected'

export interface OnsetOutcome {
  /** The cursor advanced past the current step */
  advanced: boolean
  /** The onset did not belong to the current step */
  wrong: boolean
  /** All steps are complete */
  done: boolean
}

/**
 * Beginner-friendly cursor matcher: the current step waits until all of its
 * expected notes have sounded. A wrong note is flagged but never advances or
 * fails the step ("wait, don't fail"). Steps completed without any wrong
 * notes are 'correct'; with wrong notes along the way, 'corrected'.
 */
export class StepMatcher {
  readonly steps: LessonStep[]
  cursor = 0
  results: StepResult[]
  mistakes = 0
  private collected = new Set<number>()
  private stumbled = false

  constructor(steps: LessonStep[]) {
    this.steps = steps
    this.results = steps.map(() => 'pending')
  }

  get done(): boolean {
    return this.cursor >= this.steps.length
  }

  get current(): LessonStep | undefined {
    return this.steps[this.cursor]
  }

  /** Midis of the current step not yet played (for chord steps). */
  get remaining(): Set<number> {
    const cur = this.current
    if (!cur) return new Set()
    return new Set(cur.midis.filter((m) => !this.collected.has(m)))
  }

  onOnset(midi: number): OnsetOutcome {
    if (this.done) return { advanced: false, wrong: false, done: true }
    const expected = new Set(this.current!.midis)
    if (!expected.has(midi)) {
      this.mistakes++
      this.stumbled = true
      return { advanced: false, wrong: true, done: false }
    }
    this.collected.add(midi)
    const complete = [...expected].every((m) => this.collected.has(m))
    if (complete) {
      this.results[this.cursor] = this.stumbled ? 'corrected' : 'correct'
      this.cursor++
      this.collected.clear()
      this.stumbled = false
      return { advanced: true, wrong: false, done: this.done }
    }
    return { advanced: false, wrong: false, done: false }
  }
}
