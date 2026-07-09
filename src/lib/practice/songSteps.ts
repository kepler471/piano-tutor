import { beatsPerMeasure, type Song, type SongNote } from '../data/songs/types'
import type { LessonStep } from '../data/lessons/types'

/**
 * Bridge from Song to the StepMatcher world: notes that start together are
 * collapsed into one chord step, ordered by absolute onset. Wait-mode song
 * practice is then just a StepMatcher over these steps.
 */
export interface SongStepOptions {
  hands: 'R' | 'L' | 'both'
  /** 0-based inclusive measure range; defaults to the whole song */
  fromMeasure?: number
  toMeasure?: number
}

export interface SongSlice {
  /** Beats from the start of the selected range */
  startBeat: number
  measure: number
  notes: SongNote[]
}

export function songSlices(song: Song, opts: SongStepOptions): SongSlice[] {
  const bpm = beatsPerMeasure(song)
  const from = opts.fromMeasure ?? 0
  const to = Math.min(opts.toMeasure ?? song.measures.length - 1, song.measures.length - 1)
  const groups = new Map<number, SongSlice>()
  for (let m = from; m <= to; m++) {
    for (const note of song.measures[m].notes) {
      if (opts.hands !== 'both' && note.hand !== opts.hands) continue
      const abs = (m - from) * bpm + note.startBeat
      // Quantize the grouping key so float drift can't split a chord.
      const key = Math.round(abs * 64)
      let slice = groups.get(key)
      if (!slice) {
        slice = { startBeat: abs, measure: m, notes: [] }
        groups.set(key, slice)
      }
      slice.notes.push(note)
    }
  }
  return [...groups.values()].sort((a, b) => a.startBeat - b.startBeat)
}

/**
 * Parse a `bars=3-6` URL param (1-based inclusive) into a 0-based measure
 * range, or null when absent/invalid. Ranges are clamped to the song, so a
 * stale link to a shorter piece still lands somewhere sensible.
 */
export function parseBarsParam(
  value: string | undefined,
  measureCount: number,
): { fromMeasure: number; toMeasure: number } | null {
  if (!value) return null
  const m = /^(\d+)-(\d+)$/.exec(value)
  if (!m) return null
  const from = Number(m[1])
  const to = Number(m[2])
  if (from < 1 || to < from || from > measureCount) return null
  return { fromMeasure: from - 1, toMeasure: Math.min(to, measureCount) - 1 }
}

/** Inverse of parseBarsParam: 0-based range → `3-6` (1-based inclusive). */
export function barsParam(fromMeasure: number, toMeasure: number): string {
  return `${fromMeasure + 1}-${toMeasure + 1}`
}

export function stepsFromSong(song: Song, opts: SongStepOptions): LessonStep[] {
  return songSlices(song, opts).map((slice) => {
    const ordered = [...slice.notes].sort((a, b) => a.midi - b.midi)
    return {
      midis: ordered.map((n) => n.midi),
      fingers: ordered.map((n) => n.finger ?? null),
      hands: ordered.map((n) => n.hand),
      startBeat: slice.startBeat,
      durationBeats: Math.max(...ordered.map((n) => n.durationBeats)),
    }
  })
}
