import type { Finger, Hand } from '../../theory/types'

export interface LessonStep {
  /** All midis expected to sound together (one entry for melodic steps) */
  midis: number[]
  /** Per-midi fingering, same order as midis */
  fingers: (Finger | null)[]
  /** Optional label shown under the step, e.g. a chord symbol */
  label?: string
}

export interface LessonSegment {
  label: string
  hand: Hand
  clef: 'treble' | 'bass'
  steps: LessonStep[]
}

export interface Lesson {
  id: string
  title: string
  /** Practice method this comes from, e.g. 'Hanon', 'Five-finger' */
  method: string
  description: string
  /** Practical tips shown in the player */
  tips: string[]
  detectionMode: 'mono' | 'poly'
  keySignature: string
  tempoBpm: number
  segments: LessonSegment[]
}
