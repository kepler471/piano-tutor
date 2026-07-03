import { Note, Scale } from 'tonal'
import type { Finger } from '../../theory/types'
import type { Lesson, LessonStep } from './types'

/**
 * Hanon "The Virtuoso Pianist" No. 1, ascending half (8 bars, public domain).
 * Each bar plays scale degrees (relative to the bar's start): 1 3 4 5 6 5 4 3,
 * then the pattern shifts up one step.
 */
const DEGREE_OFFSETS = [0, 2, 3, 4, 5, 4, 3, 2]
const RH_FINGERS: Finger[] = [1, 2, 3, 4, 5, 4, 3, 2]
const LH_FINGERS: Finger[] = [5, 4, 3, 2, 1, 2, 3, 4]

function bars(startOctave: number): number[][] {
  // Two octaves of C major to index into
  const pool = [
    ...Scale.get(`C${startOctave} major`).notes,
    ...Scale.get(`C${startOctave + 1} major`).notes,
    ...Scale.get(`C${startOctave + 2} major`).notes,
  ].map((n) => Note.midi(n)!)
  return Array.from({ length: 8 }, (_, bar) => DEGREE_OFFSETS.map((d) => pool[bar + d]))
}

function steps(startOctave: number, fingers: Finger[]): LessonStep[] {
  return bars(startOctave).flatMap((bar) =>
    bar.map((m, i) => ({ midis: [m], fingers: [fingers[i]] as (Finger | null)[] })),
  )
}

export function hanon1Lesson(): Lesson {
  return {
    id: 'hanon-1',
    title: 'Hanon No. 1 (ascending, 8 bars)',
    method: 'Hanon',
    description:
      'The first exercise from Hanon’s “The Virtuoso Pianist”. A repeating pattern that climbs one step per bar — it stretches the weak fingers (4 and 5) and builds evenness.',
    tips: [
      'The same fingering repeats every bar: RH 1-2-3-4-5-4-3-2.',
      'Lift each finger cleanly; no two keys held at once.',
      'Start at 60 BPM and only speed up when every note is even.',
    ],
    detectionMode: 'mono',
    keySignature: 'C',
    tempoBpm: 60,
    segments: [
      { label: 'Right hand', hand: 'R', clef: 'treble', steps: steps(4, RH_FINGERS) },
      { label: 'Left hand', hand: 'L', clef: 'bass', steps: steps(2, LH_FINGERS) },
    ],
  }
}
