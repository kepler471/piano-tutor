export interface Onset {
  midi: number
  t: number
}

export interface Sounded {
  /** Distinct midis sounding together, ascending */
  midis: number[]
  t: number
}

/**
 * Tier A transcription: group note onsets that happen within `windowSec` of the
 * cluster start into a single chord event. No rhythm — every cluster becomes one
 * quarter note when rendered.
 */
export function clusterOnsets(onsets: Onset[], windowSec = 0.08): Sounded[] {
  const sorted = [...onsets].sort((a, b) => a.t - b.t)
  const out: Sounded[] = []
  for (const o of sorted) {
    const last = out[out.length - 1]
    if (last && o.t - last.t <= windowSec) {
      if (!last.midis.includes(o.midi)) {
        last.midis = [...last.midis, o.midi].sort((a, b) => a - b)
      }
    } else {
      out.push({ midis: [o.midi], t: o.t })
    }
  }
  return out
}
