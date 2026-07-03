import { describe, expect, it } from 'vitest'
import { Note } from 'tonal'
import { getChord } from '../lib/theory/chords'
import { guideToneLine, iiVIVoicings, SHELL_QUALITIES, shellVoicing } from '../lib/theory/voicings'
import { jazzLessons } from '../lib/data/lessons/jazz'

describe('shellVoicing', () => {
  it('shape A is root + 7th, shape B is root + 3rd', () => {
    const a = shellVoicing('C', 'dominant 7th', 'A')
    expect(a.midis[1] - a.midis[0]).toBe(10) // minor 7th
    const b = shellVoicing('C', 'dominant 7th', 'B')
    expect(b.midis[1] - b.midis[0]).toBe(4) // major 3rd
    const maj = shellVoicing('C', 'major 7th', 'A')
    expect(maj.midis[1] - maj.midis[0]).toBe(11)
  })

  it('works for every shell quality on every root', () => {
    for (const q of SHELL_QUALITIES) {
      for (const root of ['C', 'F', 'Bb', 'Eb', 'F#']) {
        for (const shape of ['A', 'B'] as const) {
          const s = shellVoicing(root, q, shape)
          expect(s.midis).toHaveLength(2)
          expect(s.midis[1]).toBeGreaterThan(s.midis[0])
          expect(s.midis[0] % 12).toBe(Note.chroma(root)!)
        }
      }
    }
  })
})

describe('guideToneLine / iiVIVoicings', () => {
  it('classic ii–V–I in C: F/C → F/B → E/B', () => {
    const chords = iiVIVoicings('C')
    expect(chords.map((c) => c.symbol)).toEqual(['Dm7', 'G7', 'Cmaj7'])
    const pcs = chords.map((c) => c.guideMidis.map((m) => Note.pitchClass(Note.fromMidi(m))))
    expect(new Set(pcs[0])).toEqual(new Set(['F', 'C']))
    expect(new Set(pcs[1])).toEqual(new Set(['F', 'B']))
    expect(new Set(pcs[2])).toEqual(new Set(['E', 'B']))
  })

  it('each guide-tone voice moves at most 2 semitones between chords', () => {
    for (const key of ['C', 'F', 'Bb', 'G', 'Eb', 'A', 'Db']) {
      const chords = iiVIVoicings(key)
      for (let i = 1; i < chords.length; i++) {
        const [p1, p2] = chords[i - 1].guideMidis
        const [n1, n2] = chords[i].guideMidis
        // voices are sorted low/high; compare pairwise
        expect(Math.abs(n1 - p1), `${key} chord ${i}`).toBeLessThanOrEqual(2)
        expect(Math.abs(n2 - p2), `${key} chord ${i}`).toBeLessThanOrEqual(2)
      }
    }
  })

  it('guide tones are always the 3rd and 7th of the chord', () => {
    for (const key of ['C', 'F', 'Bb']) {
      const chords = iiVIVoicings(key)
      const qualities = ['minor 7th', 'dominant 7th', 'major 7th'] as const
      chords.forEach((c, i) => {
        const symRoot = c.symbol.replace(/m7|maj7|7/g, '')
        const full = getChord(symRoot, qualities[i], 0)
        const want = new Set([full.midi[1] % 12, full.midi[3] % 12])
        for (const g of c.guideMidis) expect(want.has(g % 12), `${key} ${c.symbol}`).toBe(true)
      })
    }
  })

  it('blues comping line stays smooth across the 12-bar form', () => {
    const comp = jazzLessons().find((l) => l.id === 'jazz-blues-comp-C')!
    const steps = comp.segments[0].steps
    expect(steps).toHaveLength(12)
    for (let i = 1; i < steps.length; i++) {
      const [, p1, p2] = steps[i - 1].midis
      const [, n1, n2] = steps[i].midis
      expect(Math.abs(n1 - p1), `bar ${i}`).toBeLessThanOrEqual(2)
      expect(Math.abs(n2 - p2), `bar ${i}`).toBeLessThanOrEqual(2)
    }
  })

  it('jazz lessons generate with valid grand-staff hands metadata', () => {
    for (const l of jazzLessons()) {
      for (const seg of l.segments) {
        if (seg.clef !== 'grand') continue
        for (const step of seg.steps) {
          expect(step.hands).toBeDefined()
          expect(step.hands!.length).toBe(step.midis.length)
        }
      }
    }
  })
})
