import { describe, expect, it } from 'vitest'
import { allLessons } from '../lib/data/lessons'
import { MAJOR_ROOTS, MINOR_ROOTS } from '../lib/theory/scales'
import {
  buildGrammar,
  extractSlots,
  matchLesson,
  matchRoot,
  parseTranscript,
  wordsToNumber,
} from '../lib/voice/parser'

describe('wake word', () => {
  it('ignores utterances without the wake word', () => {
    expect(parseTranscript('show me d major')).toBeNull()
    expect(parseTranscript('[unk] [unk] stop')).toBeNull()
    expect(parseTranscript('')).toBeNull()
  })

  it('wake word alone arms', () => {
    expect(parseTranscript('piano')).toEqual({ kind: 'wake' })
    expect(parseTranscript('hey piano')).toEqual({ kind: 'wake' })
    expect(parseTranscript('okay piano')).toEqual({ kind: 'wake' })
  })

  it('parses without prefix when armed', () => {
    expect(parseTranscript('go home', { armed: true })).toEqual({ kind: 'navigate', route: '/' })
    expect(parseTranscript('go home', { armed: false })).toBeNull()
  })

  it('tolerates [unk] noise around the command', () => {
    // Leading noise (a piano note before speaking) is stripped, not fatal.
    expect(parseTranscript('[unk] piano stop [unk]')).toEqual({ kind: 'stop-all' })
    expect(parseTranscript('piano [unk] stop')).toEqual({ kind: 'stop-all' })
  })

  it('wake word heard but gibberish → unknown', () => {
    const intent = parseTranscript('piano purple monkey dishwasher')
    expect(intent).toMatchObject({ kind: 'unknown' })
  })
})

describe('navigation', () => {
  const cases: [string, string][] = [
    ['piano go home', '/'],
    ['piano home', '/'],
    ['piano open scales', '/scales'],
    ['piano show scales', '/scales'],
    ['piano scales', '/scales'],
    ['piano go to chords', '/chords'],
    ['piano open practice', '/practice'],
    ['piano practice', '/practice'],
    ['piano free play', '/play'],
    ['piano open free play', '/play'],
    ['piano tuner', '/tuner'],
    ['piano note detector', '/tuner'],
    ['piano open the guide', '/guide'],
    ['piano show me the learning guide', '/guide'],
    ['piano ear training', '/ear'],
    ['piano open songs', '/songs'],
    ['piano rhythm trainer', '/rhythm'],
    ['piano go to rhythm', '/rhythm'],
  ]
  for (const [phrase, route] of cases) {
    it(phrase, () => {
      expect(parseTranscript(phrase)).toEqual({ kind: 'navigate', route })
    })
  }
})

describe('guide stages', () => {
  it('show stage two', () => {
    expect(parseTranscript('piano show stage two')).toEqual({ kind: 'show-stage', stage: 2 })
  })
  it('open stage five', () => {
    expect(parseTranscript('piano open stage five')).toEqual({ kind: 'show-stage', stage: 5 })
  })
  it('bare "stage three" while armed', () => {
    expect(parseTranscript('stage three', { armed: true })).toEqual({ kind: 'show-stage', stage: 3 })
  })
  it('stage without a number falls through to unknown', () => {
    expect(parseTranscript('piano show the stage')).toEqual({ kind: 'unknown', text: 'show the stage' })
  })
})

