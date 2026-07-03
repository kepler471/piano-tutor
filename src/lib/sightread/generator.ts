import { getScale } from '../theory/scales'
import type { Finger } from '../theory/types'
import type { Lesson, LessonStep } from '../data/lessons/types'

/**
 * Leveled sight-reading generator. Deterministic under a seed (tests);
 * random when none is given.
 *
 * L1 — C five-finger, right hand, quarters only
 * L2 — G/D/F five-finger positions, skips, quarters and halves
 * L3 — left hand in bass clef, keys up to 2 accidentals, one-octave range
 * L4 — eighths and dotted rhythms, wider right-hand range
 * L5 — hands together on the grand staff, chorale-style
 */
export type SightLevel = 1 | 2 | 3 | 4 | 5

export const SIGHT_LEVELS: Record<SightLevel, string> = {
  1: 'C position, quarters',
  2: 'New positions, halves',
  3: 'Bass clef, left hand',
  4: 'Eighths & dotted rhythms',
  5: 'Hands together',
}

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = <T>(arr: readonly T[], rng: () => number): T => arr[Math.floor(rng() * arr.length)]

/** Bar rhythm templates (durations in beats, summing to 4). */
const RHYTHM_TEMPLATES: Record<SightLevel, number[][]> = {
  1: [[1, 1, 1, 1]],
  2: [
    [1, 1, 1, 1],
    [2, 1, 1],
    [1, 1, 2],
    [2, 2],
    [1, 2, 1],
  ],
  3: [
    [1, 1, 1, 1],
    [2, 1, 1],
    [1, 1, 2],
    [2, 2],
  ],
  4: [
    [1, 0.5, 0.5, 1, 1],
    [1.5, 0.5, 1, 1],
    [0.5, 0.5, 1, 2],
    [1, 1, 1.5, 0.5],
    [0.5, 0.5, 0.5, 0.5, 2],
    [2, 1.5, 0.5],
  ],
  // Every template keeps onsets on beats 0 and 2 so the LH can move with them.
  5: [
    [1, 1, 1, 1],
    [2, 1, 1],
    [1, 1, 2],
    [2, 2],
  ],
}

const LEVEL_KEYS: Record<SightLevel, string[]> = {
  1: ['C'],
  2: ['G', 'D', 'F'],
  3: ['C', 'G', 'F', 'D', 'Bb'],
  4: ['C', 'G', 'F', 'D', 'Bb'],
  5: ['C', 'G', 'F'],
}

const BARS = 2

/** Random walk over scale-degree indices: stepwise bias, occasional skip. */
function melodyWalk(count: number, maxIndex: number, rng: () => number, startIndex = 0): number[] {
  const out = [startIndex]
  let idx = startIndex
  for (let i = 1; i < count; i++) {
    const moves = [-2, -1, -1, 1, 1, 2]
    let next = idx + pick(moves, rng)
    next = Math.max(0, Math.min(maxIndex, next))
    if (next === idx) next = idx + (idx === maxIndex ? -1 : 1)
    idx = next
    out.push(idx)
  }
  return out
}

export function makeSightReading(level: SightLevel, seed?: number): Lesson {
  const actualSeed = seed ?? Math.floor(Math.random() * 2 ** 31)
  const rng = mulberry32(actualSeed)
  const key = pick(LEVEL_KEYS[level], rng)
  const scale = getScale(key, 'major')

  // Rhythm: one template per bar, flattened with running startBeat.
  const slots: { startBeat: number; durationBeats: number }[] = []
  for (let b = 0; b < BARS; b++) {
    let beat = b * 4
    for (const d of pick(RHYTHM_TEMPLATES[level], rng)) {
      slots.push({ startBeat: beat, durationBeats: d })
      beat += d
    }
  }

  // Pitch material per level.
  const fiveFinger = scale.midi.slice(0, 5)
  const octave = scale.midi // 8 entries incl. top root
  const wide = [...scale.midi, ...scale.midi.slice(1, 3).map((m) => m + 12)] // 10 degrees

  let steps: LessonStep[]
  let clef: 'treble' | 'bass' | 'grand'
  let hand: 'R' | 'L' | 'both'

  if (level === 3) {
    clef = 'bass'
    hand = 'L'
    const lhOctave = octave.map((m) => m - 24) // octave 2–3, solid bass-clef range
    const walk = melodyWalk(slots.length, lhOctave.length - 1, rng)
    steps = slots.map((slot, i) => ({
      midis: [lhOctave[walk[i]]],
      fingers: [null],
      ...slot,
    }))
  } else if (level === 5) {
    clef = 'grand'
    hand = 'both'
    const walk = melodyWalk(slots.length, fiveFinger.length - 1, rng)
    const root = scale.midi[0] - 24
    const fifth = root + 7
    steps = slots.map((slot, i) => ({
      // Chorale texture: LH root/fifth moves with the melody.
      midis: [slot.startBeat % 4 < 2 ? root : fifth, fiveFinger[walk[i]]],
      fingers: [null, (walk[i] + 1) as Finger],
      hands: ['L', 'R'],
      ...slot,
    }))
  } else {
    clef = 'treble'
    hand = 'R'
    const material = level === 4 ? wide : fiveFinger
    const walk = melodyWalk(slots.length, material.length - 1, rng)
    steps = slots.map((slot, i) => ({
      midis: [material[walk[i]]],
      fingers: [level <= 2 ? ((walk[i] + 1) as Finger) : null],
      ...slot,
    }))
  }

  return {
    id: `sight-reading-L${level}-${actualSeed}`,
    title: `Sight-reading level ${level}: ${key} — ${SIGHT_LEVELS[level]}`,
    method: 'Sight-reading',
    description:
      level === 5
        ? 'Read both staves at once: the left hand anchors on the root and fifth while the right hand carries the melody.'
        : 'Read and play this short melody you have never seen before. Look at the score, not your hands.',
    tips: [
      'Look at the score, not the keyboard.',
      'Read ahead: while playing one note, your eyes find the next.',
      ...(level >= 2 ? ['Note values matter — give halves and dotted notes their full length.'] : []),
      'Get a new melody each time with “New melody”.',
    ],
    detectionMode: level === 5 ? 'poly' : 'mono',
    keySignature: key,
    tempoBpm: 60,
    segments: [
      {
        label: level === 5 ? 'Both hands' : level === 3 ? 'Left hand' : 'Right hand',
        hand,
        clef,
        ...(level === 5 ? { detectionMode: 'poly' as const } : {}),
        steps,
      },
    ],
  }
}
