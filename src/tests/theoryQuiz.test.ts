import { describe, expect, it } from 'vitest'
import { Note } from 'tonal'
import type { Rng } from '../lib/ear/quiz'
import { getChord } from '../lib/theory/chords'
import {
  CHORD_FUNCTION_LEVEL_COUNT,
  CHORD_SPELLING_LEVEL_DEFS,
  CHORD_SPELLING_LEVELS,
  CIRCLE_LEVEL_COUNT,
  INTERVAL_STAFF_LEVEL_DEFS,
  KEY_SIGNATURE_LEVELS,
  NOTE_NAMING_LEVELS,
  READ_MELODY_LEVELS,
  SEAM_PAIRS,
  makeChordFunctionQuestion,
  makeChordSpellingQuestion,
  makeCircleQuestion,
  makeIntervalStaffQuestion,
  makeKeySignatureQuestion,
  makeNoteNamingQuestion,
  makeReadMelodyQuestion,
  sigAccidentals,
} from '../lib/theory/quiz'
import { CIRCLE_KEYS } from '../lib/theory/circle'
import { getScale } from '../lib/theory/scales'
import {
  CADENCE_LEVEL_DEFS,
  CHORD_LEVELS,
  ECHO_LEVELS,
  INTERVAL_LEVEL_DEFS,
  SCALE_TYPE_LEVELS,
} from '../lib/ear/quiz'
import { makeRhythmDictationQuestion, RHYTHM_DICTATION_LEVELS } from '../lib/quiz/rhythmQuiz'
import { SIGHT_READ_QUIZ_MAX_LEVEL } from '../lib/quiz/sightReadQuiz'
import { RHYTHM_PATTERNS } from '../lib/data/rhythms'
import { QUIZ_LEVEL_COUNTS } from '../lib/quiz/modes'

function seededRng(seed: number): Rng {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

const seeds = Array.from({ length: 60 }, (_, i) => i + 1)

// The LCG's first draw is nearly constant for small consecutive seeds, so
// generators that pick a question VARIANT with their first draw would only
// ever exercise branch 0 under `seeds`. Spread seeds hit every branch.
const spreadSeeds = seeds.map((s) => (s * 104729 + 17) >>> 0)

const expectValidOptions = (options: string[], answer: string) => {
  expect(options.filter((o) => o === answer)).toHaveLength(1)
  expect(new Set(options).size).toBe(options.length)
  expect(options.length).toBeGreaterThanOrEqual(2)
  expect(options.length).toBeLessThanOrEqual(4)
}

describe('makeNoteNamingQuestion', () => {
  it('answer names the rendered midi pitch class', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      for (const seed of seeds) {
        const q = makeNoteNamingQuestion(level, seededRng(seed))
        expectValidOptions(q.options, q.answer)
        const expected = Note.pitchClass(Note.fromMidi(q.midi)).replace('#', '♯').replace('b', '♭')
        expect(q.answer).toBe(expected)
      }
    }
  })

  it('respects the level range and accidental rule', () => {
    for (const level of [1, 2, 3] as const) {
      const def = NOTE_NAMING_LEVELS[level - 1]
      for (const seed of seeds) {
        const q = makeNoteNamingQuestion(level, seededRng(seed))
        expect(q.midi).toBeGreaterThanOrEqual(def.range[0])
        expect(q.midi).toBeLessThanOrEqual(def.range[1])
        expect([0, 2, 4, 5, 7, 9, 11]).toContain(q.midi % 12) // naturals only
        expect(def.clefs).toContain(q.clef)
      }
    }
  })

  it('level 1 is treble-only', () => {
    for (const seed of seeds) {
      expect(makeNoteNamingQuestion(1, seededRng(seed)).clef).toBe('treble')
    }
  })

  it('keeps bass-clef notes below and treble notes above the staff break', () => {
    for (const seed of seeds) {
      const q = makeNoteNamingQuestion(3, seededRng(seed))
      if (q.clef === 'treble') expect(q.midi).toBeGreaterThanOrEqual(57)
      else expect(q.midi).toBeLessThanOrEqual(64)
    }
  })

  it('level 6 answers name the exact octave and match the midi', () => {
    for (const seed of seeds) {
      const q = makeNoteNamingQuestion(6, seededRng(seed))
      expectValidOptions(q.options, q.answer)
      expect(q.answer).toMatch(/^[A-G]\d$/) // naturals only, octave-precise
      expect(Note.midi(q.answer)).toBe(q.midi)
      for (const o of q.options) expect(o).toMatch(/^[A-G]-?\d$/)
      expect(q.explanation).toContain('Middle C is C4')
    }
  })
})

