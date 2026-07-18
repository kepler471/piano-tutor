/**
 * Beginner glossary behind the term tooltips (Term.svelte / GlossText.svelte).
 *
 * Entry ids for scale types and chord qualities are EXACTLY the ScaleTypeId /
 * ChordQualityId union strings so the library screens can look them up
 * directly ('major' covers both the scale and the chord sense).
 *
 * annotateGlossary() is the pure auto-annotator used by GlossText: it marks
 * glossary terms inside prose (word-boundary, longest-match-first, first
 * occurrence of each term only, capped) — vitest-covered in glossary.test.ts.
 */

export interface GlossaryEntry {
  /** Canonical lowercase key, e.g. 'arpeggio', 'half-diminished' */
  id: string
  /** Display name, e.g. 'Arpeggio' */
  term: string
  /** 1–2 sentence beginner definition — the tooltip body. Keep short. */
  short: string
  /** Extra surface forms the annotator matches (plurals, spellings). */
  aliases?: string[]
}

const ENTRIES: GlossaryEntry[] = [
  // ── Pitch & intervals ────────────────────────────────────────────────
  {
    id: 'interval',
    term: 'Interval',
    short:
      'The distance between two notes, counted in letter names: C to E is a 3rd (C-D-E). Each interval has its own sound.',
    aliases: ['intervals'],
  },
  {
    id: 'semitone',
    term: 'Semitone',
    short:
      'The smallest step on the piano — from any key to its nearest neighbour, black or white. Two semitones make a whole step.',
    aliases: ['semitones', 'half step', 'half steps', 'half-step'],
  },
  {
    id: 'whole step',
    term: 'Whole step',
    short: 'Two semitones — e.g. C to D. Also called a tone. Scales are recipes of whole and half steps.',
    aliases: ['whole steps', 'whole tone'],
  },
  {
    id: 'octave',
    term: 'Octave',
    short:
      'The distance from one note to the next note with the same name, 8 letter names up — e.g. middle C to the C above. They sound "the same, but higher".',
    aliases: ['octaves'],
  },
  {
    id: 'tritone',
    term: 'Tritone',
    short:
      'The interval of 6 semitones (e.g. F to B) — famously tense and unstable. It sits exactly half-way through the octave.',
  },
  {
    id: 'blue note',
    term: 'Blue note',
    short:
      'A deliberately lowered note — usually the flat 3rd, 5th or 7th — that gives blues and jazz their bittersweet colour.',
    aliases: ['blue notes'],
  },

  // ── Reading music ────────────────────────────────────────────────────
  {
    id: 'staff',
    term: 'Staff',
    short:
      'The five lines music is written on. Notes sit on lines or in spaces; higher on the staff means higher in pitch.',
    aliases: ['stave'],
  },
  {
    id: 'treble clef',
    term: 'Treble clef',
    short:
      'The 𝄞 symbol: marks the staff for higher notes, usually your right hand. The clef curls around the G line.',
  },
  {
    id: 'bass clef',
    term: 'Bass clef',
    short:
      'The 𝄢 symbol: marks the staff for lower notes, usually your left hand. Its two dots surround the F line.',
  },
  {
    id: 'grand staff',
    term: 'Grand staff',
    short:
      'Treble and bass staves joined by a brace — how piano music is written, one staff per hand, with middle C between them.',
  },
  {
    id: 'ledger line',
    term: 'Ledger line',
    short:
      'A short extra line for notes that sit above or below the staff. Middle C sits on one, between the two staves.',
    aliases: ['ledger lines'],
  },
  {
    id: 'middle c',
    term: 'Middle C',
    short:
      'The C nearest the middle of the keyboard — the landmark between the treble and bass staves. Find it just left of the two black keys nearest the centre.',
  },
  {
    id: 'key signature',
    term: 'Key signature',
    short:
      'The sharps or flats printed at the start of each line. They apply for the whole piece and tell you what key you are in.',
    aliases: ['key signatures'],
  },
  {
    id: 'accidental',
    term: 'Accidental',
    short:
      'A sharp (♯), flat (♭) or natural (♮) written next to a note, changing it for the rest of that bar only.',
    aliases: ['accidentals'],
  },
  {
    id: 'time signature',
    term: 'Time signature',
    short:
      'The two numbers at the start, e.g. 4/4: the top says how many beats per bar, the bottom what note value gets one beat.',
    aliases: ['time signatures'],
  },
  {
    id: 'bar',
    term: 'Bar',
    short:
      'One group of beats, separated by vertical bar lines — 4/4 time has four beats per bar. Also called a measure.',
    aliases: ['measure', 'measures', 'bar line', 'bar lines', 'barline', 'barlines'],
  },

  // ── Rhythm ───────────────────────────────────────────────────────────
  {
    id: 'tempo',
    term: 'Tempo',
    short:
      'How fast the beat goes, measured in beats per minute (BPM). ♩=80 means 80 quarter-note beats every minute.',
    aliases: ['bpm', 'beats per minute'],
  },
  {
    id: 'metronome',
    term: 'Metronome',
    short:
      'A steady click that keeps the beat for you. Practising with it trains even, reliable timing — start slow, then raise the tempo.',
  },
  {
    id: 'whole note',
    term: 'Whole note',
    short: 'The longest common note value: held for four beats in 4/4 — a whole bar.',
    aliases: ['whole notes', 'semibreve'],
  },
  {
    id: 'half note',
    term: 'Half note',
    short: 'A note held for two beats — half a bar in 4/4. Drawn as a hollow head with a stem.',
    aliases: ['half notes', 'minim'],
  },
  {
    id: 'quarter note',
    term: 'Quarter note',
    short: 'The one-beat note — the steady walking pulse of most music. Drawn as a filled head with a stem.',
    aliases: ['quarter notes', 'quarters', 'crotchet'],
  },
  {
    id: 'eighth note',
    term: 'Eighth note',
    short: 'Half a beat — two per beat, counted "1-and-2-and". Drawn with a flag, or beamed together in pairs.',
    aliases: ['eighth notes', 'eighths', 'quaver', '8th note', '8th notes'],
  },
  {
    id: 'sixteenth note',
    term: 'Sixteenth note',
    short: 'A quarter of a beat — four per beat, counted "1-e-and-a". Drawn with a double flag or double beam.',
    aliases: ['sixteenth notes', 'sixteenths', 'semiquaver'],
  },
  {
    id: 'dotted rhythm',
    term: 'Dotted rhythm',
    short:
      'A dot after a note makes it half again as long: a dotted half lasts three beats, a dotted quarter one-and-a-half.',
    aliases: ['dotted rhythms', 'dotted note', 'dotted notes'],
  },
  {
    id: 'syncopation',
    term: 'Syncopation',
    short:
      'Putting the accent between the beats instead of on them — the rhythmic surprise behind jazz, blues and pop grooves.',
    aliases: ['syncopated', 'off-beat', 'off-beats', 'offbeat'],
  },
  {
    id: 'swing',
    term: 'Swing',
    short:
      'Playing pairs of eighth notes long-short instead of evenly — "doo-BA doo-BA" — the lilting feel of jazz.',
    aliases: ['swing feel', 'swung'],
  },
  {
    id: 'count-in',
    term: 'Count-in',
    short: 'The clicks before the music starts — one full bar to feel the tempo so your first note lands on the beat.',
  },

  // ── Scales & keys ────────────────────────────────────────────────────
  {
    id: 'major',
    term: 'Major',
    short:
      'The bright, "happy"-sounding pattern. The major scale is the do-re-mi ladder; a major chord stacks its 1st, 3rd and 5th notes.',
  },
  {
    id: 'minor',
    term: 'Minor',
    short:
      'The darker counterpart to major. A minor chord lowers the middle note (the 3rd) by a semitone; minor keys build on the minor scale.',
  },
  {
    id: 'natural minor',
    term: 'Natural minor',
    short:
      'The plain minor scale, using only the notes of its key signature — sad and folky. A-C natural minor shares all its notes with C major.',
  },
  {
    id: 'harmonic minor',
    term: 'Harmonic minor',
    short:
      'A minor scale with the 7th note raised one semitone, creating an exotic-sounding gap and a strong pull back to the home note.',
  },
  {
    id: 'melodic minor',
    term: 'Melodic minor',
    short:
      'The "singer\'s minor": raise the 6th and 7th on the way up for a smooth climb, then come down as plain natural minor.',
  },
  {
    id: 'blues',
    term: 'Blues scale',
    short:
      'Six notes with the "blue" flat 3rd, flat 5th and flat 7th. Almost any of its notes sounds good over a blues — the classic improvising scale.',
    aliases: ['blues scale', 'blues scales'],
  },
  {
    id: 'dorian',
    term: 'Dorian',
    short:
      'A minor-sounding mode with a brighter, raised 6th — think "Scarborough Fair". D dorian is all white keys from D to D.',
  },
  {
    id: 'mixolydian',
    term: 'Mixolydian',
    short:
      'A major-sounding mode with a lowered 7th — bluesy and unresolved. G mixolydian is all white keys from G to G.',
  },
  {
    id: 'major pentatonic',
    term: 'Major pentatonic',
    short:
      'A five-note scale — the major scale minus its 4th and 7th. No clashing notes, which is why it is everywhere in folk and pop.',
    aliases: ['pentatonic'],
  },
  {
    id: 'minor pentatonic',
    term: 'Minor pentatonic',
    short:
      'Five notes — the natural minor scale minus its 2nd and 6th. The go-to improvising scale of rock and blues; add one "blue" note and it becomes the blues scale.',
  },
  {
    id: 'lydian',
    term: 'Lydian',
    short:
      'A major-sounding mode with a raised 4th — floating, film-score bright. F lydian is all white keys from F to F.',
  },
  {
    id: 'phrygian',
    term: 'Phrygian',
    short:
      'A minor-sounding mode with a lowered 2nd right at the start — dark and Spanish. E phrygian is all white keys from E to E.',
  },
  {
    id: 'locrian',
    term: 'Locrian',
    short:
      'The rarest mode: lowered 2nd and 5th make it unstable and unresolved. B locrian is all white keys from B to B.',
  },
  {
    id: 'chromatic',
    term: 'Chromatic',
    short:
      'Moving by semitones — every key in order, black and white. The chromatic scale uses all twelve notes in the octave.',
    aliases: ['chromatic scale', 'chromatically'],
  },
  {
    id: 'scale degree',
    term: 'Scale degree',
    short:
      'A note\'s number within its scale: in C major, C is 1, D is 2, and so on. Chords are named after the degree they are built on.',
    aliases: ['scale degrees'],
  },
  {
    id: 'relative minor',
    term: 'Relative minor',
    short:
      'The minor key sharing a major key\'s signature, three semitones below it — A minor is the relative minor of C major.',
    aliases: ['relative major'],
  },
  {
    id: 'circle of fifths',
    term: 'Circle of fifths',
    short:
      'The clock of keys: each step clockwise adds a sharp (C→G→D…), each step anticlockwise adds a flat. Neighbours share most notes.',
  },
  {
    id: 'enharmonic',
    term: 'Enharmonic',
    short:
      'Two names for the same piano key: F♯ and G♭ sound identical. The circle of fifths meets itself at an enharmonic seam at six o\'clock.',
    aliases: ['enharmonics', 'enharmonic equivalent', 'enharmonically'],
  },
  {
    id: 'modulation',
    term: 'Modulation',
    short:
      'Changing key in the middle of a piece. Most modulations move to a neighbour on the circle of fifths, because those keys share all but one note.',
    aliases: ['modulate', 'modulates', 'modulating'],
  },
  {
    id: 'contrary motion',
    term: 'Contrary motion',
    short:
      'Hands moving in opposite directions at once — outwards then back. Both thumbs start on the same note, so the fingering mirrors itself.',
  },

  // ── Chords & harmony ─────────────────────────────────────────────────
  {
    id: 'triad',
    term: 'Triad',
    short:
      'The basic three-note chord: a root plus the notes a 3rd and a 5th above it — every other note walking up the scale.',
    aliases: ['triads'],
  },
  {
    id: 'seventh chord',
    term: 'Seventh chord',
    short:
      'A triad with one more note stacked on top — the 7th. Richer than a plain triad; the backbone of jazz harmony.',
    aliases: ['seventh chords', '7th chord', '7th chords'],
  },
  {
    id: 'diminished',
    term: 'Diminished',
    short:
      'A tense, unstable chord: root, flat 3rd and flat 5th — two stacked minor 3rds. It wants to resolve somewhere.',
  },
  {
    id: 'augmented',
    term: 'Augmented',
    short:
      'A dreamlike, unsettled chord: a major triad with its 5th pushed up a semitone — two stacked major 3rds.',
  },
  {
    id: 'dominant 7th',
    term: 'Dominant 7th',
    short:
      'A major triad plus a flat 7th (e.g. G7) — bright but restless. It pulls strongly home to the chord a 5th below.',
    aliases: ['dominant seventh', 'dominant 7'],
  },
  {
    id: 'major 7th',
    term: 'Major 7th',
    short: 'A major triad plus a major 7th (e.g. Cmaj7) — soft, warm and jazzy; the "lounge" chord.',
    aliases: ['major seventh', 'maj7'],
  },
  {
    id: 'minor 7th',
    term: 'Minor 7th',
    short: 'A minor triad plus a flat 7th (e.g. Dm7) — mellow and smooth; the workhorse minor chord of jazz and soul.',
    aliases: ['minor seventh', 'm7'],
  },
  {
    id: 'half-diminished',
    term: 'Half-diminished',
    short:
      'A diminished triad with a flat 7th on top (written m7♭5). Moody and suspenseful — the classic "ii" chord in minor keys.',
    aliases: ['half diminished', 'm7♭5', 'm7b5'],
  },
  {
    id: 'diminished 7th',
    term: 'Diminished 7th',
    short:
      'Four notes each a minor 3rd apart (e.g. Bdim7) — maximum tension, the silent-movie "drama" chord. It can resolve almost anywhere.',
    aliases: ['diminished seventh', 'dim7'],
  },
  {
    id: 'major 6th',
    term: 'Major 6th',
    short: 'A major triad plus the 6th note of its scale (e.g. C6) — a sweet, settled colour common in early jazz endings.',
    aliases: ['6th chord'],
  },
  {
    id: 'inversion',
    term: 'Inversion',
    short:
      'The same chord with a different note on the bottom: C-E-G, E-G-C and G-C-E are all C major. Inversions make chord changes smoother.',
    aliases: ['inversions', 'inverted'],
  },
  {
    id: 'root position',
    term: 'Root position',
    short: 'A chord stacked with its naming note (the root) on the bottom — C-E-G for C major.',
  },
  {
    id: 'arpeggio',
    term: 'Arpeggio',
    short: 'A chord played one note at a time, rippling up or down, instead of all together.',
    aliases: ['arpeggios', 'arpeggiated'],
  },
  {
    id: 'broken chord',
    term: 'Broken chord',
    short:
      'A chord played as a short pattern of separate notes rather than all at once — the early-grades cousin of the arpeggio.',
    aliases: ['broken chords'],
  },
  {
    id: 'cadence',
    term: 'Cadence',
    short:
      'The two-chord "punctuation" that ends a phrase. V→I sounds like a full stop; other cadences sound like commas or question marks.',
    aliases: ['cadences'],
  },
  {
    id: 'perfect cadence',
    term: 'Perfect cadence',
    short: 'V to I — the strongest "the end" sound in music, dominant home to tonic.',
    aliases: ['perfect cadences', 'authentic cadence'],
  },
  {
    id: 'plagal cadence',
    term: 'Plagal cadence',
    short: 'IV to I — the gentle "Amen" ending heard at the close of hymns.',
  },
  {
    id: 'deceptive cadence',
    term: 'Deceptive cadence',
    short:
      'V to vi — sets up a full stop, then sidesteps to a minor chord instead. The "surprise" ending that keeps the music going.',
    aliases: ['interrupted cadence'],
  },
  {
    id: 'half cadence',
    term: 'Half cadence',
    short: 'A phrase ending ON the V chord — music pausing on a question mark, waiting to continue.',
  },
  {
    id: 'tonic',
    term: 'Tonic',
    short: 'The home note or chord of the key — degree 1, written I. Music feels finished when it lands there.',
  },
  {
    id: 'subdominant',
    term: 'Subdominant',
    short: 'The chord on degree 4 of the scale, written IV — the "moving away from home" chord (F in the key of C).',
  },
  {
    id: 'dominant',
    term: 'Dominant',
    short:
      'The chord on degree 5 of the scale, written V (G in the key of C). The tension chord — it pulls back home to the tonic.',
  },
  {
    id: 'primary chords',
    term: 'Primary chords',
    short: 'The three big chords of any key — I, IV and V. Between them they can harmonize most simple melodies.',
    aliases: ['primary triads'],
  },
  {
    id: 'i–iv–v–i',
    term: 'I–IV–V–I',
    short:
      'Home, away, tension, home: the fundamental chord journey (C–F–G–C in C major). Roman numerals name chords by scale degree.',
    aliases: ['I-IV-V-I', 'I IV V I'],
  },
  {
    id: 'ii–v–i',
    term: 'ii–V–I',
    short:
      'The most common progression in jazz (Dm7–G7–Cmaj7 in C): each root falls a 5th, gliding smoothly home.',
    aliases: ['ii-V-I', 'two five one', '2-5-1'],
  },
  {
    id: 'guide tones',
    term: 'Guide tones',
    short:
      'The 3rd and 7th of a chord — the two notes that define its character. Jazz players voice-lead these while the bass covers the root.',
    aliases: ['guide tone'],
  },
  {
    id: 'voicing',
    term: 'Voicing',
    short:
      'Which notes of a chord you actually play, and how they are spread between your hands. Same chord, many voicings.',
    aliases: ['voicings'],
  },
  {
    id: 'shell voicing',
    term: 'Shell voicing',
    short:
      'A stripped-down jazz chord: just the root plus the 3rd or 7th. Two notes that imply the whole harmony — Shell A is 1+7, Shell B is 1+3.',
    aliases: ['shell voicings', 'shells'],
  },
  {
    id: 'voice leading',
    term: 'Voice leading',
    short:
      'Moving each note of a chord to the nearest note of the next chord, so changes glide instead of jump.',
  },
  {
    id: 'roman numeral',
    term: 'Roman numeral',
    short:
      'A chord named by its seat in the key: I, ii, iii, IV… Upper-case means major, lower-case minor, ° diminished. "IV" is F in C major and C in G major.',
    aliases: ['roman numerals'],
  },
  {
    id: 'diatonic',
    term: 'Diatonic',
    short:
      'Made only from the notes of the current key. The seven diatonic chords of a key are the ones built on its own scale notes.',
    aliases: ['diatonic chords', 'diatonic chord', 'diatonic triads'],
  },
  {
    id: 'leading tone',
    term: 'Leading tone',
    short:
      'The 7th note of the scale, one semitone below the tonic (B in C major). It aches to resolve upward — the pull inside every V chord.',
    aliases: ['leading tones', 'leading note'],
  },
  {
    id: 'slash chord',
    term: 'Slash chord',
    short:
      'A chord symbol like C/E: the letter before the slash is the chord, the letter after is the bass note — here C major with E on the bottom.',
    aliases: ['slash chords', 'slash symbol', 'slash names'],
  },
  {
    id: 'chord progression',
    term: 'Chord progression',
    short:
      'A repeating sequence of chords — the harmonic route a song travels. Usually named in roman numerals, like I–V–vi–IV.',
    aliases: ['chord progressions', 'progression', 'progressions'],
  },
  {
    id: 'chord symbol',
    term: 'Chord symbol',
    short:
      'Shorthand above the music naming a chord: C, Cm, C7, Cmaj7, C/E. It says what harmony to play but leaves the voicing and pattern to you.',
    aliases: ['chord symbols'],
  },
  {
    id: 'block chord',
    term: 'Block chord',
    short: 'All the notes of a chord played at exactly the same time — the solid opposite of a broken chord.',
    aliases: ['block chords', 'solid chord'],
  },
  {
    id: 'alberti bass',
    term: 'Alberti bass',
    short:
      'A left-hand pattern that breaks each chord bottom–top–middle–top, over and over — the sparkling engine of Mozart-era accompaniment.',
  },
  {
    id: 'lead sheet',
    term: 'Lead sheet',
    short:
      'A song written as just a melody line with chord symbols above it. You supply the left hand, the voicings and the pattern yourself.',
    aliases: ['lead sheets', 'fake book'],
  },
  {
    id: 'comping',
    term: 'Comping',
    short:
      'Short for "accompanying": playing rhythmic chords behind a melody or soloist, leaving space rather than filling every beat.',
  },
  {
    id: 'walking bass',
    term: 'Walking bass',
    short:
      'A left-hand line that "walks" one note per beat, mostly by step, through the chord changes — the heartbeat of jazz and blues.',
  },
  {
    id: '12-bar blues',
    term: '12-bar blues',
    short:
      'The most famous song form: twelve bars cycling through the I, IV and V chords. Thousands of songs share this exact skeleton.',
    aliases: ['twelve-bar blues', '12 bar blues'],
  },

  // ── Technique & practice ─────────────────────────────────────────────
  {
    id: 'five-finger position',
    term: 'Five-finger position',
    short:
      'One finger per key over five neighbouring notes, hand still — the classic starting position. Also called a pentascale.',
    aliases: ['five-finger positions', 'five finger position', 'pentascale', 'five-finger'],
  },
  {
    id: 'thumb-under',
    term: 'Thumb-under',
    short:
      'Passing the thumb under fingers 2–3 mid-scale so the hand glides up the keyboard without a bump — the key move in scale playing.',
    aliases: ['thumb under', 'thumb crossing', 'thumb crossings', 'thumb passes under'],
  },
  {
    id: 'legato',
    term: 'Legato',
    short:
      'Smooth and connected — each note held until the next begins, no gaps. The opposite of staccato.',
  },
  {
    id: 'staccato',
    term: 'Staccato',
    short: 'Short and detached — release each note quickly, leaving air between them. Marked with a dot over the note.',
  },
  {
    id: 'hanon',
    term: 'Hanon',
    short:
      'Charles-Louis Hanon\'s 1873 finger exercises — repeating patterns that build strength and evenness, especially in the weak 4th and 5th fingers.',
  },
  {
    id: 'fingering',
    term: 'Fingering',
    short:
      'The numbers over notes telling you which finger to use: 1 is the thumb, 5 the pinky. Good fingering makes hard passages easy.',
    aliases: ['fingerings'],
  },
  {
    id: 'sight-reading',
    term: 'Sight-reading',
    short:
      'Playing music you have never seen, straight from the page. Trains reading the staff itself instead of memorizing pieces.',
    aliases: ['sight reading', 'sight-read', 'sight read'],
  },
  {
    id: 'ear training',
    term: 'Ear training',
    short:
      'Learning to recognize intervals, chords and rhythms by sound alone — so you can play what you hear and hear what you read.',
  },
  {
    id: 'abrsm',
    term: 'ABRSM',
    short:
      'The UK exam board whose Grades 1–8 are the common yardstick for difficulty: Grade 1 is roughly a year in; Grade 8 is advanced.',
    aliases: ['abrsm grade', 'abrsm grades'],
  },
  {
    id: 'hands together',
    term: 'Hands together',
    short:
      'Playing both hands at once. Always practise hands separately first, then combine slowly — it is a genuinely new skill each time.',
    aliases: ['hands separately', 'hands separate'],
  },
]

