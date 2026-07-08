import type { LessonStep } from '../data/lessons/types'

export type StepResult = 'pending' | 'correct' | 'corrected' | 'skipped'

export interface OnsetOutcome {
  /** The cursor advanced past the current step */
  advanced: boolean
  /** The onset did not belong to the current step */
  wrong: boolean
  /** All steps are complete */
  done: boolean
  /** Steps skipped via lookahead on this onset (absent when none) */
  skipped?: number
}

export interface StepMatcherOptions {
  /**
   * When the onset misses the current step but matches the NEXT one, mark the
   * current step 'skipped' and move on instead of flagging a wrong note — a
   * single missed detection (mic detection is lossy on fast playing) then
   * costs one grey step instead of derailing the rest of the run. Depth is
   * exactly 1; a wrong-octave detection advancing is mitigated by the
   * tracker's octave hysteresis.
   */
  lookahead?: boolean
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
  skips = 0
  private collected = new Set<number>()
  private stumbled = false
  private lookahead: boolean

  constructor(steps: LessonStep[], opts: StepMatcherOptions = {}) {
    this.steps = steps
    this.results = steps.map(() => 'pending')
    this.lookahead = opts.lookahead ?? false
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
    if (this.current!.midis.includes(midi)) return this.collect(midi)
    if (this.lookahead && this.steps[this.cursor + 1]?.midis.includes(midi)) {
      this.results[this.cursor] = 'skipped'
      this.skips++
      this.cursor++
      this.collected.clear()
      this.stumbled = false
      return { ...this.collect(midi), skipped: 1 }
    }
    this.mistakes++
    this.stumbled = true
    return { advanced: false, wrong: true, done: false }
  }

  private collect(midi: number): OnsetOutcome {
    this.collected.add(midi)
    const complete = this.current!.midis.every((m) => this.collected.has(m))
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
