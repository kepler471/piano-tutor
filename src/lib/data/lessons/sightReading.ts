import { Note, Scale } from 'tonal'
import type { Finger } from '../../theory/types'
import type { Lesson } from './types'

/**
 * Sight-reading drill: a random 8-note stepwise melody in C five-finger
 * position (C4–G4). Each finger stays over its own key, so the fingering is
 * simply the scale degree — the point is reading the staff, not moving the hand.
 */
export function makeSightReadingLesson(): Lesson {
  const position = Scale.get('C4 major').notes.slice(0, 5).map((n) => Note.midi(n)!)
  const melody: number[] = []
  let idx = 0 // start on C
  melody.push(position[idx])
  for (let i = 1; i < 8; i++) {
    // mostly stepwise, occasional skip, stay inside the position
    const moves = [-2, -1, -1, 1, 1, 2]
    let next = idx + moves[Math.floor(Math.random() * moves.length)]
    next = Math.max(0, Math.min(4, next))
    if (next === idx) next = idx + (idx === 4 ? -1 : 1)
    idx = next
    melody.push(position[idx])
  }
  return {
    id: `sight-reading-${melody.join('-')}`,
    title: 'Sight-reading: random melody in C position',
    method: 'Sight-reading',
    description:
      'Read and play this short melody you have never seen before. Every note is under one of your five fingers — read the staff, not your hands.',
    tips: [
      'Look at the score, not the keyboard.',
      'Read ahead: while playing one note, your eyes find the next.',
      'Get a new melody each time with “New melody”.',
    ],
    detectionMode: 'mono',
    keySignature: 'C',
    tempoBpm: 60,
    segments: [
      {
        label: 'Right hand',
        hand: 'R',
        clef: 'treble',
        steps: melody.map((m) => ({
          midis: [m],
          fingers: [(position.indexOf(m) + 1) as Finger],
        })),
      },
    ],
  }
}
