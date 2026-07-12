import { describe, expect, it } from 'vitest'
import type { LessonStep } from '../lib/data/lessons'
import { shouldGradeOnset, timingGradable } from '../lib/practice/grading'
import { StepMatcher } from '../lib/practice/matcher'
import type { NoteSource } from '../lib/audio/noteEvents'
import type { ActiveSource } from '../lib/input/routing'

const chordStep: LessonStep = { midis: [60, 64, 67], fingers: [1, 3, 5] }
const noteStep: LessonStep = { midis: [60], fingers: [1] }

describe('shouldGradeOnset', () => {
  const ev = (source: NoteSource, midi: number) => ({ source, midi })

  it('drops mono onsets outside the current chord in fused mode', () => {
    expect(shouldGradeOnset(ev('mono', 48), chordStep, 'mic-fused')).toBe(false)
    expect(shouldGradeOnset(ev('mono', 62), chordStep, 'mic-fused')).toBe(false)
  })

  it('keeps mono onsets that are in the current chord (instant positive feedback)', () => {
    expect(shouldGradeOnset(ev('mono', 64), chordStep, 'mic-fused')).toBe(true)
  })

  it('keeps mono onsets on melodic steps in fused mode (full grading power)', () => {
    expect(shouldGradeOnset(ev('mono', 62), noteStep, 'mic-fused')).toBe(true)
  })

  it('poly and midi always grade, even outside the chord', () => {
    expect(shouldGradeOnset(ev('poly', 62), chordStep, 'mic-fused')).toBe(true)
    expect(shouldGradeOnset(ev('midi', 62), chordStep, 'midi')).toBe(true)
  })

  it('non-fused sources always grade', () => {
    expect(shouldGradeOnset(ev('mono', 62), chordStep, 'mic-mono')).toBe(true)
    expect(shouldGradeOnset(ev('poly', 62), chordStep, 'mic-poly')).toBe(true)
  })

  it('grades when the matcher is done (no current step)', () => {
    expect(shouldGradeOnset(ev('mono', 62), undefined, 'mic-fused')).toBe(true)
  })
})

describe('timingGradable', () => {
  const melodic: LessonStep[] = [noteStep, { midis: [62], fingers: [2] }]
  const chordal: LessonStep[] = [noteStep, chordStep]
  const cases: [LessonStep[], ActiveSource, boolean][] = [
    [melodic, 'mic-poly', false],
    [chordal, 'mic-poly', false],
    [chordal, 'mic-fused', false],
    [melodic, 'mic-fused', true],
    [chordal, 'midi', true],
    [chordal, 'mic-mono', true],
    [melodic, 'midi', true],
  ]
  it.each(cases)('steps %#: %s → %s', (steps, source, expected) => {
    expect(timingGradable(steps, source)).toBe(expected)
  })
})

describe('fused cadence replay (regression for the cadence-lesson bug)', () => {
  // I–IV–V–I in C, as the cadence lesson builds it.
  const cadenceC: LessonStep[] = [
    { midis: [60, 64, 67], fingers: [1, 3, 5] },
    { midis: [60, 65, 69], fingers: [1, 4, 5] },
    { midis: [59, 62, 67], fingers: [1, 3, 5] },
    { midis: [60, 64, 67], fingers: [1, 3, 5] },
  ]

  it('correct playing with held common tones and mono misdetections grades clean', () => {
    // Matcher configured exactly as LessonPlayer configures it for chords.
    const m = new StepMatcher(cadenceC, { lookahead: 2, carryHeldTones: true })
    // Realistic post-fuser event stream: mono hears one tone instantly, poly
    // fills the rest ~1 s later; strays are mono flicker/ringing/subharmonics.
    const stream: { source: NoteSource; midi: number }[] = [
      { source: 'mono', midi: 60 }, // chord I struck
      { source: 'poly', midi: 64 },
      { source: 'poly', midi: 67 },
      { source: 'mono', midi: 36 }, // subharmonic of the C-triad mixture
      { source: 'mono', midi: 65 }, // chord IV struck (C held down)
      { source: 'mono', midi: 67 }, // ringing G flicker — used to skip IV
      { source: 'poly', midi: 69 },
      { source: 'mono', midi: 59 }, // chord V struck
      { source: 'poly', midi: 62 },
      { source: 'poly', midi: 67 },
      { source: 'mono', midi: 64 }, // final I struck (G held down)
      { source: 'poly', midi: 60 },
    ]
    for (const ev of stream) {
      if (!shouldGradeOnset(ev, m.current, 'mic-fused')) continue
      m.onOnset(ev.midi)
    }
    expect(m.done).toBe(true)
    expect(m.results).toEqual(['correct', 'correct', 'correct', 'correct'])
    expect(m.mistakes).toBe(0)
    expect(m.skips).toBe(0)
  })
})
