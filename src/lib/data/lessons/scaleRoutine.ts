import { getScale } from '../../theory/scales'
import { scaleFingerings } from '../scaleFingerings'
import type { Finger } from '../../theory/types'
import type { Lesson, LessonSegment } from './types'

/** One-octave scale, up and down, hands separate — the daily bread of piano practice. */
function scaleSegments(root: string): LessonSegment[] {
  const scale = getScale(root, 'major')
  const fingering = scaleFingerings[scale.id]
  const upDown = (midis: number[], fingers: Finger[]) => {
    const m = [...midis, ...midis.slice(0, -1).reverse()]
    const f = [...fingers, ...fingers.slice(0, -1).reverse()]
    return m.map((midi, i) => ({ midis: [midi], fingers: [f[i]] as (Finger | null)[] }))
  }
  return [
    {
      label: 'Right hand',
      hand: 'R',
      clef: 'treble',
      steps: upDown(scale.midi, fingering.rh),
    },
    {
      label: 'Left hand',
      hand: 'L',
      clef: 'bass',
      steps: upDown(scale.midi.map((m) => m - 12), fingering.lh),
    },
  ]
}

const THUMB_TIPS: Record<string, string> = {
  C: 'Right hand: the thumb passes under after finger 3 (on F).',
  G: 'Right hand: the thumb passes under after finger 3 (on C).',
  F: 'Right hand uses 1-2-3-4 — the thumb passes under after finger 4 (on Bb there is no thumb!).',
}

export function scaleRoutineLessons(): Lesson[] {
  return ['C', 'G', 'F'].map((root) => ({
    id: `scale-${root}-major`,
    title: `${root} major scale (one octave)`,
    method: 'Scale routine',
    description: `Play the ${root} major scale one octave up and down, one hand at a time, using the standard fingering shown on the score.`,
    tips: [
      THUMB_TIPS[root],
      'Keep the wrist level as the thumb passes under — no elbow flick.',
      'Aim for a smooth, connected (legato) line at a steady pulse.',
    ],
    detectionMode: 'mono',
    keySignature: root,
    tempoBpm: 72,
    segments: scaleSegments(root),
  }))
}