describe('scales', () => {
  it('show me the d major scale', () => {
    expect(parseTranscript('piano show me the d major scale')).toEqual({
      kind: 'show-scale',
      root: 'D',
      scaleType: 'major',
      hand: undefined,
      explicit: true,
    })
    // Without the word "scale" the intent is implicit (screens may reinterpret).
    expect(parseTranscript('piano show me d major')).toMatchObject({ explicit: undefined })
  })

  it('be flat major → Bb (homophone)', () => {
    expect(parseTranscript('piano show me be flat major')).toMatchObject({
      kind: 'show-scale',
      root: 'Bb',
      scaleType: 'major',
    })
  })

  it('e flat harmonic minor', () => {
    expect(parseTranscript('piano e flat harmonic minor')).toMatchObject({
      kind: 'show-scale',
      root: 'Eb',
      scaleType: 'harmonic minor',
    })
  })

  it('bare minor maps to natural minor', () => {
    expect(parseTranscript('piano show me b minor')).toMatchObject({
      kind: 'show-scale',
      root: 'B',
      scaleType: 'natural minor',
    })
  })

  it('"show me a d major" does not mistake the article for a root', () => {
    expect(parseTranscript('piano show me a d major')).toMatchObject({
      kind: 'show-scale',
      root: 'D',
    })
  })

  it('"a major" is a root when quality follows', () => {
    expect(parseTranscript('piano a major scale')).toMatchObject({
      kind: 'show-scale',
      root: 'A',
      scaleType: 'major',
    })
  })

  it('homophones are only roots when sharp/flat/quality follows', () => {
    // "see" as an ordinary verb must not become the note C…
    expect(parseTranscript('piano can i see the chords')).toMatchObject({ kind: 'unknown' })
    expect(parseTranscript('piano let me see it')).not.toMatchObject({ kind: 'show-scale' })
    // …but still works as a spoken note letter.
    expect(parseTranscript('piano show me see sharp')).toMatchObject({
      kind: 'show-scale',
      root: 'C#',
    })
    expect(parseTranscript('piano see major')).toMatchObject({ kind: 'show-scale', root: 'C' })
  })

  it('left hand / right hand', () => {
    expect(parseTranscript('piano left hand')).toEqual({ kind: 'set-hand', hand: 'L' })
    expect(parseTranscript('piano right hand')).toEqual({ kind: 'set-hand', hand: 'R' })
  })
})

describe('chords', () => {
  it('d minor seventh first inversion', () => {
    expect(parseTranscript('piano show me d minor seventh first inversion')).toEqual({
      kind: 'show-chord',
      root: 'D',
      quality: 'minor 7th',
      inversion: 1,
      hand: undefined,
    })
  })

  it('c sharp diminished', () => {
    expect(parseTranscript('piano c sharp diminished')).toMatchObject({
      kind: 'show-chord',
      root: 'C#',
      quality: 'diminished',
    })
  })

  it('f dominant seventh', () => {
    expect(parseTranscript('piano f dominant seventh')).toMatchObject({
      kind: 'show-chord',
      root: 'F',
      quality: 'dominant 7th',
    })
  })

  it('"d major chord" is a chord, not a scale', () => {
    expect(parseTranscript('piano show me the d major chord')).toMatchObject({
      kind: 'show-chord',
      root: 'D',
      quality: 'major',
    })
  })

  it('bare "d major" defaults to scale', () => {
    expect(parseTranscript('piano d major')).toMatchObject({ kind: 'show-scale' })
  })

  it('inversion without root', () => {
    expect(parseTranscript('piano first inversion')).toEqual({ kind: 'set-inversion', inversion: 1 })
    expect(parseTranscript('piano root position')).toEqual({ kind: 'set-inversion', inversion: 0 })
    expect(parseTranscript('piano third inversion')).toEqual({ kind: 'set-inversion', inversion: 3 })
  })

  it('block and arpeggio demos', () => {
    expect(parseTranscript('piano block')).toEqual({ kind: 'play-demo', variant: 'block' })
    expect(parseTranscript('piano arpeggio')).toEqual({ kind: 'play-demo', variant: 'arpeggio' })
    expect(parseTranscript('piano break it up')).toEqual({ kind: 'play-demo', variant: 'arpeggio' })
  })
})

describe('metronome and tempo', () => {
  it('start with bpm', () => {
    expect(parseTranscript('piano start the metronome at ninety')).toEqual({
      kind: 'metronome',
      action: 'start',
      bpm: 90,
    })
    expect(parseTranscript('piano metronome on at one hundred and twenty')).toMatchObject({
      kind: 'metronome',
      bpm: 120,
    })
  })

  it('start without bpm', () => {
    expect(parseTranscript('piano start the metronome')).toEqual({
      kind: 'metronome',
      action: 'start',
      bpm: undefined,
    })
  })

  it('stop', () => {
    expect(parseTranscript('piano stop the metronome')).toEqual({ kind: 'metronome', action: 'stop' })
    expect(parseTranscript('piano metronome off')).toEqual({ kind: 'metronome', action: 'stop' })
  })

  it('set tempo', () => {
    expect(parseTranscript('piano set tempo to ninety')).toEqual({ kind: 'set-bpm', bpm: 90 })
    expect(parseTranscript('piano tempo 120')).toEqual({ kind: 'set-bpm', bpm: 120 })
  })

  it('slower / faster', () => {
    expect(parseTranscript('piano slower')).toEqual({ kind: 'set-bpm', delta: -10 })
    expect(parseTranscript('piano faster')).toEqual({ kind: 'set-bpm', delta: 10 })
  })
})

