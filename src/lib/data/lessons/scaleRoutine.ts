import { Note } from 'tonal'
import { getScale, MAJOR_ROOTS, MINOR_ROOTS } from '../../theory/scales'
import { scaleFingerings } from '../scaleFingerings'
import type { Finger } from '../../theory/types'
import type { Lesson, LessonSegment, LessonStep } from './types'

/**
 * Scale routines in every key: one and two octaves, hands separate and
 * together — the daily bread of piano practice.
 */

/**
 * Two-octave ascending fingering from the one-octave pattern (incl. top root).
 * RH: the first octave drops its capping finger and the pattern restarts —
 * e.g. C major 12312345 → 1231234 12312345.
 */
export function twoOctaveRh(oneOctave: Finger[]): Finger[] {
  return [...oneOctave.slice(0, -1), ...oneOctave]
}

/**
 * LH mirrors the RH rule: the pattern repeats from its second entry after the
 * bottom octave — e.g. C major 54321321 → 54321321 4321321.
 */
export function twoOctaveLh(oneOctave: Finger[]): Finger[] {
  return [...oneOctave, ...oneOctave.slice(1)]
}

export const upDown = (midis: number[], fingers: (Finger | null)[]): LessonStep[] => {
  const m = [...midis, ...midis.slice(0, -1).reverse()]
  const f = [...fingers, ...fingers.slice(0, -1).reverse()]
  return m.map((midi, i) => ({ midis: [midi], fingers: [f[i]] }))
}

/** Parallel-motion steps: LH an octave below RH, both hands on every step. */
export const handsTogether = (rhMidis: number[], rh: (Finger | null)[], lh: (Finger | null)[]): LessonStep[] => {
  const rhUpDown = [...rhMidis, ...rhMidis.slice(0, -1).reverse()]
  const rhF = [...rh, ...rh.slice(0, -1).reverse()]
  const lhF = [...lh, ...lh.slice(0, -1).reverse()]
  return rhUpDown.map((midi, i) => ({
    midis: [midi - 12, midi],
    fingers: [lhF[i], rhF[i]],
    hands: ['L', 'R'],
  }))
}

function scaleSegments(root: string, type: 'major' | 'natural minor' | 'harmonic minor'): LessonSegment[] {
  const scale = getScale(root, type)
  const fingering = scaleFingerings[scale.id]
  const oneOct = scale.midi
  const twoOct = [...oneOct.slice(0, -1), ...oneOct.map((m) => m + 12)]
  const rh2 = twoOctaveRh(fingering.rh)
  const lh2 = twoOctaveLh(fingering.lh)
  return [
    { label: 'Right hand', hand: 'R', clef: 'treble', steps: upDown(oneOct, fingering.rh) },
    { label: 'Left hand', hand: 'L', clef: 'bass', steps: upDown(oneOct.map((m) => m - 12), fingering.lh) },
    {
      label: 'Hands together',
      hand: 'both',
      clef: 'grand',
      detectionMode: 'poly',
      steps: handsTogether(oneOct, fingering.rh, fingering.lh),
    },
    { label: 'RH · 2 octaves', hand: 'R', clef: 'treble', steps: upDown(twoOct, rh2) },
    { label: 'LH · 2 octaves', hand: 'L', clef: 'bass', steps: upDown(twoOct.map((m) => m - 24), lh2) },
    {
      label: 'Together · 2 octaves',
      hand: 'both',
      clef: 'grand',
      detectionMode: 'poly',
      steps: handsTogether(twoOct, rh2, lh2),
    },
  ]
}

const THUMB_TIPS: Record<string, string> = {
  C: 'Right hand: the thumb passes under after finger 3 (on F).',
  G: 'Right hand: the thumb passes under after finger 3 (on C).',
  F: 'Right hand uses 1-2-3-4 — the thumb passes under after finger 4 (on Bb there is no thumb!).',
}

