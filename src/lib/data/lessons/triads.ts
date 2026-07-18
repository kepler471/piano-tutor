import { chordFingering } from '../chordFingerings'
import { getChord } from '../../theory/chords'
import type { ChordQualityId, Finger } from '../../theory/types'
import type { Lesson, LessonSegment, LessonStep } from './types'

/**
 * Unit-1 drills for the chord path: block triads in root position, first as
 * plain major/minor sets, then the four qualities side by side on one root so
 * the ear learns what the quality of the 3rd (and 5th) does to the colour.
 */

const METHOD = 'Triad drills'

function blockSteps(chords: { root: string; quality: ChordQualityId }[], hand: 'R' | 'L'): LessonStep[] {
  return chords.map(({ root, quality }) => {
    const chord = getChord(root, quality, 0)
    const fingering = chordFingering(3, 0)
    return {
      midis: chord.midi.map((m) => (hand === 'L' ? m - 12 : m)),
      fingers: (hand === 'R' ? fingering.rh : fingering.lh) as (Finger | null)[],
      label: chord.symbol,
    }
  })
}

function blockLesson(
  id: string,
  title: string,
  description: string,
  tips: string[],
  chords: { root: string; quality: ChordQualityId }[],
  keySignature: string
): Lesson {
  return {
    id,
    title,
    method: METHOD,
    description,
    tips,
    detectionMode: 'poly',
    keySignature,
    tempoBpm: 60,
    segments: [
      { label: 'Right hand', hand: 'R', clef: 'treble', steps: blockSteps(chords, 'R') },
      { label: 'Left hand', hand: 'L', clef: 'bass', steps: blockSteps(chords, 'L') },
    ] satisfies LessonSegment[],
  }
}

export function triadLessons(): Lesson[] {
  const major = (root: string) => ({ root, quality: 'major' as ChordQualityId })
  const minor = (root: string) => ({ root, quality: 'minor' as ChordQualityId })
  return [
    blockLesson(
      'triad-blocks-majors',
      'Major triads — C, F and G',
      'Play the three most common major triads as solid (block) chords: all three notes exactly together. Each is built the same way — a root, a major 3rd above it, and a 5th.',
      [
        'Form the whole hand shape in the air before you touch the keys.',
        'All three notes must sound at exactly the same instant — listen for stragglers.',
        'Feel the identical shape under your fingers as you move between roots.',
      ],
      [major('C'), major('F'), major('G'), major('C')],
      'C'
    ),
    blockLesson(
      'triad-blocks-minors',
      'Minor triads — Am, Dm and Em',
      'The three most common minor triads as block chords. Same shape as major, but the middle note — the 3rd — sits one semitone lower, and that single semitone is the whole difference between bright and dark.',
      [
        'Compare each one to its major cousin: only the middle finger moves.',
        'Play all three notes exactly together.',
        'Say the chord name aloud as you play it.',
      ],
      [minor('A'), minor('D'), minor('E'), minor('A')],
      'Am'
    ),
    blockLesson(
      'triad-quality-contrast',
      'Triad qualities side by side',
      'One root, four colours: major, minor, diminished and augmented on C, then the major/minor pair on G and F. Only the 3rd and 5th move — listen to what each shift does to the mood.',
      [
        'Major to minor: the 3rd drops a semitone. Minor to diminished: the 5th drops too.',
        'Augmented raises the 5th of the major triad — an unresolved, floating sound.',
        'Close your eyes after playing each pair and name the quality you hear.',
      ],
      [
        { root: 'C', quality: 'major' },
        { root: 'C', quality: 'minor' },
        { root: 'C', quality: 'diminished' },
        { root: 'C', quality: 'augmented' },
        { root: 'G', quality: 'major' },
        { root: 'G', quality: 'minor' },
        { root: 'F', quality: 'major' },
        { root: 'F', quality: 'minor' },
      ],
      'C'
    ),
  ]
}
