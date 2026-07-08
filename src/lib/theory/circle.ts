import { Note } from 'tonal'
import { MAJOR_ROOTS, MINOR_ROOTS } from './scales'

/**
 * Circle-of-fifths model — the canonical home of key-signature facts.
 * Pure data + lookups (no DOM); the quiz generators and the /circle screen
 * both consume this.
 */

export const SHARP_ORDER = ['F♯', 'C♯', 'G♯', 'D♯', 'A♯', 'E♯', 'B♯']
export const FLAT_ORDER = ['B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'C♭', 'F♭']
export const SHARP_COUNTS: Record<string, number> = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6 }
export const FLAT_COUNTS: Record<string, number> = { F: 1, Bb: 2, Eb: 3, Ab: 4, Db: 5 }

export const RELATIVE_MINOR: Record<string, string> = {
  C: 'A', G: 'E', D: 'B', A: 'F#', E: 'C#', B: 'G#', 'F#': 'D#',
  F: 'D', Bb: 'G', Eb: 'C', Ab: 'F', Db: 'Bb',
}

/** The accidentals a major key's signature carries, in signature order. */
export function sigAccidentals(major: string): { kind: 'sharps' | 'flats' | 'none'; names: string[] } {
  const sharps = SHARP_COUNTS[major]
  if (sharps !== undefined) {
    return sharps === 0 ? { kind: 'none', names: [] } : { kind: 'sharps', names: SHARP_ORDER.slice(0, sharps) }
  }
  return { kind: 'flats', names: FLAT_ORDER.slice(0, FLAT_COUNTS[major]) }
}

export interface CircleKey {
  /** Position 0–11 clockwise from C at 12 o'clock. */
  index: number
  /** Major key in its conventional spelling ('F#', 'Db', …). */
  major: string
  /** Relative minor as conventionally written next to the major ('D#' for F#). */
  minor: string
  /** Spelling of the relative minor that resolves in the scales library ('Eb' for F# major). */
  minorScaleRoot: string
  accidentals: { kind: 'sharps' | 'flats' | 'none'; names: string[] }
  /** The other spelling at the six-o'clock seam ('Gb' on the F# slot). */
  enharmonic?: string
}

/** The theoretical relative minor vs. the spelling the scale catalog uses (D# minor → Eb minor). */
function minorScaleRootFor(minor: string): string {
  if (MINOR_ROOTS.includes(minor)) return minor
  const chroma = Note.chroma(minor)
  const match = MINOR_ROOTS.find((r) => Note.chroma(r) === chroma)
  if (match === undefined) throw new Error(`No minor scale root matches ${minor}`)
  return match
}

/** MAJOR_ROOTS is already in fifths order, so the circle is a direct mapping. */
export const CIRCLE_KEYS: CircleKey[] = MAJOR_ROOTS.map((major, index) => ({
  index,
  major,
  minor: RELATIVE_MINOR[major],
  minorScaleRoot: minorScaleRootFor(RELATIVE_MINOR[major]),
  accidentals: sigAccidentals(major),
  ...(major === 'F#' ? { enharmonic: 'Gb' } : {}),
}))

function circleIndex(major: string): number {
  const i = MAJOR_ROOTS.indexOf(major)
  if (i === -1) throw new Error(`Not a circle key: ${major}`)
  return i
}

/** One step clockwise: up a perfect fifth, one more sharp (or one fewer flat). */
export function fifthUp(major: string): string {
  return CIRCLE_KEYS[(circleIndex(major) + 1) % 12].major
}

/** One step anticlockwise: down a perfect fifth, one more flat (or one fewer sharp). */
export function fifthDown(major: string): string {
  return CIRCLE_KEYS[(circleIndex(major) + 11) % 12].major
}

/** The two adjacent keys on the circle: [fifth down, fifth up]. */
export function neighborsOf(major: string): [string, string] {
  return [fifthDown(major), fifthUp(major)]
}
