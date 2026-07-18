import { describe, expect, it } from 'vitest'
import { Note } from 'tonal'
import { getChord } from '../lib/theory/chords'
import { MAJOR_DEGREES, MINOR_DEGREES, closestInversion, diatonicTriad } from '../lib/theory/progressions'

describe('diatonicTriad', () => {
  it('names the primary chords of C major', () => {
    expect(diatonicTriad('C', 'I')).toEqual({ numeral: 'I', root: 'C', quality: 'major' })
    expect(diatonicTriad('C', 'IV')).toEqual({ numeral: 'IV', root: 'F', quality: 'major' })
    expect(diatonicTriad('C', 'V')).toEqual({ numeral: 'V', root: 'G', quality: 'major' })
  })

  it('keeps spellings diatonic in flat keys (Bb major IV is Eb, not D#)', () => {
    expect(diatonicTriad('Bb', 'IV').root).toBe('Eb')
    expect(diatonicTriad('Eb', 'vi').root).toBe('C')
    expect(diatonicTriad('F#', 'iii').root).toBe('A#')
  })

  it('follows the harmonic-minor convention: V is major in minor keys', () => {
    expect(diatonicTriad('A', 'V', 'minor')).toEqual({ numeral: 'V', root: 'E', quality: 'major' })
    expect(diatonicTriad('A', 'iv', 'minor')).toEqual({ numeral: 'iv', root: 'D', quality: 'minor' })
  })

  it('resolves every numeral of both modes to a buildable chord', () => {
    for (const [numeral] of MAJOR_DEGREES) {
      const t = diatonicTriad('D', numeral)
      expect(() => getChord(t.root, t.quality)).not.toThrow()
    }
    for (const [numeral] of MINOR_DEGREES) {
      const t = diatonicTriad('E', numeral, 'minor')
      expect(() => getChord(t.root, t.quality)).not.toThrow()
    }
  })

  it('throws on numerals that are not in the key mode', () => {
    expect(() => diatonicTriad('C', 'i')).toThrow()
    expect(() => diatonicTriad('A', 'IV', 'minor')).toThrow()
  })
})

describe('closestInversion', () => {
  it('returns the same voicing when the chord repeats', () => {
    const c = getChord('C', 'major', 0)
    expect(closestInversion(c.midi, 'C', 'major').midi).toEqual(c.midi)
  })

  it('voice-leads C → F as F/C (second inversion over the same bass)', () => {
    const c = getChord('C', 'major', 0) // C4 E4 G4
    const f = closestInversion(c.midi, 'F', 'major')
    expect(f.inversion).toBe(2)
    expect(f.midi).toEqual([60, 65, 69]) // C4 F4 A4
  })

  it('voice-leads C → G as G/B (first inversion just below)', () => {
    const c = getChord('C', 'major', 0)
    const g = closestInversion(c.midi, 'G', 'major')
    expect(g.inversion).toBe(1)
    expect(g.midi).toEqual([59, 62, 67]) // B3 D4 G4
  })

  it('always returns the requested pitch classes', () => {
    const prev = getChord('C', 'major', 0).midi
    for (const [root, quality] of [
      ['A', 'minor'],
      ['D', 'minor 7th'],
      ['G', 'dominant 7th'],
      ['B', 'diminished'],
    ] as const) {
      const next = closestInversion(prev, root, quality)
      const want = getChord(root, quality, 0).midi.map((m) => m % 12).sort()
      expect(next.midi.map((m) => m % 12).sort()).toEqual(want)
    }
  })

  it('moves less than a plain root-position jump across a progression', () => {
    // I–V–vi–IV in C: chained voicings should never leap more than a 4th per voice.
    let prev = getChord('C', 'major', 0)
    for (const { root, quality } of [
      diatonicTriad('C', 'V'),
      diatonicTriad('C', 'vi'),
      diatonicTriad('C', 'IV'),
    ]) {
      const next = closestInversion(prev.midi, root, quality)
      const jump = Math.max(...next.midi.map((m, i) => Math.abs(m - prev.midi[i])))
      expect(jump).toBeLessThanOrEqual(5)
      prev = next
    }
  })

  it('keeps spelled note names consistent with the midis after octave shifts', () => {
    const low = getChord('C', 'major', 0).midi.map((m) => m - 12) // around C3
    const next = closestInversion(low, 'F', 'major')
    next.noteNames.forEach((n, i) => expect(Note.midi(n)).toBe(next.midi[i]))
  })
})
