import type { ScaleTypeId } from '../theory/types'

/**
 * Per-family learning guidance shown on the Scales screen: which keys to learn
 * first (and why), and how to practice the family. Follows the pianofs guide
 * "The Best Scales to Learn First on Piano" — the same ordering the learning
 * guide's stages walk through. Exhaustive by ScaleTypeId so a new scale type
 * cannot ship without its guidance.
 */
export interface ScaleGuidance {
  /** Which keys to learn first in this family, and why. */
  order: string
  /** How to practice the family (not everything needs up-and-down drilling). */
  practice: string
}

export const SCALE_GUIDANCE: Record<ScaleTypeId, ScaleGuidance> = {
  major: {
    order:
      'Start with C major — all white keys. Then add sharps around the circle of fifths: G, D, A and E share C major\'s finger numbers, so learn them as a family. Flat keys (F, Bb, Eb…) and the black-key scales come later, unless a piece needs one sooner.',
    practice:
      'Memorize these — major scales underpin chords, key signatures and progressions. But don\'t finish all twelve before moving on: once three or four are secure, start the minors alongside them.',
  },
  'natural minor': {
    order:
      'Start with A minor (all white keys), then C minor — the three notes flattened from C major are all black keys, so they stand out. Then G, F, D, E and B minor before the rest.',
    practice:
      'Derive each one from its relative major: play the major scale starting on its 6th note, or flatten the 3rd, 6th and 7th of the parallel major.',
  },
  'harmonic minor': {
    order:
      'Learn harmonic and melodic minor side by side, starting in C or A where the altered notes are easiest to see. Dorian is worth meeting around the same time — it is built and used in similar ways.',
    practice:
      'Listen for the raised 7th\'s pull home — that extra-wide step near the top is the whole point of the scale.',
  },
  blues: {
    order: 'Begin with C and A — the same two keys you started the pentatonics in.',
    practice:
      'The blues scale is just the minor pentatonic plus one "blue" note (the b5). Focus on what the notes are and what you can do with them — make phrases, don\'t only run it up and down.',
  },
  'major pentatonic': {
    order: 'Begin with C and A, in both the major and minor versions.',
    practice:
      'Five notes that never clash — improvise with them over simple chords rather than drilling them like the majors and minors.',
  },
  'minor pentatonic': {
    order: 'Begin with A and C, in both the minor and major versions.',
    practice:
      'The go-to improvising scale of rock and blues. Learn where the notes sit and make phrases from them — add one blue note and you have the blues scale.',
  },
  dorian: {
    order:
      'One of the first two modes worth learning (with Mixolydian) — it is everywhere in blues, rock, jazz and funk. Find it on white keys first: D to D.',
    practice:
      'Understand it and find it from any root; there is no need to drill modes for speed the way you do majors and minors.',
  },
  mixolydian: {
    order:
      'One of the first two modes worth learning (with Dorian) — it is everywhere in blues, rock, jazz and funk. Find it on white keys first: G to G.',
    practice:
      'Understand it and find it from any root; there is no need to drill modes for speed the way you do majors and minors.',
  },
  lydian: {
    order:
      'Come to this after Dorian and Mixolydian. Remember Ionian is just the major scale and Aeolian the natural minor — so you already know five of the seven modes. F lydian is all white keys.',
    practice:
      'Don\'t drill it for speed — learn what makes it different (the raised 4th) and find it on the keyboard from a few roots.',
  },
  phrygian: {
    order:
      'Come to this after Dorian and Mixolydian. Remember Ionian is just the major scale and Aeolian the natural minor — so you already know five of the seven modes. E phrygian is all white keys.',
    practice:
      'Don\'t drill it for speed — learn what makes it different (the lowered 2nd) and find it on the keyboard from a few roots.',
  },
  locrian: {
    order:
      'The last mode most players learn — rare in real music. B locrian is all white keys, which is the easiest place to hear its unstable sound.',
    practice:
      'Don\'t drill it for speed — learn what makes it different (lowered 2nd and 5th) and find it on the keyboard from a few roots.',
  },
}
