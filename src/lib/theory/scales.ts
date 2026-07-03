import { Scale, Note } from 'tonal'
import type { ScaleInfo, ScaleTypeId } from './types'

/** Conventional key spellings (Db not C#, F# not Gb for majors; Eb minor over D#). */
export const MAJOR_ROOTS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F']
export const MINOR_ROOTS = ['A', 'E', 'B', 'F#', 'C#', 'G#', 'Eb', 'Bb', 'F', 'C', 'G', 'D']

/** Jazz-relevant additions live on beginner-friendly roots (parents ≤ 2 accidentals). */
export const BLUES_ROOTS = ['C', 'F', 'G', 'Bb', 'Eb']
export const DORIAN_ROOTS = ['D', 'G', 'A', 'C', 'E']
export const MIXOLYDIAN_ROOTS = ['G', 'C', 'D', 'F', 'A']
export const PENTATONIC_ROOTS = ['C', 'G', 'F', 'D', 'A']

export const SCALE_TYPES: { id: ScaleTypeId; tonalName: string; roots: string[] }[] = [
  { id: 'major', tonalName: 'major', roots: MAJOR_ROOTS },
  { id: 'natural minor', tonalName: 'minor', roots: MINOR_ROOTS },
  { id: 'harmonic minor', tonalName: 'harmonic minor', roots: MINOR_ROOTS },
  { id: 'blues', tonalName: 'blues', roots: BLUES_ROOTS },
  { id: 'dorian', tonalName: 'dorian', roots: DORIAN_ROOTS },
  { id: 'mixolydian', tonalName: 'mixolydian', roots: MIXOLYDIAN_ROOTS },
  { id: 'major pentatonic', tonalName: 'major pentatonic', roots: PENTATONIC_ROOTS },
]

function keySignatureFor(root: string, type: ScaleTypeId): string {
  switch (type) {
    case 'major':
    case 'major pentatonic':
      return root
    case 'natural minor':
    case 'harmonic minor':
      return `${root}m`
    // Modes take their parent major's signature (D dorian → C).
    case 'dorian':
      return Note.pitchClass(Note.transpose(`${root}4`, '-2M'))
    case 'mixolydian':
      return Note.pitchClass(Note.transpose(`${root}4`, '4P'))
    // Blues gets the root-major signature; the b3/b5/b7 render as accidentals.
    case 'blues':
      return root
  }
}

export function getScale(root: string, type: ScaleTypeId): ScaleInfo {
  const def = SCALE_TYPES.find((t) => t.id === type)
  if (!def) throw new Error(`Unknown scale type: ${type}`)
  const scale = Scale.get(`${root}4 ${def.tonalName}`)
  if (scale.empty) throw new Error(`tonal could not build scale: ${root} ${type}`)
  const ascending = [...scale.notes, Note.transpose(scale.notes[0], '8P')]
  return {
    id: `${root} ${type}`,
    root,
    type,
    notes: scale.notes.map((n) => Note.pitchClass(n)),
    noteNames: ascending,
    midi: ascending.map((n) => Note.midi(n)!),
    keySignature: keySignatureFor(root, type),
  }
}

export function allScales(): ScaleInfo[] {
  return SCALE_TYPES.flatMap((t) => t.roots.map((r) => getScale(r, t.id)))
}
