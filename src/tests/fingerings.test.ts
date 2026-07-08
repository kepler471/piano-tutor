import { describe, expect, it } from 'vitest'
import { Note } from 'tonal'
import { allScales, getScale } from '../lib/theory/scales'
import { CHORD_QUALITIES, inversionsFor } from '../lib/theory/chords'
import { scaleFingerings } from '../lib/data/scaleFingerings'
import { chordFingering } from '../lib/data/chordFingerings'
import { scaleRoutineLessons, twoOctaveLh, twoOctaveRh } from '../lib/data/lessons/scaleRoutine'
import { arpeggioLessons, ARPEGGIO_FINGERINGS, ARPEGGIO_KEYS } from '../lib/data/lessons/arpeggios'
import { brokenChordLessons } from '../lib/data/lessons/brokenChords'
import { chromaticFinger, chromaticScaleLessons } from '../lib/data/lessons/chromaticScale'
import { contraryMotionLessons, contrarySteps } from '../lib/data/lessons/contraryMotion'
import { melodicMinorLessons, MELODIC_MINOR_ROOTS } from '../lib/data/lessons/melodicMinor'

const isBlackKey = (midi: number) => [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12)

describe('scale fingerings', () => {
  it('every scale in the library has a fingering', () => {
    for (const s of allScales()) {
      expect(scaleFingerings[s.id], `missing fingering for ${s.id}`).toBeDefined()
    }
  })

  it('fingerings cover one octave (scale length + 1) with valid fingers', () => {
    const lengths = new Map(allScales().map((s) => [s.id, s.midi.length]))
    for (const [id, f] of Object.entries(scaleFingerings)) {
      for (const hand of [f.rh, f.lh]) {
        expect(hand.length, id).toBe(lengths.get(id))
        for (const finger of hand) {
          expect(finger).toBeGreaterThanOrEqual(1)
          expect(finger).toBeLessThanOrEqual(5)
        }
      }
    }
  })

  it('C major uses the canonical fingering', () => {
    expect(scaleFingerings['C major'].rh).toEqual([1, 2, 3, 1, 2, 3, 4, 5])
    expect(scaleFingerings['C major'].lh).toEqual([5, 4, 3, 2, 1, 3, 2, 1])
  })

  it('adjacent notes never repeat a finger', () => {
    for (const [id, f] of Object.entries(scaleFingerings)) {
      for (const hand of [f.rh, f.lh]) {
        for (let i = 1; i < hand.length; i++) {
          expect(hand[i], `${id} repeats finger at position ${i}`).not.toBe(hand[i - 1])
        }
      }
    }
  })
})

describe('two-octave fingering expansion', () => {
  it('C major RH continues the pattern across the octave', () => {
    expect(twoOctaveRh([1, 2, 3, 1, 2, 3, 4, 5])).toEqual([1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 5])
  })

  it('C major LH crosses 4 over at the octave', () => {
    expect(twoOctaveLh([5, 4, 3, 2, 1, 3, 2, 1])).toEqual([5, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 3, 2, 1])
  })

  it('expansions have 15 fingers and never repeat adjacent fingers', () => {
    // Two-octave routines exist only for the 7-note scales (8-entry fingerings).
    const sevenNote = Object.entries(scaleFingerings).filter(([, f]) => f.rh.length === 8)
    for (const [id, f] of sevenNote) {
      for (const expanded of [twoOctaveRh(f.rh), twoOctaveLh(f.lh)]) {
        expect(expanded, id).toHaveLength(15)
        for (let i = 1; i < expanded.length; i++) {
          expect(expanded[i], `${id} repeats finger at position ${i}`).not.toBe(expanded[i - 1])
        }
      }
    }
  })
})