describe('global commands', () => {
  it('stop / cancel', () => {
    expect(parseTranscript('piano stop')).toEqual({ kind: 'stop-all' })
    expect(parseTranscript('piano cancel')).toEqual({ kind: 'stop-all' })
  })

  it('help', () => {
    expect(parseTranscript('piano help')).toEqual({ kind: 'help' })
    expect(parseTranscript('piano what can i say')).toEqual({ kind: 'help' })
  })

  it('voice off', () => {
    expect(parseTranscript('piano voice off')).toEqual({ kind: 'voice-off' })
    expect(parseTranscript('piano go to sleep')).toEqual({ kind: 'voice-off' })
  })

  it('mic start/stop', () => {
    expect(parseTranscript('piano start listening')).toEqual({ kind: 'mic', action: 'start' })
    expect(parseTranscript('piano check my chord')).toEqual({ kind: 'mic', action: 'start' })
    expect(parseTranscript('piano stop listening')).toEqual({ kind: 'mic', action: 'stop' })
    expect(parseTranscript('piano stop the mic')).toEqual({ kind: 'mic', action: 'stop' })
  })
})

describe('lessons and free play', () => {
  it('practice five finger', () => {
    expect(parseTranscript('piano practice five finger')).toEqual({
      kind: 'open-lesson',
      query: 'five finger',
    })
  })

  it('bare lesson keyword', () => {
    expect(parseTranscript('piano sight reading')).toMatchObject({ kind: 'open-lesson' })
  })

  it('lesson flow', () => {
    expect(parseTranscript('piano restart')).toEqual({ kind: 'lesson', action: 'restart' })
    expect(parseTranscript('piano next part')).toEqual({ kind: 'lesson', action: 'next' })
    expect(parseTranscript('piano next')).toEqual({ kind: 'lesson', action: 'next' })
    expect(parseTranscript('piano back to lessons')).toEqual({ kind: 'lesson', action: 'exit' })
    expect(parseTranscript('piano new melody')).toEqual({ kind: 'lesson', action: 'new-melody' })
  })

  it('demo', () => {
    expect(parseTranscript('piano demo')).toEqual({ kind: 'play-demo' })
    expect(parseTranscript('piano play it')).toEqual({ kind: 'play-demo' })
  })

  it('free play controls', () => {
    expect(parseTranscript('piano melody mode')).toEqual({
      kind: 'free-play',
      action: 'set-mode',
      mode: 'melody',
    })
    expect(parseTranscript('piano chord mode')).toMatchObject({ mode: 'chords' })
    expect(parseTranscript('piano record at one hundred')).toEqual({
      kind: 'free-play',
      action: 'record',
      bpm: 100,
    })
    expect(parseTranscript('piano stop recording')).toEqual({
      kind: 'free-play',
      action: 'stop-recording',
    })
    expect(parseTranscript('piano clear')).toEqual({ kind: 'free-play', action: 'clear' })
    expect(parseTranscript('piano copy the notes')).toEqual({ kind: 'free-play', action: 'copy' })
  })
})

describe('wordsToNumber', () => {
  it('parses words and digits', () => {
    expect(wordsToNumber(['ninety'])).toBe(90)
    expect(wordsToNumber(['one', 'hundred', 'and', 'twenty'])).toBe(120)
    expect(wordsToNumber(['one', 'hundred', 'twenty'])).toBe(120)
    expect(wordsToNumber(['a', 'hundred'])).toBe(100)
    expect(wordsToNumber(['120'])).toBe(120)
    expect(wordsToNumber(['sixty'])).toBe(60)
  })

  it('rejects absurd or missing values', () => {
    expect(wordsToNumber(['five'])).toBeNull() // < 30
    expect(wordsToNumber(['nine', 'hundred'])).toBeNull() // > 240
    expect(wordsToNumber(['hello'])).toBeNull()
    expect(wordsToNumber([])).toBeNull()
  })
})

describe('matchRoot', () => {
  it('maps enharmonics onto the available spelling', () => {
    expect(matchRoot('C#', MAJOR_ROOTS)).toBe('Db')
    expect(matchRoot('Db', MAJOR_ROOTS)).toBe('Db')
    expect(matchRoot('Eb', MINOR_ROOTS)).toBe('Eb')
    expect(matchRoot('D#', MINOR_ROOTS)).toBe('Eb')
    expect(matchRoot('C', MAJOR_ROOTS)).toBe('C')
  })

  it('returns null for junk', () => {
    expect(matchRoot('X', MAJOR_ROOTS)).toBeNull()
  })
})

