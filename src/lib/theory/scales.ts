import { Scale, Note } from 'tonal'
import type { ScaleInfo, ScaleTypeId } from './types'

/** Conventional key spellings (Db not C#, F# not Gb for majors; Eb minor over D#). */
export const MAJOR_ROOTS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F']
export const MINOR_ROOTS = ['A', 'E', 'B', 'F#', 'C#', 'G#', 'Eb', 'Bb', 'F', 'C', 'G', 'D']

export const SCALE_TYPES: { id: ScaleTypeId; tonalName: string; roots: string[] }[] = [
  { id: 'major', tonalName: 'major', roots: MAJOR_ROOTS },
  { id: 'natural minor', tonalName: 'minor', roots: MINOR_ROOTS },
  { id: 'harmonic minor', tonalName: 'harmonic minor', roots: MINOR_ROOTS },
]

function keySignatureFor(root: string, type: ScaleTypeId): string {
  return type === 'major' ? root : `${root}m`
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
