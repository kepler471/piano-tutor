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
   * When the onset misses the current step but matches an upcoming one within
   * this many steps, mark the intervening steps 'skipped' and move on instead
   * of flagging a wrong note — a missed detection (mic detection is lossy on
   * fast playing) then costs grey steps instead of derailing the rest of the
   * run. The shallowest match wins, and the current step is always checked
   * first, so repeated notes never skip; a wrong-octave detection advancing
   * is mitigated by the tracker's octave hysteresis. 0 (default) disables.
   */
  lookahead?: 0 | 1 | 2
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
  private lookahead: number

  constructor(steps: LessonStep[], opts: StepMatcherOptions = {}) {
    this.steps = steps
    this.results = steps.map(() => 'pending')
    this.lookahead = opts.lookahead ?? 0
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

  /** Midis of every step marked 'skipped', in step order. */
  get skippedMidis(): number[] {
    return this.steps.flatMap((s, i) => (this.results[i] === 'skipped' ? s.midis : []))
  }

  onOnset(midi: number): OnsetOutcome {
    if (this.done) return { advanced: false, wrong: false, done: true }
    if (this.current!.midis.includes(midi)) return this.collect(midi)
    for (let d = 1; d <= this.lookahead; d++) {
      if (!this.steps[this.cursor + d]?.midis.includes(midi)) continue
      for (let i = 0; i < d; i++) {
        this.results[this.cursor] = 'skipped'
        this.skips++
        this.cursor++
      }
      this.collected.clear()
      this.stumbled = false
      return { ...this.collect(midi), skipped: d }
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