describe('makeReadMelodyQuestion', () => {
  const nameOf = (midi: number) => Note.pitchClass(Note.fromMidi(midi)).replace('#', '♯').replace('b', '♭')

  it('names match the rendered midis and live in the option pool', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      for (const seed of seeds) {
        const q = makeReadMelodyQuestion(level, seededRng(seed))
        const def = READ_MELODY_LEVELS[level - 1]
        expect(q.midis).toHaveLength(def.count)
        expect(q.names).toHaveLength(def.count)
        q.midis.forEach((m, i) => {
          expect(q.names[i]).toBe(nameOf(m))
          expect(q.optionPool).toContain(q.names[i])
        })
        expect(new Set(q.optionPool).size).toBe(q.optionPool.length)
        expect(def.clefs).toContain(q.clef)
      }
    }
  })

  it('respects the level range, clef side and accidental rule', () => {
    for (const level of [1, 2, 3] as const) {
      const def = READ_MELODY_LEVELS[level - 1]
      for (const seed of seeds) {
        const q = makeReadMelodyQuestion(level, seededRng(seed))
        for (const m of q.midis) {
          expect(m).toBeGreaterThanOrEqual(def.range[0])
          expect(m).toBeLessThanOrEqual(def.range[1])
          expect([0, 2, 4, 5, 7, 9, 11]).toContain(m % 12) // naturals only below level 4
          if (q.clef === 'treble') expect(m).toBeGreaterThanOrEqual(57)
          else expect(m).toBeLessThanOrEqual(64)
        }
      }
    }
  })

  it('level 1 is treble-only with the seven natural letters', () => {
    for (const seed of seeds) {
      const q = makeReadMelodyQuestion(1, seededRng(seed))
      expect(q.clef).toBe('treble')
      expect(q.optionPool).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
    }
  })

  it('is deterministic under a fixed seed and carries a teaching explanation', () => {
    for (const seed of seeds) {
      const a = makeReadMelodyQuestion(3, seededRng(seed))
      const b = makeReadMelodyQuestion(3, seededRng(seed))
      expect(a.midis).toEqual(b.midis)
      expect(a.explanation.length).toBeGreaterThan(20)
    }
  })

  it('level 6 phrases are diatonic to a real key with in-key spellings', () => {
    const def = READ_MELODY_LEVELS[5]
    for (const seed of seeds) {
      const q = makeReadMelodyQuestion(6, seededRng(seed))
      expect(def.keys).toContain(q.keySignature)
      const scaleChromas = new Set(
        getScale(q.keySignature, 'major').notes.map((n) => Note.chroma(n)!),
      )
      expect(q.midis).toHaveLength(def.count)
      q.midis.forEach((m, i) => {
        expect(scaleChromas.has(m % 12), `${q.keySignature}: midi ${m}`).toBe(true)
        // The displayed name spells the same pitch class (F♯ in G major, B♭ in F major).
        const ascii = q.names[i].replace('♯', '#').replace('♭', 'b')
        expect(Note.chroma(ascii)).toBe(m % 12)
        expect(q.optionPool).toContain(q.names[i])
      })
      expect(new Set(q.optionPool).size).toBe(q.optionPool.length)
    }
  })
})

