import { describe, expect, it } from 'vitest'
import { Note } from 'tonal'
import { CIRCLE_KEYS, fifthDown, fifthUp, neighborsOf } from '../lib/theory/circle'
import { sigAccidentals } from '../lib/theory/quiz'
import { MAJOR_ROOTS, getScale } from '../lib/theory/scales'

describe('CIRCLE_KEYS', () => {
  it('has 12 entries matching MAJOR_ROOTS in fifths order', () => {
    expect(CIRCLE_KEYS).toHaveLength(12)
    expect(CIRCLE_KEYS.map((k) => k.major)).toEqual(MAJOR_ROOTS)
    CIRCLE_KEYS.forEach((k, i) => expect(k.index).toBe(i))
  })

  it('accidental counts follow the clockwise position', () => {
    for (const k of CIRCLE_KEYS) {
      if (k.index === 0) {
        expect(k.accidentals.kind).toBe('none')
      } else if (k.index <= 6) {
        expect(k.accidentals.kind).toBe('sharps')
        expect(k.accidentals.names).toHaveLength(k.index)
      } else {
        expect(k.accidentals.kind).toBe('flats')
        expect(k.accidentals.names).toHaveLength(12 - k.index)
      }
    }
  })

  it('every relative minor sits three semitones below its major', () => {
    for (const k of CIRCLE_KEYS) {
      expect((Note.chroma(k.major)! - Note.chroma(k.minor)! + 12) % 12).toBe(3)
      expect(Note.chroma(k.minorScaleRoot)).toBe(Note.chroma(k.minor))
    }
  })

  it('major and relative-minor scale deep links always resolve', () => {
    for (const k of CIRCLE_KEYS) {
      expect(() => getScale(k.major, 'major')).not.toThrow()
      expect(() => getScale(k.minorScaleRoot, 'natural minor')).not.toThrow()
    }
  })

  it('only the six-o-clock seam carries an enharmonic spelling', () => {
    const seam = CIRCLE_KEYS.filter((k) => k.enharmonic)
    expect(seam).toHaveLength(1)
    expect(seam[0].major).toBe('F#')
    expect(seam[0].enharmonic).toBe('Gb')
    expect(Note.chroma('F#')).toBe(Note.chroma('Gb'))
    // The seam's minor is spelled D# on the wheel but Eb in the scale catalog.
    expect(seam[0].minor).toBe('D#')
    expect(seam[0].minorScaleRoot).toBe('Eb')
  })
})

describe('fifthUp / fifthDown / neighborsOf', () => {
  it('moves seven semitones per step and round-trips', () => {
    for (const k of CIRCLE_KEYS) {
      const up = fifthUp(k.major)
      const down = fifthDown(k.major)
      expect((Note.chroma(up)! - Note.chroma(k.major)! + 12) % 12).toBe(7)
      expect((Note.chroma(k.major)! - Note.chroma(down)! + 12) % 12).toBe(7)
      expect(fifthDown(up)).toBe(k.major)
      expect(fifthUp(down)).toBe(k.major)
      expect(neighborsOf(k.major)).toEqual([down, up])
    }
  })

  it('walks the full circle back to C in 12 steps', () => {
    let key = 'C'
    for (let i = 0; i < 12; i++) key = fifthUp(key)
    expect(key).toBe('C')
  })

  it('rejects spellings that are not circle keys', () => {
    expect(() => fifthUp('Gb')).toThrow()
    expect(() => neighborsOf('H')).toThrow()
  })
})

describe('sigAccidentals re-export from quiz.ts', () => {
  it('still answers key-signature facts', () => {
    expect(sigAccidentals('C')).toEqual({ kind: 'none', names: [] })
    expect(sigAccidentals('A')).toEqual({ kind: 'sharps', names: ['F♯', 'C♯', 'G♯'] })
    expect(sigAccidentals('Eb')).toEqual({ kind: 'flats', names: ['B♭', 'E♭', 'A♭'] })
  })

  it('adjacent circle keys differ by exactly one accidental', () => {
    for (const k of CIRCLE_KEYS) {
      const here = new Set(sigAccidentals(k.major).names)
      const next = new Set(sigAccidentals(fifthUp(k.major)).names)
      const gained = [...next].filter((n) => !here.has(n))
      const lost = [...here].filter((n) => !next.has(n))
      // Clockwise: +1 sharp or −1 flat — except across the F#→Db seam where the
      // spelling flips wholesale (6 sharps → 5 flats).
      if (k.major !== 'F#') expect(gained.length + lost.length).toBe(1)
    }
  })
})