/** C–E majors share C major's finger numbers — learn them as a family (pianofs). */
const SHARED_PATTERN_ROOTS = new Set(['C', 'G', 'D', 'A', 'E'])
const BLACK_KEY_ROOTS = new Set(['F#', 'Db', 'Ab', 'Eb', 'Bb'])

/**
 * The natural minors in learn-first order (pianofs): A first (all white keys),
 * then C — its three flattened notes are all black keys, so they stand out —
 * then the rest by increasing accidentals. Same 12 spellings as MINOR_ROOTS.
 */
export const NATURAL_MINOR_ORDER = ['A', 'C', 'G', 'F', 'D', 'E', 'B', 'F#', 'C#', 'G#', 'Eb', 'Bb']

const relativeMajor = (minorRoot: string): string => Note.pitchClass(Note.transpose(`${minorRoot}4`, '3m'))

export function scaleRoutineLessons(): Lesson[] {
  const majors: Lesson[] = MAJOR_ROOTS.map((root) => ({
    id: `scale-${root}-major`,
    title: `${root} major scale`,
    method: 'Scale routine',
    description: `Play the ${root} major scale up and down with the standard fingering shown on the score — hands separate first, then together.`,
    tips: [
      ...(THUMB_TIPS[root] ? [THUMB_TIPS[root]] : []),
      ...(SHARED_PATTERN_ROOTS.has(root)
        ? ['C, G, D, A and E major all share this exact finger pattern — learn them as a family.']
        : []),
      ...(BLACK_KEY_ROOTS.has(root)
        ? ['Starting on a black key means a different fingering — learn this pattern fresh rather than forcing the C major one.']
        : []),
      'Keep the wrist level as the thumb passes under — no elbow flick.',
      'Aim for a smooth, connected (legato) line at a steady pulse.',
      'Hands together: start very slowly — accuracy first, speed later.',
    ],
    detectionMode: 'mono',
    keySignature: root,
    tempoBpm: 72,
    segments: scaleSegments(root, 'major'),
  }))
  const naturalMinors: Lesson[] = NATURAL_MINOR_ORDER.map((root) => ({
    id: `scale-${root}-natural-minor`,
    title: `${root} natural minor scale`,
    method: 'Scale routine',
    description: `Play the ${root} natural minor scale up and down — only the notes of the key signature, the same notes as ${relativeMajor(root)} major starting from ${root}.`,
    tips: [
      `Find it from the relative major: play ${relativeMajor(root)} major starting on its 6th note and you get this scale.`,
      ...(root === 'C'
        ? ['The three notes flattened from C major (Eb, Ab, Bb) are all black keys — let your eyes find them.']
        : []),
      'Keep the wrist level as the thumb passes under — no elbow flick.',
      'Hands together: start very slowly — accuracy first, speed later.',
    ],
    detectionMode: 'mono',
    keySignature: `${root}m`,
    tempoBpm: 66,
    segments: scaleSegments(root, 'natural minor'),
  }))
  const harmonicMinors: Lesson[] = MINOR_ROOTS.map((root) => ({
    id: `scale-${root}-harmonic-minor`,
    title: `${root} harmonic minor scale`,
    method: 'Scale routine',
    description: `Play the ${root} harmonic minor scale up and down — note the raised 7th, which gives the scale its distinctive sound.`,
    tips: [
      'The raised 7th creates a wide step from the 6th degree — listen for it.',
      'Practice this alongside the melodic minor in the same key — two answers to the same problem (a stronger pull home).',
      'Keep the wrist level as the thumb passes under — no elbow flick.',
      'Hands together: start very slowly — accuracy first, speed later.',
    ],
    detectionMode: 'mono',
    keySignature: `${root}m`,
    tempoBpm: 66,
    segments: scaleSegments(root, 'harmonic minor'),
  }))
  return [...majors, ...naturalMinors, ...harmonicMinors]
}