describe('technique lesson generators', () => {
  it('scale routine covers 12 majors, 12 natural minors and 12 harmonic minors with 6 segments each', () => {
    const lessons = scaleRoutineLessons()
    expect(lessons).toHaveLength(36)
    for (const l of lessons) {
      expect(l.segments).toHaveLength(6)
      const together = l.segments.filter((s) => s.hand === 'both')
      expect(together).toHaveLength(2)
      for (const seg of together) {
        expect(seg.clef).toBe('grand')
        expect(seg.detectionMode).toBe('poly')
        for (const step of seg.steps) {
          expect(step.midis).toHaveLength(2)
          expect(step.midis[1] - step.midis[0]).toBe(12) // parallel octaves
          expect(step.hands).toEqual(['L', 'R'])
        }
      }
    }
  })

  it('arpeggio lessons exist for every configured key with valid fingers', () => {
    const lessons = arpeggioLessons()
    expect(lessons).toHaveLength(ARPEGGIO_KEYS.length)
    for (const l of lessons) {
      for (const seg of l.segments) {
        // up-down through 1 octave (4 notes) = 7 steps; 2 octaves (7 notes) = 13
        expect([7, 13]).toContain(seg.steps.length)
        for (const step of seg.steps) {
          expect(step.fingers[0]).toBeGreaterThanOrEqual(1)
          expect(step.fingers[0]).toBeLessThanOrEqual(5)
        }
      }
    }
  })

  it('broken chords walk each inversion up and down', () => {
    for (const l of brokenChordLessons()) {
      for (const seg of l.segments) {
        expect(seg.steps).toHaveLength(15) // 3 inversions × 5 steps
        for (let inv = 0; inv < 3; inv++) {
          const group = seg.steps.slice(inv * 5, inv * 5 + 5)
          expect(group[0].midis[0]).toBe(group[4].midis[0]) // returns to start
          expect(group[1].midis[0]).toBe(group[3].midis[0])
        }
      }
    }
  })
})

describe('chromatic scale fingering', () => {
  it('RH from C matches the printed ABRSM chart', () => {
    const midis = Array.from({ length: 13 }, (_, i) => 60 + i)
    expect(midis.map((m, i) => chromaticFinger(m, 'R', i === 0))).toEqual([
      1, 3, 1, 3, 1, 2, 3, 1, 3, 1, 3, 1, 2,
    ])
  })

  it('LH from C mirrors it (2 on E and B)', () => {
    const midis = Array.from({ length: 13 }, (_, i) => 60 + i)
    expect(midis.map((m, i) => chromaticFinger(m, 'L', i === 0))).toEqual([
      1, 3, 1, 3, 2, 1, 3, 1, 3, 1, 3, 2, 1,
    ])
  })

  it('3 always on black keys, thumb never on black, from any start', () => {
    for (let start = 48; start < 60; start++) {
      for (const hand of ['R', 'L'] as const) {
        for (let i = 0; i < 13; i++) {
          const f = chromaticFinger(start + i, hand, i === 0)
          if (isBlackKey(start + i)) expect(f).toBe(3)
          else expect(f).not.toBe(3)
        }
      }
    }
  })

  it('lessons: hands separate then together, never repeating adjacent fingers', () => {
    const lessons = chromaticScaleLessons()
    expect(lessons).toHaveLength(3)
    for (const l of lessons) {
      expect(l.segments).toHaveLength(3)
      const together = l.segments[2]
      expect(together.detectionMode).toBe('poly')
      for (const step of together.steps) expect(step.midis[1] - step.midis[0]).toBe(12)
      for (const seg of l.segments.slice(0, 2)) {
        expect(seg.steps).toHaveLength(25) // 13 up + 12 down
        for (let i = 1; i < seg.steps.length; i++) {
          expect(seg.steps[i].fingers[0], `${l.id} ${seg.label} @${i}`).not.toBe(seg.steps[i - 1].fingers[0])
        }
      }
    }
  })
})

describe('contrary-motion scales', () => {
  it('LH plays the descending scale while RH ascends', () => {
    const steps = contrarySteps('C')
    expect(steps).toHaveLength(15)
    // Unison first/last: one physical note.
    expect(steps[0].midis).toEqual([60])
    expect(steps[14].midis).toEqual([60])
    const scale = getScale('C', 'major').midi
    for (let i = 1; i < 8; i++) {
      expect(steps[i].midis[1]).toBe(scale[i]) // RH up
      expect(steps[i].midis[0]).toBe([...scale].reverse()[i] - 12) // LH down
    }
  })

  it('mirror-symmetric keys use identical fingers in both hands', () => {
    for (const root of ['C', 'G', 'E']) {
      for (const step of contrarySteps(root)) {
        if (step.midis.length === 2) {
          expect(step.fingers[0], `${root} @${step.midis}`).toBe(step.fingers[1])
        }
      }
    }
  })

  it('every lesson is a single poly grand-staff segment', () => {
    for (const l of contraryMotionLessons()) {
      expect(l.detectionMode).toBe('poly')
      expect(l.segments).toHaveLength(1)
      expect(l.segments[0].clef).toBe('grand')
    }
  })
})

