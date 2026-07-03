import type { Finger, Hand } from '../../theory/types'

export interface SongNote {
  midi: number
  /** Onset in beats from the start of the measure (quarter = 1) */
  startBeat: number
  durationBeats: number
  hand: Hand
  finger?: Finger
}

export interface SongMeasure {
  notes: SongNote[]
}

export interface SongSection {
  label: string
  /** 0-based, inclusive */
  fromMeasure: number
  toMeasure: number
}

export interface Song {
  id: string
  title: string
  composer: string
  /** Difficulty grade, roughly aligned with early exam grades */
  grade: 1 | 2 | 3 | 4
  style: 'classical' | 'folk' | 'jazz' | 'blues'
  keySignature: string
  timeSignature: [number, number]
  tempoBpm: number
  /** Swing feel: off-beat eighths play/grade late (2/3 beat) */
  swing?: boolean
  sections: SongSection[]
  measures: SongMeasure[]
}

export const beatsPerMeasure = (song: Song): number => (song.timeSignature[0] * 4) / song.timeSignature[1]
