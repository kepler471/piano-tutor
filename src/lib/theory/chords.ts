import { Chord, Note } from 'tonal'
import type { ChordInfo, ChordQualityId } from './types'

export const CHORD_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

export const CHORD_QUALITIES: { id: ChordQualityId; tonalType: string; suffix: string; size: 3 | 4 }[] = [
  { id: 'major', tonalType: 'M', suffix: '', size: 3 },
  { id: 'minor', tonalType: 'm', suffix: 'm', size: 3 },
  { id: 'diminished', tonalType: 'dim', suffix: 'dim', size: 3 },
  { id: 'augmented', tonalType: 'aug', suffix: 'aug', size: 3 },
  { id: 'dominant 7th', tonalType: '7', suffix: '7', size: 4 },
  { id: 'major 7th', tonalType: 'maj7', suffix: 'maj7', size: 4 },
  { id: 'minor 7th', tonalType: 'm7', suffix: 'm7', size: 4 },
  { id: 'half-diminished', tonalType: 'm7b5', suffix: 'm7♭5', size: 4 },
  { id: 'diminished 7th', tonalType: 'dim7', suffix: 'dim7', size: 4 },
  { id: 'major 6th', tonalType: '6', suffix: '6', size: 4 },
]

const INVERSION_LABELS = ['root position', '1st inversion', '2nd inversion', '3rd inversion']

/** tonal returns pitch classes; stack them ascending starting at the root in octave 4. */
function stackAscending(pitchClasses: string[], rootOctave = 4): string[] {
  const names: string[] = []
  let prev = Note.midi(`${pitchClasses[0]}${rootOctave}`)! - 1
  for (const pc of pitchClasses) {
    for (let oct = rootOctave - 1; oct <= rootOctave + 2; oct++) {
      const m = Note.midi(`${pc}${oct}`)
      if (m !== null && m > prev) {
        names.push(`${pc}${oct}`)
        prev = m
        break
      }
    }
  }
  return names
}

function invertUp(noteNames: string[], inversion: number): string[] {
  const out = [...noteNames]
  for (let i = 0; i < inversion; i++) {
    const bottom = out.shift()!
    out.push(Note.transpose(bottom, '8P'))
  }
  return out
}

export function getChord(root: string, quality: ChordQualityId, inversion = 0): ChordInfo {
  const def = CHORD_QUALITIES.find((q) => q.id === quality)
  if (!def) throw new Error(`Unknown chord quality: ${quality}`)
  if (inversion < 0 || inversion >= def.size) {
    throw new Error(`Invalid inversion ${inversion} for ${quality}`)
  }
  const chord = Chord.getChord(def.tonalType, root)
  if (chord.empty) throw new Error(`tonal could not build chord: ${root} ${quality}`)
  const noteNames = invertUp(stackAscending(chord.notes), inversion)
  return {
    id: `${root}${def.suffix} (${INVERSION_LABELS[inversion]})`,
    root,
    quality,
    symbol: `${root}${def.suffix}`,
    inversion,
    noteNames,
    midi: noteNames.map((n) => Note.midi(n)!),
  }
}

export function inversionsFor(quality: ChordQualityId): number[] {
  const def = CHORD_QUALITIES.find((q) => q.id === quality)!
  return Array.from({ length: def.size }, (_, i) => i)
}
