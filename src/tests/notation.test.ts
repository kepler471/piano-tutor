// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  durationFromBeats,
  isGrandScore,
  midiToVexKey,
  noteNameToVexKey,
  renderGrandScore,
  renderScore,
  scoreFromChord,
  scoreFromScale,
  scoreFromSequence,
  scoreFromSteps,
  type GrandScoreModel,
  type ScoreModel,
} from '../lib/notation/vexScore'
import { getScale, allScales } from '../lib/theory/scales'
import { getChord } from '../lib/theory/chords'
import { scaleFingerings } from '../lib/data/scaleFingerings'
import { chordFingering } from '../lib/data/chordFingerings'

describe('vex keys', () => {
  it('converts note names', () => {
    expect(noteNameToVexKey('C4')).toBe('c/4')
    expect(noteNameToVexKey('Db4')).toBe('db/4')
    expect(noteNameToVexKey('E#4')).toBe('e#/4')
  })
  it('converts midi', () => {
    expect(midiToVexKey(60)).toBe('c/4')
    expect(midiToVexKey(61)).toBe('c#/4')
  })
})

describe('score building', () => {
  it('scale score goes up and down with fingering', () => {
    const scale = getScale('C', 'major')
    const score = scoreFromScale(scale, 'R', scaleFingerings[scale.id])
    expect(score.events).toHaveLength(15)
    expect(score.events[0].keys).toEqual(['c/4'])
    expect(score.events[14].keys).toEqual(['c/4'])
    expect(score.events[7].keys).toEqual(['c/5'])
    expect(score.events[0].fingerings).toEqual([1])
    expect(score.clef).toBe('treble')
  })

  it('LH scale renders an octave lower in bass clef', () => {
    const scale = getScale('C', 'major')
    const score = scoreFromScale(scale, 'L', scaleFingerings[scale.id])
    expect(score.clef).toBe('bass')
    expect(score.events[0].keys).toEqual(['c/3'])
  })

  it('chord score is a single stack', () => {
    const chord = getChord('C', 'major', 0)
    const score = scoreFromChord(chord, 'R', chordFingering(3, 0))
    expect(score.events).toHaveLength(1)
    expect(score.events[0].keys).toEqual(['c/4', 'e/4', 'g/4'])
  })

  it('sequence score picks clef from register', () => {
    expect(scoreFromSequence([{ midis: [72] }]).clef).toBe('treble')
    expect(scoreFromSequence([{ midis: [40] }]).clef).toBe('bass')
  })
})

describe('durations', () => {
  it('maps beat lengths to VexFlow durations with dots', () => {
    expect(durationFromBeats(4)).toEqual({ duration: 'w', dots: 0 })
    expect(durationFromBeats(3)).toEqual({ duration: 'h', dots: 1 })
    expect(durationFromBeats(2)).toEqual({ duration: 'h', dots: 0 })
    expect(durationFromBeats(1.5)).toEqual({ duration: 'q', dots: 1 })
    expect(durationFromBeats(1)).toEqual({ duration: 'q', dots: 0 })
    expect(durationFromBeats(0.75)).toEqual({ duration: '8', dots: 1 })
    expect(durationFromBeats(0.5)).toEqual({ duration: '8', dots: 0 })
    expect(durationFromBeats(0.25)).toEqual({ duration: '16', dots: 0 })
  })
})

describe('grand staff', () => {
  it('routes midis to staves by explicit hand', () => {
    const score = scoreFromSteps(
      [{ midis: [48, 72], fingers: [5, 1], hands: ['L', 'R'] }],
      'C',
      'grand',
    ) as GrandScoreModel
    expect(isGrandScore(score)).toBe(true)
    expect(score.treble[0].keys).toEqual(['c/5'])
    expect(score.bass[0].keys).toEqual(['c/3'])
  })

  it('splits at middle C when no hands are given', () => {
    const score = scoreFromSteps([{ midis: [55, 64], fingers: [null, null] }], 'C', 'grand') as GrandScoreModel
    expect(score.treble[0].keys).toEqual(['e/4'])
    expect(score.bass[0].keys).toEqual(['g/3'])
  })

  it('pads the empty stave with an aligned rest', () => {
    const score = scoreFromSteps([{ midis: [72], fingers: [1], hands: ['R'] }], 'C', 'grand') as GrandScoreModel
    expect(score.treble).toHaveLength(1)
    expect(score.bass).toHaveLength(1)
    expect(score.bass[0].rest).toBe(true)
  })

  it('non-grand clefs still return a single-stave model', () => {
    const score = scoreFromSteps([{ midis: [60], fingers: [1] }], 'C', 'treble') as ScoreModel
    expect(isGrandScore(score)).toBe(false)
    expect(score.events[0].keys).toEqual(['c/4'])
  })

  it('honors durationBeats on steps', () => {
    const score = scoreFromSteps(
      [{ midis: [60], fingers: [1], durationBeats: 1.5 }],
      'C',
      'treble',
    ) as ScoreModel
    expect(score.events[0].duration).toBe('q')
    expect(score.events[0].dots).toBe(1)
  })
})

describe('rendering (jsdom smoke test)', () => {
  it('renders every scale to SVG without throwing', () => {
    const container = document.createElement('div')
    for (const scale of allScales()) {
      const score = scoreFromScale(scale, 'R', scaleFingerings[scale.id])
      renderScore(container, score)
      expect(container.querySelector('svg'), scale.id).toBeTruthy()
    }
  })

  it('renders a chord with highlight', () => {
    const container = document.createElement('div')
    const chord = getChord('G', 'dominant 7th', 1)
    const score = scoreFromChord(chord, 'L', chordFingering(4, 1))
    renderScore(container, score, new Map([[0, 'correct']]))
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders a hands-together grand staff without throwing', () => {
    const container = document.createElement('div')
    const steps = Array.from({ length: 15 }, (_, i) => ({
      midis: [48 + i, 60 + i],
      fingers: [null, null] as (null)[],
      hands: ['L', 'R'] as ('L' | 'R')[],
    }))
    const score = scoreFromSteps(steps, 'C', 'grand') as GrandScoreModel
    renderGrandScore(container, score, new Map([[0, 'next']]))
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders dotted and 16th durations with a time signature', () => {
    const container = document.createElement('div')
    renderScore(container, {
      clef: 'treble',
      keySignature: 'G',
      timeSignature: '4/4',
      events: [
        { keys: ['g/4'], duration: 'q', dots: 1 },
        { keys: ['a/4'], duration: '8' },
        { keys: ['b/4'], duration: '16' },
        { keys: ['c/5'], duration: '16' },
        { keys: ['d/5'], duration: 'h', endsBar: true },
        { keys: [], duration: 'q', rest: true },
      ],
    })
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
