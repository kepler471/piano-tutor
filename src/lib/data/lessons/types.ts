import type { Finger, Hand } from '../../theory/types'

export interface LessonStep {
  /** All midis expected to sound together (one entry for melodic steps) */
  midis: number[]
  /** Per-midi fingering, same order as midis */
  fingers: (Finger | null)[]
  /** Optional label shown under the step, e.g. a chord symbol */
  label?: string
  /** Per-midi hand, same order as midis — routes notes to staves on a grand staff */
  hands?: (Hand | null)[]
  /** Timed material (songs, rhythm-graded reads): onset in beats from segment start */
  startBeat?: number
  /** Note length in beats (quarter note = 1); rendering defaults to 1 when absent */
  durationBeats?: number
}

export interface LessonSegment {
  label: string
  hand: Hand | 'both'
  clef: 'treble' | 'bass' | 'grand'
  /** Overrides the lesson's detectionMode (e.g. hands-together needs chords on mic) */
  detectionMode?: 'mono' | 'poly'
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