describe('makeKeySignatureQuestion', () => {
  it('answer matches the rendered signature (major levels)', () => {
    for (const level of [1, 2, 3]) {
      for (const seed of seeds) {
        const q = makeKeySignatureQuestion(level, seededRng(seed))
        expectValidOptions(q.options, q.answer)
        expect(q.answer).toBe(`${q.keySignature} major`.replace('#', '♯').replace('b', '♭'))
        expect(KEY_SIGNATURE_LEVELS[level - 1]).toContain(q.keySignature)
      }
    }
  })

  it('level 4 asks for the relative minor', () => {
    for (const seed of seeds) {
      const q = makeKeySignatureQuestion(4, seededRng(seed))
      expect(q.prompt).toContain('minor')
      expect(q.answer.endsWith('minor')).toBe(true)
      // The relative minor sits three semitones below its major.
      const major = q.keySignature
      const minorName = q.answer.replace(' minor', '').replace('♯', '#').replace('♭', 'b')
      expect((Note.chroma(major)! - Note.chroma(minorName)! + 12) % 12).toBe(3)
    }
  })

  it('level 5 asks either direction, matching prompt and answer', () => {
    const modes = new Set<string>()
    for (const seed of seeds) {
      const q = makeKeySignatureQuestion(5, seededRng(seed))
      const asked = q.prompt.includes('minor key') ? 'minor' : 'major'
      modes.add(asked)
      expect(q.answer.endsWith(asked)).toBe(true)
      if (asked === 'major') {
        expect(q.answer).toBe(`${q.keySignature} major`.replace('#', '♯').replace('b', '♭'))
      }
    }
    expect(modes).toEqual(new Set(['major', 'minor']))
  })

  it('level 6 answers name the full relative pair', () => {
    for (const seed of seeds) {
      const q = makeKeySignatureQuestion(6, seededRng(seed))
      expect(q.prompt).toContain('pair')
      expect(q.answer).toMatch(/^[A-G][♯♭]? major \/ [A-G][♯♭]? minor$/)
      const [majorPart, minorPart] = q.answer.split(' / ')
      const major = majorPart.replace(' major', '').replace('♯', '#').replace('♭', 'b')
      const minor = minorPart.replace(' minor', '').replace('♯', '#').replace('♭', 'b')
      expect(major).toBe(q.keySignature)
      expect((Note.chroma(major)! - Note.chroma(minor)! + 12) % 12).toBe(3)
    }
  })
})

