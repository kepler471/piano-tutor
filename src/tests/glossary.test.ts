import { describe, expect, it } from 'vitest'
import { annotateGlossary, GLOSSARY, lookupTerm } from '../lib/data/glossary'
import { CHORD_QUALITIES } from '../lib/theory/chords'
import { SCALE_TYPES } from '../lib/theory/scales'

/**
 * Integrity + behavior tests for the beginner glossary: every scale type and
 * chord quality shown in the library screens must have a definition, and the
 * pure prose annotator must mark terms without ever altering the text.
 */

describe('glossary coverage', () => {
  it('defines every scale type id', () => {
    for (const t of SCALE_TYPES) {
      expect(lookupTerm(t.id), `scale type '${t.id}'`).toBeDefined()
    }
  })

  it('defines every chord quality id', () => {
    for (const q of CHORD_QUALITIES) {
      expect(lookupTerm(q.id), `chord quality '${q.id}'`).toBeDefined()
    }
  })

  it('keeps definitions tooltip-sized and non-empty', () => {
    for (const entry of GLOSSARY.values()) {
      expect(entry.short.trim().length, entry.id).toBeGreaterThan(20)
      expect(entry.short.length, `${entry.id} too long for a tooltip`).toBeLessThanOrEqual(240)
      expect(entry.term.trim().length, entry.id).toBeGreaterThan(0)
    }
  })

  it('uses lowercase ids so lookupTerm is case-insensitive', () => {
    for (const id of GLOSSARY.keys()) {
      expect(id).toBe(id.toLowerCase())
    }
    expect(lookupTerm('Harmonic Minor')?.id).toBe('harmonic minor')
  })
})

describe('annotateGlossary', () => {
  const joined = (text: string) =>
    annotateGlossary(text)
      .map((s) => s.text)
      .join('')

  it('round-trips: concatenated segments reproduce the input exactly', () => {
    const samples = [
      'Play a C major arpeggio, then the harmonic minor scale.',
      'No musical terms here at all.',
      '',
      'Arpeggio at the very start, and arpeggios again later.',
    ]
    for (const s of samples) expect(joined(s)).toBe(s)
  })

  it('marks a known term with its glossary id', () => {
    const segs = annotateGlossary('Try an arpeggio now.')
    const hit = segs.find((s) => s.termId === 'arpeggio')
    expect(hit).toBeDefined()
    expect(hit!.text).toBe('arpeggio')
  })

  it('prefers the longest match: harmonic minor beats minor', () => {
    const segs = annotateGlossary('The harmonic minor scale sounds exotic.')
    expect(segs.some((s) => s.termId === 'harmonic minor')).toBe(true)
    const minorSeg = segs.find((s) => s.termId === 'minor')
    expect(minorSeg).toBeUndefined()
  })

  it('annotates only the first occurrence of a term', () => {
    const segs = annotateGlossary('An arpeggio here, another arpeggio there.')
    expect(segs.filter((s) => s.termId === 'arpeggio')).toHaveLength(1)
  })

  it('respects word boundaries', () => {
    // 'bar' must not match inside 'barnyard'; alias matching is exact-word too.
    const segs = annotateGlossary('The barnyard tour.')
    expect(segs.every((s) => s.termId === undefined)).toBe(true)
    const hit = annotateGlossary('Count two bar lines in.').find((s) => s.termId === 'bar')
    expect(hit?.text).toBe('bar lines')
  })

  it('matches aliases and plurals case-insensitively', () => {
    expect(annotateGlossary('Practise your Arpeggios daily.').some((s) => s.termId === 'arpeggio')).toBe(true)
    expect(annotateGlossary('a pentascale drill').some((s) => s.termId === 'five-finger position')).toBe(true)
    expect(annotateGlossary('the ii-V-I in C').some((s) => s.termId === 'ii–v–i')).toBe(true)
  })

  it('caps the number of annotated terms per string', () => {
    const busy =
      'A triad, an arpeggio, a cadence, an inversion, a tritone and an octave walk into a bar with a metronome.'
    const marked = annotateGlossary(busy).filter((s) => s.termId)
    expect(marked.length).toBeLessThanOrEqual(4)
    expect(marked.length).toBeGreaterThan(0)
    expect(joined(busy)).toBe(busy)
  })

  it('does not annotate bare "blues" (only "blues scale")', () => {
    expect(annotateGlossary('Play the blues tonight.').every((s) => !s.termId)).toBe(true)
    expect(annotateGlossary('Learn the blues scale.').some((s) => s.termId === 'blues')).toBe(true)
  })
})