describe('melodic minor scales', () => {
  it('raises degrees 6 and 7 ascending and descends in natural minor', () => {
    for (const root of MELODIC_MINOR_ROOTS) {
      const lesson = melodicMinorLessons().find((l) => l.id === `scale-${root}-melodic-minor`)!
      const rh = lesson.segments[0]
      expect(rh.steps).toHaveLength(15)
      const midis = rh.steps.map((s) => s.midis[0])
      const natural = getScale(root, 'natural minor').midi
      // Ascent: natural minor with 6th and 7th one semitone up.
      expect(midis.slice(0, 8)).toEqual(natural.map((m, i) => (i === 5 || i === 6 ? m + 1 : m)))
      // Descent: pure natural minor, mirrored.
      expect(midis.slice(8)).toEqual([...natural].reverse().slice(1))
    }
  })

  it('hands-together segment is poly with parallel octaves', () => {
    for (const l of melodicMinorLessons()) {
      const together = l.segments[2]
      expect(together.detectionMode).toBe('poly')
      for (const step of together.steps) expect(step.midis[1] - step.midis[0]).toBe(12)
    }
  })
})

describe('arpeggio fingerings (all 24 keys)', () => {
  it('covers every major and minor root', () => {
    expect(ARPEGGIO_KEYS).toHaveLength(24)
    const majors = ARPEGGIO_KEYS.filter((k) => k.quality === 'major')
    const minors = ARPEGGIO_KEYS.filter((k) => k.quality === 'minor')
    expect(new Set(majors.map((k) => Note.chroma(k.root))).size).toBe(12)
    expect(new Set(minors.map((k) => Note.chroma(k.root))).size).toBe(12)
  })

  it('every key has structurally valid fingering (lengths, range, no adjacent repeats)', () => {
    for (const { root, quality } of ARPEGGIO_KEYS) {
      const f = ARPEGGIO_FINGERINGS[`${root} ${quality}`]
      expect(f, `${root} ${quality}`).toBeDefined()
      expect(f.rh1).toHaveLength(4)
      expect(f.lh1).toHaveLength(4)
      expect(f.rh2).toHaveLength(7)
      expect(f.lh2).toHaveLength(7)
      for (const hand of [f.rh1, f.lh1, f.rh2, f.lh2]) {
        for (const finger of hand) {
          expect(finger).toBeGreaterThanOrEqual(1)
          expect(finger).toBeLessThanOrEqual(5)
        }
        for (let i = 1; i < hand.length; i++) {
          expect(hand[i], `${root} ${quality}`).not.toBe(hand[i - 1])
        }
      }
    }
  })

  it('the thumb only ever lands on white keys (except all-black triads)', () => {
    const allBlack = new Set(['F# major', 'Eb minor'])
    for (const lesson of arpeggioLessons()) {
      const key = lesson.title.replace(' arpeggio', '')
      if (allBlack.has(key)) continue
      for (const seg of lesson.segments) {
        for (const step of seg.steps) {
          if (step.fingers[0] === 1) {
            expect(isBlackKey(step.midis[0]), `${key} ${seg.label}: thumb on midi ${step.midis[0]}`).toBe(false)
          }
        }
      }
    }
  })

  it('canonical spot checks: Bb major and Bb minor', () => {
    expect(ARPEGGIO_FINGERINGS['Bb major'].rh2).toEqual([2, 1, 2, 4, 1, 2, 4])
    expect(ARPEGGIO_FINGERINGS['Bb major'].lh2).toEqual([2, 1, 4, 2, 1, 4, 2])
    expect(ARPEGGIO_FINGERINGS['Bb minor'].rh2).toEqual([2, 3, 1, 2, 3, 1, 4])
    expect(ARPEGGIO_FINGERINGS['C major'].rh2).toEqual([1, 2, 3, 1, 2, 3, 5])
  })
})

describe('chord fingerings', () => {
  it('every quality and inversion has a fingering of the right size', () => {
    for (const q of CHORD_QUALITIES) {
      for (const inv of inversionsFor(q.id)) {
        const f = chordFingering(q.size, inv)
        expect(f.rh).toHaveLength(q.size)
        expect(f.lh).toHaveLength(q.size)
      }
    }
  })
})