describe('makeCircleQuestion', () => {
  const chromaOf = (label: string) => Note.chroma(label.replace(' major', '').replace(' minor', '').replace('♯', '#').replace('♭', 'b'))!

  it('level 1 answers sit a fifth away from the asked key', () => {
    for (const seed of seeds) {
      const q = makeCircleQuestion(1, seededRng(seed))
      expectValidOptions(q.options, q.answer)
      const m = /fifth (up|down) from (\S+) major\?/.exec(q.prompt)!
      const [, dir, key] = m
      const expected = dir === 'up' ? 7 : 5
      expect((chromaOf(q.answer) - chromaOf(key) + 12) % 12).toBe(expected)
    }
  })

  it('level 2 counts match sigAccidentals in both question directions', () => {
    for (const seed of seeds) {
      const q = makeCircleQuestion(2, seededRng(seed))
      expectValidOptions(q.options, q.answer)
      const asCount = /How many (sharp|flat)s does (\S+) major have\?/.exec(q.prompt)
      if (asCount) {
        const [, kind, key] = asCount
        const acc = sigAccidentals(key.replace('♯', '#').replace('♭', 'b'))
        expect(acc.kind).toBe(`${kind}s`)
        expect(q.answer).toBe(String(acc.names.length))
      } else {
        const m = /Which major key has (\d) (sharp|flat)s?\?/.exec(q.prompt)!
        const [, n, kind] = m
        const acc = sigAccidentals(q.answer.replace(' major', '').replace('♯', '#').replace('♭', 'b'))
        expect(acc.kind).toBe(`${kind}s`)
        expect(acc.names.length).toBe(Number(n))
      }
    }
  })

  it('level 3 sets the staff signature and keeps the minor three semitones below', () => {
    for (const seed of seeds) {
      const q = makeCircleQuestion(3, seededRng(seed))
      expectValidOptions(q.options, q.answer)
      expect(q.keySignature).toBeTruthy()
      const majorChroma = Note.chroma(q.keySignature!)!
      const minorLabel = q.answer.endsWith('minor')
        ? q.answer
        : /^(\S+) minor/.exec(q.prompt)![0]
      expect((majorChroma - chromaOf(minorLabel) + 12) % 12).toBe(3)
      if (!q.answer.endsWith('minor')) {
        expect(q.answer).toBe(`${q.keySignature} major`.replace('#', '♯').replace('b', '♭'))
      }
    }
  })

  it('level 4 geometry answers are consistent with the circle model', () => {
    for (const seed of spreadSeeds) {
      const q = makeCircleQuestion(4, seededRng(seed))
      expectValidOptions(q.options, q.answer)
      const neighbours = /either side of (\S+) major/.exec(q.prompt)
      const added = /clockwise from (\S+) major to (\S+) major/.exec(q.prompt)
      if (neighbours) {
        const key = neighbours[1]
        const [a, b] = q.answer.split(' and ')
        expect((chromaOf(key) - chromaOf(a) + 12) % 12).toBe(7)
        expect((chromaOf(b) - chromaOf(key) + 12) % 12).toBe(7)
      } else if (added) {
        // The added accidental is the new key's last sharp.
        const acc = sigAccidentals(added[2].replace('♯', '#').replace('♭', 'b'))
        expect(acc.names[acc.names.length - 1]).toBe(q.answer)
      } else {
        // Seam variant: the answer must be the asked key's enharmonic pair.
        const asked = /(\S+) major is the same piano keys as/.exec(q.prompt)![1]
        const pair = SEAM_PAIRS.find(([from]) => from === asked)!
        expect(q.answer).toBe(`${pair[2]} major`)
        expect(chromaOf(q.answer)).toBe(chromaOf(`${asked} major`))
      }
    }
  })

  it('level 5 measures circle distances correctly', () => {
    for (const seed of spreadSeeds) {
      const q = makeCircleQuestion(5, seededRng(seed))
      expectValidOptions(q.options, q.answer)
      const twoStep = /two fifths (up|down) from (\S+) major\?/.exec(q.prompt)
      if (twoStep) {
        const [, dir, key] = twoStep
        const expected = dir === 'up' ? 2 : 10 // two fifths = a whole step
        expect((chromaOf(q.answer) - chromaOf(key) + 12) % 12).toBe(expected)
      } else {
        const key = /opposite (\S+) major/.exec(q.prompt)![1]
        expect((chromaOf(q.answer) - chromaOf(key) + 12) % 12).toBe(6) // tritone
      }
    }
  })

  it('level 6 knows the minor ring', () => {
    for (const seed of spreadSeeds) {
      const q = makeCircleQuestion(6, seededRng(seed))
      expectValidOptions(q.options, q.answer)
      const neighbour = /one step (clockwise|anticlockwise) from (\S+) minor\?/.exec(q.prompt)
      const count = /How many (sharp|flat)s does (\S+) minor have\?/.exec(q.prompt)
      const reverse = /Which minor key has (\d) (sharp|flat)s?\?/.exec(q.prompt)
      if (neighbour) {
        const [, dir, minor] = neighbour
        const expected = dir === 'clockwise' ? 7 : 5
        expect((chromaOf(q.answer) - chromaOf(`${minor} minor`) + 12) % 12).toBe(expected)
      } else if (count) {
        const [, kind, minor] = count
        // The minor's accidentals are its relative major's (three semitones up).
        const majorChroma = (chromaOf(`${minor} minor`) + 3) % 12
        const major = CIRCLE_KEYS.find((c) => Note.chroma(c.major) === majorChroma)!
        expect(major.accidentals.kind).toBe(`${kind}s`)
        expect(q.answer).toBe(String(major.accidentals.names.length))
      } else {
        const [, n, kind] = reverse!
        const majorChroma = (chromaOf(q.answer) + 3) % 12
        const major = CIRCLE_KEYS.find((c) => Note.chroma(c.major) === majorChroma)!
        expect(major.accidentals.kind).toBe(`${kind}s`)
        expect(major.accidentals.names.length).toBe(Number(n))
      }
    }
  })

  it('every level carries a teaching explanation', () => {
    for (let level = 1; level <= CIRCLE_LEVEL_COUNT; level++) {
      for (const seed of seeds) {
        expect(makeCircleQuestion(level, seededRng(seed)).explanation.length).toBeGreaterThan(20)
      }
    }
  })
})

