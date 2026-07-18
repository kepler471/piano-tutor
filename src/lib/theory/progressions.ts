import { Note } from 'tonal'
import type { ChordInfo, ChordQualityId } from './types'
import { getChord, inversionsFor } from './chords'

/**
 * Diatonic harmony helpers shared by the chord-function quiz and the chord-path
 * lesson generators. Pure — no DOM/audio types.
 */

export type DegreeQuality = 'major' | 'minor' | 'diminished'

/** Diatonic triads as [roman numeral, tonal interval from the tonic, quality]. */
export const MAJOR_DEGREES: [string, string, DegreeQuality][] = [
  ['I', '1P', 'major'],
  ['ii', '2M', 'minor'],
  ['iii', '3M', 'minor'],
  ['IV', '4P', 'major'],
  ['V', '5P', 'major'],
  ['vi', '6M', 'minor'],
  ['vii°', '7M', 'diminished'],
]

/** Harmonic-minor convention: V is major (raised leading tone). */
export const MINOR_DEGREES: [string, string, DegreeQuality][] = [
  ['i', '1P', 'minor'],
  ['ii°', '2M', 'diminished'],
  ['III', '3m', 'major'],
  ['iv', '4P', 'minor'],
  ['V', '5P', 'major'],
  ['VI', '6m', 'major'],
  ['VII', '7m', 'major'],
]

export interface DiatonicTriad {
  numeral: string
  root: string
  quality: ChordQualityId
}

/**
 * The triad a roman numeral names in a key. Transposes by interval (not
 * semitones) so spellings stay diatonic (Bb major → Eb for IV, not D#).
 */
export function diatonicTriad(key: string, numeral: string, mode: 'major' | 'minor' = 'major'): DiatonicTriad {
  const table = mode === 'major' ? MAJOR_DEGREES : MINOR_DEGREES
  const row = table.find(([n]) => n === numeral)
  if (!row) throw new Error(`Unknown ${mode}-key numeral: ${numeral}`)
  const [, interval, quality] = row
  return { numeral, root: Note.pitchClass(Note.transpose(key, interval)), quality }
}

/** Symmetric per-note distance between two voicings (handles unequal sizes). */
function movementCost(from: number[], to: number[]): number {
  const nearest = (m: number, pool: number[]) => Math.min(...pool.map((p) => Math.abs(p - m)))
  return to.reduce((sum, m) => sum + nearest(m, from), 0) + from.reduce((sum, m) => sum + nearest(m, to), 0)
}

/**
 * The inversion (and octave register) of a chord that moves the hand least
 * from the previous voicing — chaining this from a root-position start yields
 * smoothly voice-led progressions. Deterministic: ties keep the earliest
 * candidate (lowest inversion, then lowest register).
 */
export function closestInversion(prevMidis: number[], root: string, quality: ChordQualityId): ChordInfo {
  let best: ChordInfo | null = null
  let bestCost = Infinity
  for (const inversion of inversionsFor(quality)) {
    const base = getChord(root, quality, inversion)
    for (const shift of [-12, 0, 12]) {
      const midis = base.midi.map((m) => m + shift)
      const cost = movementCost(prevMidis, midis)
      if (cost < bestCost) {
        bestCost = cost
        best =
          shift === 0
            ? base
            : { ...base, midi: midis, noteNames: base.noteNames.map((n) => Note.transpose(n, shift > 0 ? '8P' : '-8P')) }
      }
    }
  }
  return best!
}
