import { describe, expect, it } from 'vitest'
import { allScales, getScale, MAJOR_ROOTS, MINOR_ROOTS } from '../lib/theory/scales'
import { CHORD_QUALITIES, CHORD_ROOTS, getChord, inversionsFor } from '../lib/theory/chords'

describe('scales', () => {
  it('builds the full library (36 classical + 20 jazz)', () => {
    expect(allScales()).toHaveLength(56)
  })

  it('C major has the right notes', () => {
    const s = getScale('C', 'major')
    expect(s.notes).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
    expect(s.midi).toEqual([60, 62, 64, 65, 67, 69, 71, 72])
    expect(s.keySignature).toBe('C')
  })

  it('spells F# major with E#', () => {
    expect(getScale('F#', 'major').notes).toContain('E#')
  })

  it('harmonic minor raises the 7th', () => {
    const s = getScale('A', 'harmonic minor')
    expect(s.notes).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G#'])
    expect(s.keySignature).toBe('Am')
  })

  it('every scale spans exactly one octave', () => {
    for (const s of allScales()) {
      expect(s.midi.length, s.id).toBe(s.notes.length + 1)
      expect(s.midi[s.midi.length - 1] - s.midi[0], s.id).toBe(12)
      for (let i = 1; i < s.midi.length; i++) {
        expect(s.midi[i]).toBeGreaterThan(s.midi[i - 1])
      }
    }
  })

  it('blues scale has six notes with the blue b3, b5 and b7', () => {
    const s = getScale('C', 'blues')
    expect(s.midi).toEqual([60, 63, 65, 66, 67, 70, 72]) // C Eb F Gb G Bb C
    expect(s.keySignature).toBe('C')
  })

  it('modes take the parent major key signature', () => {
    expect(getScale('D', 'dorian').keySignature).toBe('C')
    expect(getScale('G', 'dorian').keySignature).toBe('F')
    expect(getScale('G', 'mixolydian').keySignature).toBe('C')
    expect(getScale('D', 'mixolydian').keySignature).toBe('G')
  })

  it('dorian and mixolydian have the right character tones', () => {
    // D dorian: natural 6 (B); G mixolydian: flat 7 (F)
    expect(getScale('D', 'dorian').notes).toEqual(['D', 'E', 'F', 'G', 'A', 'B', 'C'])
    expect(getScale('G', 'mixolydian').notes).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F'])
  })

  it('major pentatonic is a five-note subset of the major scale', () => {
    const s = getScale('C', 'major pentatonic')
    expect(s.midi).toEqual([60, 62, 64, 67, 69, 72])
  })

  it('root lists cover all 12 pitch classes', () => {
    for (const roots of [MAJOR_ROOTS, MINOR_ROOTS]) {
      const pcs = new Set(roots.map((r) => getScale(r, roots === MAJOR_ROOTS ? 'major' : 'natural minor').midi[0] % 12))
      expect(pcs.size).toBe(12)
    }
  })
})

describe('chords', () => {
  it('C major triad', () => {
    const c = getChord('C', 'major')
    expect(c.midi).toEqual([60, 64, 67])
    expect(c.symbol).toBe('C')
  })

  it('inversions move the bass and keep pitch classes', () => {
    const root = getChord('C', 'major', 0)
    const inv1 = getChord('C', 'major', 1)
    const inv2 = getChord('C', 'major', 2)
    expect(inv1.midi).toEqual([64, 67, 72]) // E G C
    expect(inv2.midi).toEqual([67, 72, 76]) // G C E
    const pcs = (m: number[]) => new Set(m.map((x) => x % 12))
    expect(pcs(inv1.midi)).toEqual(pcs(root.midi))
    expect(pcs(inv2.midi)).toEqual(pcs(root.midi))
  })

  it('7th chords have 4 notes and 4 inversions', () => {
    const c = getChord('G', 'dominant 7th')
    expect(c.midi).toEqual([67, 71, 74, 77])
    expect(inversionsFor('dominant 7th')).toEqual([0, 1, 2, 3])
  })

  it('jazz chord qualities build correctly', () => {
    expect(getChord('C', 'half-diminished').midi).toEqual([60, 63, 66, 70]) // C Eb Gb Bb
    expect(getChord('C', 'diminished 7th').midi).toEqual([60, 63, 66, 69]) // C Eb Gb Bbb
    expect(getChord('C', 'major 6th').midi).toEqual([60, 64, 67, 69]) // C E G A
  })

  it('every root × quality × inversion builds cleanly with ascending notes', () => {
    for (const root of CHORD_ROOTS) {
      for (const q of CHORD_QUALITIES) {
        for (const inv of inversionsFor(q.id)) {
          const c = getChord(root, q.id, inv)
          expect(c.midi).toHaveLength(q.size)
          for (let i = 1; i < c.midi.length; i++) {
            expect(c.midi[i]).toBeGreaterThan(c.midi[i - 1])
          }
        }
      }
    }
  })
})