describe('makeIntervalStaffQuestion', () => {
  it('answer names the rendered interval, always ascending', () => {
    for (let level = 1; level <= INTERVAL_STAFF_LEVEL_DEFS.length; level++) {
      for (const seed of seeds) {
        const q = makeIntervalStaffQuestion(level, seededRng(seed))
        expectValidOptions(q.options, q.answer)
        expect(q.midis[1]).toBeGreaterThanOrEqual(q.midis[0])
      }
    }
  })

  it('bottom note is always a natural in the treble staff (levels 1–4)', () => {
    for (const seed of seeds) {
      const q = makeIntervalStaffQuestion(4, seededRng(seed))
      expect(q.clef).toBe('treble')
      expect(q.harmonic).toBe(false)
      expect([0, 2, 4, 5, 7, 9, 11]).toContain(q.midis[0] % 12)
      expect(q.midis[0]).toBeGreaterThanOrEqual(60)
      expect(q.midis[0]).toBeLessThanOrEqual(72)
    }
  })

  it('levels 5–6 use both clefs with the bottom note inside the staff', () => {
    const clefs = new Set<string>()
    for (const level of [5, 6]) {
      for (const seed of seeds) {
        const q = makeIntervalStaffQuestion(level, seededRng(seed))
        clefs.add(q.clef)
        expect(q.harmonic).toBe(level === 6)
        if (level === 6) expect(q.midis[1]).toBeGreaterThan(q.midis[0]) // no stacked unison
        const lo = q.clef === 'treble' ? 60 : 43
        expect(q.midis[0]).toBeGreaterThanOrEqual(lo)
        expect(q.midis[0]).toBeLessThanOrEqual(lo + 12)
      }
    }
    expect(clefs).toEqual(new Set(['treble', 'bass']))
  })
})

describe('makeChordSpellingQuestion', () => {
  it('answer spells the chord exactly as tonal does', () => {
    for (let level = 1; level <= CHORD_SPELLING_LEVEL_DEFS.length; level++) {
      for (const seed of seeds) {
        const q = makeChordSpellingQuestion(level, seededRng(seed))
        expectValidOptions(q.options, q.answer)
        expect(q.prompt).toContain(q.symbol)
        // Reverse-check: the answer's notes must be a real chord of the level's qualities.
        const spelledNotes = q.answer.split(' – ')
        const { qualities, roots } = CHORD_SPELLING_LEVEL_DEFS[level - 1]
        const match = qualities.some((quality) => {
          for (const root of roots) {
            const chord = getChord(root, quality, 0)
            const spelling = chord.noteNames.map((n) => Note.pitchClass(n).replace('#', '♯').replace('b', '♭'))
            if (spelling.join(' – ') === q.answer && chord.symbol === q.symbol) return true
          }
          return false
        })
        expect(match, `${q.symbol} → ${q.answer}`).toBe(true)
        expect(spelledNotes.length === 3 || spelledNotes.length === 4).toBe(true)
      }
    }
  })

  it('no option ever contains a double accidental or a mangled spelling', () => {
    for (let level = 1; level <= CHORD_SPELLING_LEVEL_DEFS.length; level++) {
      for (const seed of seeds) {
        const q = makeChordSpellingQuestion(level, seededRng(seed))
        for (const opt of q.options) {
          for (const note of opt.split(' – ')) {
            expect(note, `${q.symbol}: ${opt}`).toMatch(/^[A-G][♯♭]?$/)
          }
        }
      }
    }
  })
})

