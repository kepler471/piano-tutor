import { Note } from 'tonal'
import type { Finger } from '../../theory/types'
import type { Lesson, LessonStep } from './types'

/**
 * I–IV–V–I cadence drill with standard beginner voicings that keep the hand in
 * one place: I in root position, IV in second inversion, V in first inversion.
 * Requires polyphonic (chord) detection.
 */
interface Voicing {
  label: string
  notes: string[]
  rhFingers: Finger[]
  lhFingers: Finger[]
}

function cadenceVoicings(root: string): Voicing[] {
  const t = (name: string, interval: string) => Note.transpose(name, interval)
  const tonic = `${root}4`
  return [
    {
      label: `${root} (I)`,
      notes: [tonic, t(tonic, '3M'), t(tonic, '5P')],
      rhFingers: [1, 3, 5],
      lhFingers: [5, 3, 1],
    },
    {
      label: `IV (2nd inv)`,
      notes: [tonic, t(tonic, '4P'), t(tonic, '6M')],
      rhFingers: [1, 4, 5],
      lhFingers: [5, 2, 1],
    },
    {
      label: `V (1st inv)`,
      notes: [t(tonic, '-2m'), t(tonic, '2M'), t(tonic, '5P')],
      rhFingers: [1, 3, 5],
      lhFingers: [5, 3, 1],
    },
    {
      label: `${root} (I)`,
      notes: [tonic, t(tonic, '3M'), t(tonic, '5P')],
      rhFingers: [1, 3, 5],
      lhFingers: [5, 3, 1],
    },
  ]
}

function toSteps(voicings: Voicing[], hand: 'R' | 'L'): LessonStep[] {
  return voicings.map((v) => ({
    midis: v.notes.map((n) => Note.midi(n)! - (hand === 'L' ? 12 : 0)),
    fingers: (hand === 'R' ? v.rhFingers : v.lhFingers) as (Finger | null)[],
    label: v.label,
  }))
}

export function cadenceLessons(): Lesson[] {
  return ['C', 'G', 'F'].map((root) => {
    const voicings = cadenceVoicings(root)
    return {
      id: `cadence-${root}`,
      title: `I–IV–V–I cadence in ${root}`,
      method: 'Cadence drills',
      description: `Play the chord progression I–IV–V–I in ${root} major. These voicings keep your hand in one position — only one or two fingers move between chords.`,
      tips: [
        'Notice the common tone held between chords — keep that finger down.',
        'Press all three notes at exactly the same moment.',
        'Practice the “grip”: form each chord shape in the air before playing it.',
      ],
      detectionMode: 'poly' as const,
      keySignature: root,
      tempoBpm: 60,
      segments: [
        { label: 'Right hand', hand: 'R' as const, clef: 'treble' as const, steps: toSteps(voicings, 'R') },
        { label: 'Left hand', hand: 'L' as const, clef: 'bass' as const, steps: toSteps(voicings, 'L') },
      ],
    }
  })
}