export const GLOSSARY: ReadonlyMap<string, GlossaryEntry> = new Map(ENTRIES.map((e) => [e.id, e]))

export function lookupTerm(id: string): GlossaryEntry | undefined {
  return GLOSSARY.get(id.toLowerCase())
}

export interface TextSegment {
  text: string
  /** Set when this segment is a recognized glossary term. */
  termId?: string
}

/** Max terms annotated per string — keeps prose from becoming underline soup. */
const MAX_ANNOTATIONS = 4

/** A term/alias must stand alone: not embedded in a longer word. */
const boundary = (surface: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(surface)}(?![\\p{L}\\p{N}])`, 'iu')

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

interface Matcher {
  termId: string
  surface: string
  re: RegExp
}

// Longest surface first so 'harmonic minor' claims before 'minor'.
const MATCHERS: Matcher[] = ENTRIES.flatMap((e) =>
  [e.term, ...(e.aliases ?? [])].map((surface) => ({ termId: e.id, surface, re: boundary(surface) })),
).sort((a, b) => b.surface.length - a.surface.length)

/**
 * Split prose into segments, marking the first occurrence of each glossary
 * term (longest match wins, max MAX_ANNOTATIONS per string). Concatenating
 * the segments' text always reproduces the input exactly.
 */
export function annotateGlossary(text: string): TextSegment[] {
  const claims: { start: number; end: number; termId: string }[] = []
  const usedTerms = new Set<string>()

  for (const m of MATCHERS) {
    if (claims.length >= MAX_ANNOTATIONS) break
    if (usedTerms.has(m.termId)) continue
    const match = m.re.exec(text)
    if (!match) continue
    const start = match.index
    const end = start + match[0].length
    if (claims.some((c) => start < c.end && end > c.start)) continue
    claims.push({ start, end, termId: m.termId })
    usedTerms.add(m.termId)
  }

  claims.sort((a, b) => a.start - b.start)
  const segments: TextSegment[] = []
  let pos = 0
  for (const c of claims) {
    if (c.start > pos) segments.push({ text: text.slice(pos, c.start) })
    segments.push({ text: text.slice(c.start, c.end), termId: c.termId })
    pos = c.end
  }
  if (pos < text.length) segments.push({ text: text.slice(pos) })
  return segments
}