describe('matchLesson', () => {
  const lessons = allLessons()

  it('matches five finger with a root', () => {
    const id = matchLesson('five finger in c', lessons)
    expect(id).toBe('five-finger-C')
  })

  it('matches Hanon via alias', () => {
    expect(matchLesson('finger exercise', lessons)).toBe('hanon-1')
    expect(matchLesson('hanon', lessons)).toBe('hanon-1')
  })

  it('matches cadences and scale routine', () => {
    expect(matchLesson('cadence in c', lessons)).toMatch(/^cadence-/)
    expect(matchLesson('scale routine', lessons)).toMatch(/^scale-/)
  })

  it('returns null when nothing overlaps', () => {
    expect(matchLesson('quantum banjo', lessons)).toBeNull()
  })
})

describe('extractSlots', () => {
  it('pulls every slot type in one pass', () => {
    expect(extractSlots('c sharp diminished second inversion right hand at ninety')).toEqual({
      root: 'C#',
      scaleType: undefined,
      chordQuality: 'diminished',
      inversion: 2,
      hand: 'R',
      bpm: 90,
    })
  })

  it('agrees with parseTranscript on homophones and articles', () => {
    expect(extractSlots('show me be flat major').root).toBe('Bb')
    expect(extractSlots('can i see the chords').root).toBeUndefined()
    expect(extractSlots('show me a d major').root).toBe('D')
  })

  it('returns all-undefined for slotless text', () => {
    expect(extractSlots('keep going')).toEqual({
      root: undefined,
      scaleType: undefined,
      chordQuality: undefined,
      inversion: undefined,
      hand: undefined,
      bpm: undefined,
    })
  })
})

describe('fast path regression (canonical phrasings never fall to the fallback)', () => {
  // The embedding fallback only sees {kind:'unknown'}; every canonical
  // phrasing must keep parsing on the regex fast path.
  const cases: [string, string][] = [
    ['piano stop', 'stop-all'],
    ['piano help', 'help'],
    ['piano go home', 'navigate'],
    ['piano open scales', 'navigate'],
    ['piano free play', 'navigate'],
    ['piano show me d major', 'show-scale'],
    ['piano be flat major', 'show-scale'],
    ['piano d minor seventh first inversion', 'show-chord'],
    ['piano start the metronome at ninety', 'metronome'],
    ['piano metronome off', 'metronome'],
    ['piano set tempo to ninety', 'set-bpm'],
    ['piano faster', 'set-bpm'],
    ['piano play it', 'play-demo'],
    ['piano next', 'lesson'],
    ['piano restart', 'lesson'],
    ['piano practice five finger', 'open-lesson'],
    ['piano record at one hundred', 'free-play'],
    ['piano stop recording', 'free-play'],
    ['piano clear', 'free-play'],
    ['piano start listening', 'mic'],
    ['piano stop the mic', 'mic'],
    ['piano voice off', 'voice-off'],
    ['piano left hand', 'set-hand'],
    ['piano first inversion', 'set-inversion'],
  ]
  for (const [phrase, kind] of cases) {
    it(`${phrase} → ${kind}`, () => {
      expect(parseTranscript(phrase)).toMatchObject({ kind })
    })
  }
})

describe('buildGrammar', () => {
  const grammar = buildGrammar(allLessons())

  it('includes [unk], the wake word, and core vocabulary', () => {
    expect(grammar).toContain('[unk]')
    expect(grammar).toContain('piano')
    expect(grammar).toContain('metronome')
    expect(grammar).toContain('seventh')
    expect(grammar).toContain('ninety')
    expect(grammar).toContain('hundred')
  })

  it('includes conversational filler and intent-bank vocabulary', () => {
    expect(grammar).toContain('please')
    expect(grammar).toContain('could')
    expect(grammar).toContain('beat')
    expect(grammar).toContain('together')
  })

  it('has no duplicates', () => {
    expect(new Set(grammar).size).toBe(grammar.length)
  })

  it('excludes out-of-vocab proper nouns and non-alphabetic lesson tokens', () => {
    expect(grammar).not.toContain('hanon')
    for (const w of grammar) {
      if (w === '[unk]') continue
      expect(w).toMatch(/^[a-z]+$/)
    }
  })
})
