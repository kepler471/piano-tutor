import { describe, expect, it } from 'vitest'
import { MonoPolyFuser } from '../lib/input/fusion'
import { chooseSource, expectedMicSource, shouldForward } from '../lib/input/routing'

type Ev = Parameters<MonoPolyFuser['accept']>[0]
const mono = (midi: number, tMs: number): Ev => ({ source: 'mono', kind: 'on', midi, tMs })
const poly = (midi: number, tMs: number): Ev => ({ source: 'poly', kind: 'on', midi, tMs })

describe('MonoPolyFuser', () => {
  it('forwards mono onsets immediately and drops the matching poly re-report', () => {
    const f = new MonoPolyFuser()
    expect(f.accept(mono(64, 0))).toBe(true)
    expect(f.accept(poly(64, 900))).toBe(false) // same keypress, ~1 s later
  })

  it('passes poly notes with no mono counterpart (rest of the chord)', () => {
    const f = new MonoPolyFuser()
    expect(f.accept(mono(67, 0))).toBe(true) // mono hears the top note
    expect(f.accept(poly(60, 800))).toBe(true) // chord root — no mono match
    expect(f.accept(poly(64, 800))).toBe(true) // chord third — no mono match
    expect(f.accept(poly(67, 800))).toBe(false) // top note deduped
  })

  it('consumes one mono onset per poly onset (repeated same-pitch notes)', () => {
    const f = new MonoPolyFuser()
    expect(f.accept(mono(60, 0))).toBe(true)
    expect(f.accept(mono(60, 400))).toBe(true)
    expect(f.accept(poly(60, 700))).toBe(false) // dedups the first
    expect(f.accept(poly(60, 1100))).toBe(false) // dedups the second
    expect(f.accept(poly(60, 1500))).toBe(true) // third poly 60 is genuinely new
  })

  it('does not dedup across octaves', () => {
    const f = new MonoPolyFuser()
    expect(f.accept(mono(60, 0))).toBe(true)
    expect(f.accept(poly(72, 800))).toBe(true) // octave in the chord is real
  })

  it('expires pending mono onsets after the lag window', () => {
    const f = new MonoPolyFuser({ maxPolyLagMs: 1000 })
    expect(f.accept(mono(60, 0))).toBe(true)
    expect(f.accept(poly(60, 1500))).toBe(true) // too late to be the same press
  })

  it('forwards offs and midi events untouched', () => {
    const f = new MonoPolyFuser()
    expect(f.accept({ source: 'mono', kind: 'off', midi: 60, tMs: 0 })).toBe(true)
    expect(f.accept({ source: 'midi', kind: 'on', midi: 60, tMs: 0 })).toBe(true)
    // Offs must not consume pending onsets:
    expect(f.accept(mono(60, 10))).toBe(true)
    expect(f.accept({ source: 'mono', kind: 'off', midi: 60, tMs: 20 })).toBe(true)
    expect(f.accept(poly(60, 800))).toBe(false)
  })

  it('reset clears pending onsets', () => {
    const f = new MonoPolyFuser()
    f.accept(mono(60, 0))
    f.reset()
    expect(f.accept(poly(60, 500))).toBe(true)
  })
})

describe('fused routing', () => {
  it('chooseSource picks mic-fused for chord practice when fusion is on', () => {
    expect(chooseSource(false, 'poly', true)).toBe('mic-fused')
    expect(chooseSource(false, 'poly', false)).toBe('mic-poly')
    expect(chooseSource(false, 'mono', true)).toBe('mic-mono')
    expect(chooseSource(true, 'poly', true)).toBe('midi') // MIDI always wins
  })

  it('shouldForward passes both mic detectors in fused mode only', () => {
    expect(shouldForward('mono', 'mic-fused')).toBe(true)
    expect(shouldForward('poly', 'mic-fused')).toBe(true)
    expect(shouldForward('midi', 'mic-fused')).toBe(false)
    expect(shouldForward('mono', 'mic-poly')).toBe(false)
    expect(shouldForward('poly', 'mic-poly')).toBe(true)
  })

  it('expectedMicSource mirrors chooseSource without MIDI', () => {
    expect(expectedMicSource('poly', true)).toBe('mic-fused')
    expect(expectedMicSource('poly', false)).toBe('mic-poly')
    expect(expectedMicSource('mono', true)).toBe('mic-mono')
  })
})