describe('makeChordFunctionQuestion', () => {
  const EXPECTED: Record<string, Record<string, [string, string]>> = {
    major: {
      I: ['1P', 'major'],
      ii: ['2M', 'minor'],
      iii: ['3M', 'minor'],
      IV: ['4P', 'major'],
      V: ['5P', 'major'],
      vi: ['6M', 'minor'],
      'vii°': ['7M', 'diminished'],
    },
    minor: {
      i: ['1P', 'minor'],
      'ii°': ['2M', 'diminished'],
      III: ['3m', 'major'],
      iv: ['4P', 'minor'],
      V: ['5P', 'major'],
      VI: ['6m', 'major'],
      VII: ['7m', 'major'],
    },
  }

  it('answer is the correct diatonic chord at every level and mode', () => {
    for (let level = 1; level <= CHORD_FUNCTION_LEVEL_COUNT; level++) {
      for (const seed of seeds) {
        const q = makeChordFunctionQuestion(level, seededRng(seed))
        expectValidOptions(q.options, q.answer)
        const m = /In the key of (\S+) (major|minor), which chord is (\S+)\?/.exec(q.prompt)!
        expect(m).toBeTruthy()
        const [, key, mode, numeral] = m
        const [interval, quality] = EXPECTED[mode][numeral]
        expect(q.answer).toBe(`${Note.pitchClass(Note.transpose(key, interval))} ${quality}`)
      }
    }
  })

  it('level 1 sticks to primary chords in easy keys', () => {
    for (const seed of seeds) {
      const q = makeChordFunctionQuestion(1, seededRng(seed))
      expect(q.prompt).toMatch(/In the key of [CGF] major, which chord is (I|IV|V)\?/)
    }
  })

  it('level 5 asks the minor starter set; level 6 mixes both modes', () => {
    for (const seed of seeds) {
      const q = makeChordFunctionQuestion(5, seededRng(seed))
      expect(q.prompt).toMatch(/In the key of [A-G]b? minor, which chord is (i|iv|V|VI)\?/)
    }
    const modes = new Set(
      spreadSeeds.map((seed) =>
        makeChordFunctionQuestion(6, seededRng(seed)).prompt.includes(' minor,') ? 'minor' : 'major',
      ),
    )
    expect(modes).toEqual(new Set(['major', 'minor']))
  })
})

describe('makeRhythmDictationQuestion', () => {
  it('options contain the answer exactly once and share the level', () => {
    for (const level of RHYTHM_DICTATION_LEVELS) {
      for (const seed of seeds) {
        const q = makeRhythmDictationQuestion(level, seededRng(seed))
        expect(q.options.filter((p) => p.id === q.answer.id)).toHaveLength(1)
        expect(new Set(q.options.map((p) => p.id)).size).toBe(q.options.length)
        expect(q.options.length).toBe(3)
        for (const p of q.options) expect(p.level).toBe(level)
      }
    }
  })

  it('options always share the answer time signature (meter must not give it away)', () => {
    for (const level of RHYTHM_DICTATION_LEVELS) {
      for (const seed of seeds) {
        const q = makeRhythmDictationQuestion(level, seededRng(seed))
        for (const p of q.options) expect(p.timeSignature).toEqual(q.answer.timeSignature)
      }
    }
  })

  it('distractors never share the answer event list', () => {
    for (const seed of seeds) {
      const q = makeRhythmDictationQuestion(3, seededRng(seed))
      for (const p of q.options) {
        if (p.id !== q.answer.id) expect(p.events).not.toEqual(q.answer.events)
      }
    }
  })

  it('every (level, meter) group has enough patterns for 3 options', () => {
    const groups = new Map<string, number>()
    for (const p of RHYTHM_PATTERNS) {
      const key = `level ${p.level} in ${p.timeSignature.join('/')}`
      groups.set(key, (groups.get(key) ?? 0) + 1)
    }
    expect(new Set(RHYTHM_PATTERNS.map((p) => p.level))).toEqual(new Set(RHYTHM_DICTATION_LEVELS))
    for (const [key, count] of groups) expect(count, key).toBeGreaterThanOrEqual(3)
  })
})

describe('sigAccidentals', () => {
  it('lists the exact accidentals per major key', () => {
    expect(sigAccidentals('C')).toEqual({ kind: 'none', names: [] })
    expect(sigAccidentals('G')).toEqual({ kind: 'sharps', names: ['F♯'] })
    expect(sigAccidentals('D')).toEqual({ kind: 'sharps', names: ['F♯', 'C♯'] })
    expect(sigAccidentals('F#')).toEqual({ kind: 'sharps', names: ['F♯', 'C♯', 'G♯', 'D♯', 'A♯', 'E♯'] })
    expect(sigAccidentals('F')).toEqual({ kind: 'flats', names: ['B♭'] })
    expect(sigAccidentals('Db')).toEqual({ kind: 'flats', names: ['B♭', 'E♭', 'A♭', 'D♭', 'G♭'] })
  })
})

