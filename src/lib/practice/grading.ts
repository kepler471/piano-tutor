import type { NoteSource } from '../audio/noteEvents'
import type { LessonStep } from '../data/lessons/types'
import type { ActiveSource } from '../input/routing'

/**
 * Shared per-source grading policy for the step players (LessonPlayer,
 * SongPlayer). Pure — vitest-covered in grading.test.ts.
 */

/**
 * Should this onset reach the matcher at all? In fused mic mode on a chordal
 * step, the mono detector is untrustworthy: MPM fed a chord locks onto
 * subharmonics of the mixture's common period or fifth-locks (see
 * monoTracker.requiredConfirms), so mono only provides instant *positive*
 * feedback — onsets outside the current chord are dropped (no wrong flash,
 * no mistake, no lookahead skip). Poly and MIDI keep full grading power.
 *
 * Trade-off: a genuinely wrong note struck inside a chord attempt only flags
 * when poly reports it ~1 s later — acceptable under "wait, don't fail".
 * (A dropped mono onset may still sit pending in MonoPolyFuser and eat one
 * later poly re-report of the same midi; the user re-strikes at worst.)
 */
export function shouldGradeOnset(
  ev: { source: NoteSource; midi: number },
  currentStep: LessonStep | undefined,
  activeSource: ActiveSource,
): boolean {
  return !(
    activeSource === 'mic-fused' &&
    ev.source === 'mono' &&
    currentStep !== undefined &&
    currentStep.midis.length > 1 &&
    !currentStep.midis.includes(ev.midi)
  )
}

/**
 * Is millisecond timing meaningful for this material on this source? False
 * on mic-poly always (detection runs 0.5–1.5 s behind), and on mic-fused
 * when any step is chordal — a chord step advances on its last tone, which
 * arrives via the laggy poly path. Fused melodic material grades fine: mono
 * onsets land within ~10 ms.
 */
export function timingGradable(steps: LessonStep[], activeSource: ActiveSource): boolean {
  if (activeSource === 'mic-poly') return false
  if (activeSource === 'mic-fused') return !steps.some((s) => s.midis.length > 1)
  return true
}
