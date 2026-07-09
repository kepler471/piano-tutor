import type { NoteSource } from '../audio/noteEvents'

/**
 * Mono/poly fusion for chord practice ('mic-fused' routing): the mono
 * tracker hears the most prominent line ~10 ms after the onset, while Basic
 * Pitch delivers full polyphony 0.5–1.5 s later. Forward mono onsets
 * immediately for instant grading, and drop the poly note that re-reports the
 * same physical keypress; poly notes with no mono match (the other notes of a
 * chord) still pass. Pure logic — vitest-covered in fusion.test.ts.
 */
export interface FuserOptions {
  /** How long a poly onset may trail its mono counterpart (ms). */
  maxPolyLagMs?: number
}

interface PendingOnset {
  midi: number
  tMs: number
}

export class MonoPolyFuser {
  private maxPolyLagMs: number
  private pending: PendingOnset[] = []

  constructor(opts: FuserOptions = {}) {
    this.maxPolyLagMs = opts.maxPolyLagMs ?? 2000
  }

  /** Should this event reach subscribers? Also records mono onsets. */
  accept(ev: { source: NoteSource; kind: 'on' | 'off'; midi: number; tMs: number }): boolean {
    if (ev.source === 'midi') return true
    // Offs pass through untouched (poly never emits them; mono offs drive
    // nothing in grading but are harmless to forward).
    if (ev.kind !== 'on') return true
    this.prune(ev.tMs)
    if (ev.source === 'mono') {
      this.pending.push({ midi: ev.midi, tMs: ev.tMs })
      return true
    }
    // Poly onset: consume at most one matching mono onset. Exact-midi match
    // only — chords legitimately contain octaves, so no ±12 tolerance.
    const i = this.pending.findIndex((p) => p.midi === ev.midi && ev.tMs >= p.tMs)
    if (i !== -1) {
      this.pending.splice(i, 1)
      return false
    }
    return true
  }

  reset(): void {
    this.pending = []
  }

  private prune(nowMs: number): void {
    this.pending = this.pending.filter((p) => nowMs - p.tMs <= this.maxPolyLagMs)
  }
}