describe('question explanations', () => {
  it('every option-based question carries a non-empty explanation', () => {
    for (const seed of seeds) {
      const rng = () => seededRng(seed)
      expect(makeNoteNamingQuestion(4, rng()).explanation.length).toBeGreaterThan(20)
      expect(makeKeySignatureQuestion(3, rng()).explanation.length).toBeGreaterThan(20)
      expect(makeIntervalStaffQuestion(4, rng()).explanation.length).toBeGreaterThan(20)
      expect(makeChordSpellingQuestion(3, rng()).explanation.length).toBeGreaterThan(20)
      expect(makeChordFunctionQuestion(3, rng()).explanation.length).toBeGreaterThan(20)
      expect(makeRhythmDictationQuestion(2, rng()).explanation.length).toBeGreaterThan(5)
    }
  })

  it('key-signature explanation lists the exact accidentals of the rendered signature', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const seed of seeds) {
        const q = makeKeySignatureQuestion(level, seededRng(seed))
        const acc = sigAccidentals(q.keySignature)
        if (acc.kind === 'none') {
          expect(q.explanation).toContain('no sharps or flats')
        } else {
          expect(q.explanation).toContain(`${acc.names.length} ${acc.kind.slice(0, -1)}${acc.names.length === 1 ? '' : 's'}`)
          expect(q.explanation).toContain(acc.names.join(', '))
        }
      }
    }
  })

  it('note-naming explanation names the answer and the right clef mnemonic', () => {
    for (const seed of seeds) {
      const q = makeNoteNamingQuestion(2, seededRng(seed))
      expect(q.explanation).toContain(q.answer)
      expect(q.explanation).toContain(q.clef === 'treble' ? 'Every Good Boy' : 'All Cows Eat Grass')
    }
  })

  it('chord-function explanation names the answer chord root', () => {
    for (const seed of seeds) {
      const q = makeChordFunctionQuestion(3, seededRng(seed))
      const root = q.answer.split(' ')[0]
      expect(q.explanation).toContain(`that root is ${root}`)
    }
  })

  it('rhythm-dictation explanation quotes the answer pattern label', () => {
    for (const seed of seeds) {
      const q = makeRhythmDictationQuestion(3, seededRng(seed))
      expect(q.explanation).toContain(q.answer.label)
    }
  })
})

describe('quiz mode registry', () => {
  it('level counts match the generator level tables for all 14 modes', () => {
    expect(QUIZ_LEVEL_COUNTS['intervals']).toBe(INTERVAL_LEVEL_DEFS.length)
    expect(QUIZ_LEVEL_COUNTS['chords']).toBe(CHORD_LEVELS.length)
    expect(QUIZ_LEVEL_COUNTS['scale-type']).toBe(SCALE_TYPE_LEVELS.length)
    expect(QUIZ_LEVEL_COUNTS['cadence']).toBe(CADENCE_LEVEL_DEFS.length)
    expect(QUIZ_LEVEL_COUNTS['echo']).toBe(ECHO_LEVELS.length)
    expect(QUIZ_LEVEL_COUNTS['rhythm-dictation']).toBe(RHYTHM_DICTATION_LEVELS.length)
    expect(QUIZ_LEVEL_COUNTS['note-naming']).toBe(NOTE_NAMING_LEVELS.length)
    expect(QUIZ_LEVEL_COUNTS['read-melody']).toBe(READ_MELODY_LEVELS.length)
    expect(QUIZ_LEVEL_COUNTS['sight-read']).toBe(SIGHT_READ_QUIZ_MAX_LEVEL)
    expect(QUIZ_LEVEL_COUNTS['key-signature']).toBe(KEY_SIGNATURE_LEVELS.length)
    expect(QUIZ_LEVEL_COUNTS['circle-of-fifths']).toBe(CIRCLE_LEVEL_COUNT)
    expect(QUIZ_LEVEL_COUNTS['interval-staff']).toBe(INTERVAL_STAFF_LEVEL_DEFS.length)
    expect(QUIZ_LEVEL_COUNTS['chord-spelling']).toBe(CHORD_SPELLING_LEVELS.length)
    expect(QUIZ_LEVEL_COUNTS['chord-function']).toBe(CHORD_FUNCTION_LEVEL_COUNT)
  })
})
