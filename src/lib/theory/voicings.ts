import { Note } from 'tonal'
import { getChord } from './chords'
import type { ChordQualityId } from './types'

/**
 * Jazz voicings: LH shells, RH guide tones, and voice-led progressions.
 * All pure midi math — screens and lesson generators consume the numbers.
 */

/** Qualities that have a 7th and therefore a meaningful shell. */
export const SHELL_QUALITIES: ChordQualityId[] = [
  'dominant 7th',
  'major 7th',
  'minor 7th',
  'half-diminished',
  'diminished 7th',
]

export interface ShellVoicing {
  /** Bottom-to-top midis (root low, shell tone above) */
  midis: number[]
  label: string
}

/**
 * Bud Powell-style LH shell: root plus one color tone.
 * Shape A = root + 7th, shape B = root + 3rd.
 */
export function shellVoicing(root: string, quality: ChordQualityId, shape: 'A' | 'B'): ShellVoicing {
  const chord = getChord(root, quality, 0)
  const rootMidi = chord.midi[0] - 12 // shells live around octave 3
  const interval = shape === 'A' ? chord.midi[3] - chord.midi[0] : chord.midi[1] - chord.midi[0]
  return {
    midis: [rootMidi, rootMidi + interval],
    label: `${chord.symbol} shell ${shape} (root + ${shape === 'A' ? '7th' : '3rd'})`,
  }
}

export interface ProgressionChord {
  symbol: string
  /** LH root, low register */
  rootMidi: number
  /** RH guide tones (3rd & 7th), voice-led from the previous chord */
  guideMidis: number[]
}

/** Nearest midi with the given pitch class to a target midi. */
function nearestMidi(pc: string, target: number): number {
  const chroma = Note.chroma(pc)!
  let best = target
  let bestDist = Infinity
  for (let midi = target - 11; midi <= target + 11; midi++) {
    if (((midi % 12) + 12) % 12 !== chroma) continue
    const dist = Math.abs(midi - target)
    if (dist < bestDist) {
      best = midi
      bestDist = dist
    }
  }
  return best
}

/**
 * Voice-lead a series of chords' guide tones (3rd & 7th): the first chord
 * voices near middle C; each following chord assigns its two tones to the
 * two voices with minimal total movement.
 */
export function guideToneLine(chords: { root: string; quality: ChordQualityId }[]): number[][] {
  const out: number[][] = []
  let v1: number | null = null
  let v2: number | null = null
  for (const spec of chords) {
    const chord = getChord(spec.root, spec.quality, 0)
    const thirdPc = Note.pitchClass(chord.noteNames[1])
    const seventhPc = Note.pitchClass(chord.noteNames[3])
    if (v1 === null || v2 === null) {
      v1 = nearestMidi(thirdPc, 64)
      v2 = nearestMidi(seventhPc, v1 + 6)
    } else {
      // Try both assignments, keep the one that moves least.
      const a1 = nearestMidi(thirdPc, v1)
      const a2 = nearestMidi(seventhPc, v2)
      const b1 = nearestMidi(seventhPc, v1)
      const b2 = nearestMidi(thirdPc, v2)
      const costA = Math.abs(a1 - v1) + Math.abs(a2 - v2)
      const costB = Math.abs(b1 - v1) + Math.abs(b2 - v2)
      if (costA <= costB) {
        v1 = a1
        v2 = a2
      } else {
        v1 = b1
        v2 = b2
      }
    }
    out.push([Math.min(v1, v2), Math.max(v1, v2)])
  }
  return out
}

/** ii–V–I in a major key with voice-led guide tones and LH roots. */
export function iiVIVoicings(key: string): ProgressionChord[] {
  const scale = Note.get(`${key}4`)
  if (scale.empty) throw new Error(`Bad key: ${key}`)
  const degrees: { pc: string; quality: ChordQualityId; suffix: string }[] = [
    { pc: Note.pitchClass(Note.transpose(`${key}4`, '2M')), quality: 'minor 7th', suffix: 'm7' },
    { pc: Note.pitchClass(Note.transpose(`${key}4`, '5P')), quality: 'dominant 7th', suffix: '7' },
    { pc: key, quality: 'major 7th', suffix: 'maj7' },
  ]
  const guides = guideToneLine(degrees.map((d) => ({ root: d.pc, quality: d.quality })))
  return degrees.map((d, i) => ({
    symbol: `${d.pc}${d.suffix}`,
    rootMidi: nearestMidi(d.pc, 45),
    guideMidis: guides[i],
  }))
}
