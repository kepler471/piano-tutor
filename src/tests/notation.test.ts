// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  midiToVexKey,
  noteNameToVexKey,
  renderScore,
  scoreFromChord,
  scoreFromScale,
  scoreFromSequence,
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
})
