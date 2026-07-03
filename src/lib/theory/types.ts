export type Finger = 1 | 2 | 3 | 4 | 5
export type Hand = 'L' | 'R'

export type ScaleTypeId =
  | 'major'
  | 'natural minor'
  | 'harmonic minor'
  | 'blues'
  | 'dorian'
  | 'mixolydian'
  | 'major pentatonic'

export interface ScaleInfo {
  /** e.g. 'C major', 'F# natural minor' — also the key into scaleFingerings */
  id: string
  root: string
  type: ScaleTypeId
  /** Pitch classes ascending, correctly spelled (e.g. F# major contains E#) */
  notes: string[]
  /** One octave ascending incl. top root, anchored at octave 4 (RH reference) */
  noteNames: string[]
  midi: number[]
  /** VexFlow key signature spec, e.g. 'Db', 'F#m' */
  keySignature: string
}

export type ChordQualityId =
  | 'major'
  | 'minor'
  | 'diminished'
  | 'augmented'
  | 'dominant 7th'
  | 'major 7th'
  | 'minor 7th'
  | 'half-diminished'
  | 'diminished 7th'
  | 'major 6th'

export interface ChordInfo {
  /** e.g. 'C major (1st inversion)' */
  id: string
  root: string
  quality: ChordQualityId
  /** Chord symbol, e.g. 'Cmaj7' */
  symbol: string
  inversion: number
  /** Notes with octaves, bottom to top, anchored near octave 4 */
  noteNames: string[]
  midi: number[]
}
