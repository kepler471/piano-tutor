import { Note } from 'tonal'
import { getScale } from '../../theory/scales'
import { guideToneLine, iiVIVoicings } from '../../theory/voicings'
import { scaleFingerings } from '../scaleFingerings'
import type { ChordQualityId, Finger } from '../../theory/types'
import type { Lesson, LessonSegment, LessonStep } from './types'

/**
 * Jazz & blues lessons: ii–V–I drills with voice-led guide tones, 12-bar
 * blues comping with shells, and the blues scale as a daily routine.
 */

const II_V_I_KEYS = ['C', 'F', 'Bb', 'G', 'Eb']
const BLUES_COMP_KEYS = ['C', 'F', 'Bb']
const BLUES_SCALE_KEYS = ['C', 'A', 'F', 'G']

const METHOD = 'Jazz & blues'

function iiVILessons(): Lesson[] {
  return II_V_I_KEYS.map((key) => {
    const chords = iiVIVoicings(key)
    const rootSteps: LessonStep[] = chords.map((c) => ({
      midis: [c.rootMidi],
      fingers: [null],
      label: c.symbol,
    }))
    const guideSteps: LessonStep[] = chords.map((c) => ({
      midis: c.guideMidis,
      fingers: [null, null],
      label: c.symbol,
    }))
    const togetherSteps: LessonStep[] = chords.map((c) => ({
      midis: [c.rootMidi, ...c.guideMidis],
      fingers: [null, null, null],
      hands: ['L', 'R', 'R'],
      label: c.symbol,
    }))
    const segments: LessonSegment[] = [
      { label: 'LH roots', hand: 'L', clef: 'bass', detectionMode: 'mono', steps: rootSteps },
      { label: 'Guide tones (RH)', hand: 'R', clef: 'treble', steps: guideSteps },
      { label: 'Hands together', hand: 'both', clef: 'grand', steps: togetherSteps },
    ]
    return {
      id: `jazz-251-${key}`,
      title: `ii–V–I in ${key}`,
      method: METHOD,
      description: `The most important progression in jazz: ${chords.map((c) => c.symbol).join(' → ')}. The right hand plays only the 3rd and 7th of each chord — the "guide tones" that define its sound — and each voice moves by two semitones at most.`,
      tips: [
        'Listen to how the guide tones melt from one chord into the next.',
        'Once comfortable, say each chord symbol aloud as you play it.',
        'Move this around the cycle: practice it in all the keys offered.',
      ],
      detectionMode: 'poly',
      keySignature: key,
      tempoBpm: 60,
      segments,
    }
  })
}

/** 12-bar blues: I I I I / IV IV I I / V IV I V, all dominant 7ths. */
const BLUES_FORM = [0, 0, 0, 0, 1, 1, 0, 0, 2, 1, 0, 2] // index into [I, IV, V]

function bluesCompLessons(): Lesson[] {
  return BLUES_COMP_KEYS.map((key) => {
    const rootPcs = [key, Note.pitchClass(Note.transpose(`${key}4`, '4P')), Note.pitchClass(Note.transpose(`${key}4`, '5P'))]
    const specs = BLUES_FORM.map((deg) => ({ root: rootPcs[deg], quality: 'dominant 7th' as ChordQualityId }))
    const guides = guideToneLine(specs)
    const nearestRoot = (pc: string) => {
      // low register root for the LH
      const chroma = Note.chroma(pc)!
      for (let m = 40; m < 52; m++) if (m % 12 === chroma) return m
      return 45
    }
    const steps: LessonStep[] = BLUES_FORM.map((deg, bar) => ({
      midis: [nearestRoot(rootPcs[deg]), ...guides[bar]],
      fingers: [null, null, null],
      hands: ['L', 'R', 'R'],
      label: `${rootPcs[deg]}7`,
    }))
    return {
      id: `jazz-blues-comp-${key}`,
      title: `12-bar blues comping in ${key}`,
      method: METHOD,
      description: `One voicing per bar through the 12-bar form: LH root, RH guide tones (3rd and 7th). This is the harmonic skeleton behind thousands of tunes.`,
      tips: [
        'Count each bar out loud — one chord per bar, twelve bars round.',
        'Swing it: with the metronome, feel the click as beats 2 and 4.',
        'The guide tones barely move between chords — let them slide.',
      ],
      detectionMode: 'poly',
      keySignature: key,
      tempoBpm: 84,
      segments: [{ label: 'Comping (hands together)', hand: 'both', clef: 'grand', steps }],
    }
  })
}

function bluesScaleLessons(): Lesson[] {
  return BLUES_SCALE_KEYS.map((root) => {
    const scale = getScale(root, 'blues')
    const fingering = scaleFingerings[scale.id]
    const upDown = (midis: number[], fingers: Finger[]): LessonStep[] => {
      const m = [...midis, ...midis.slice(0, -1).reverse()]
      const f = [...fingers, ...fingers.slice(0, -1).reverse()]
      return m.map((midi, i) => ({ midis: [midi], fingers: [f[i]] as (Finger | null)[] }))
    }
    return {
      id: `jazz-blues-scale-${root}`,
      title: `${root} blues scale`,
      method: METHOD,
      description: `The ${root} blues scale up and down — six notes with the "blue" flat 3rd, flat 5th and flat 7th that give blues and jazz their colour.`,
      tips: [
        'This is the minor pentatonic plus one "blue" note — the b5.',
        'Lean into the b5 — it wants to resolve, that tension is the sound.',
        'Try it swung once it is even: long-short, long-short.',
        'Don\'t just run it up and down — the point is knowing what the notes are and making phrases from them.',
      ],
      detectionMode: 'mono',
      keySignature: scale.keySignature,
      tempoBpm: 72,
      segments: [
        { label: 'Right hand', hand: 'R', clef: 'treble', steps: upDown(scale.midi, fingering.rh) },
        { label: 'Left hand', hand: 'L', clef: 'bass', steps: upDown(scale.midi.map((m) => m - 12), fingering.lh) },
      ],
    }
  })
}

export function jazzLessons(): Lesson[] {
  return [...bluesScaleLessons(), ...iiVILessons(), ...bluesCompLessons()]
}
