import type { QuizModeId } from '../quiz/modes'
import type { ChordQualityId } from '../theory/types'
import { guideHref, type ExternalResource, type GuideLink, type TheorySection } from './guide'

/**
 * The chord path: a topic-focused curriculum that takes a beginner from
 * "what is a chord?" to playing whole songs from chord symbols. Unlike the
 * grade-staged learning guide, its seven units follow one thread — harmony —
 * across levels. Same conventions as the guide: static data, no tracking,
 * every link validated against the real registries by
 * src/tests/chordPath.test.ts.
 *
 * The `practice` and `check` lists hold only completable material (lessons
 * and quizzes — things that earn a ✓ from practice history); browse/reference
 * links live inside theory sections.
 */

export interface ChordUnit {
  id: string
  title: string
  tagline: string
  overview: string
  theory: TheorySection[]
  practice: GuideLink[]
  check: GuideLink[]
  moveOnWhen: string[]
  resources: ExternalResource[]
}

/** Hash href for a chord-path link — carries from=chord-path for the breadcrumb. */
export const chordPathHref = (link: GuideLink): string => guideHref(link, 'chord-path')

/**
 * Where each chord-path practice method lives — the Practice screen renders
 * these as "Chord path →" chips. Unit ids are integrity-tested.
 */
export const METHOD_CHORD_UNIT: Record<string, string> = {
  'Triad drills': 'unit-1',
  Inversions: 'unit-2',
  'Diatonic chords': 'unit-3',
  'Cadence types': 'unit-4',
  'Cadence drills': 'unit-4',
  Progressions: 'unit-5',
  'Seventh chords': 'unit-6',
  Accompaniment: 'unit-7',
}

const lesson = (lessonId: string, label: string): GuideLink => ({ kind: 'lesson', lessonId, label })
const song = (songId: string, label: string): GuideLink => ({ kind: 'song', songId, label })
const quiz = (mode: QuizModeId, level: number, label: string): GuideLink => ({ kind: 'quiz', mode, level, label })
const chord = (root: string, quality: ChordQualityId, label: string): GuideLink => ({ kind: 'chord', root, quality, label })

const MUSICTHEORY_NET: ExternalResource = {
  title: 'musictheory.net — chord lessons',
  url: 'https://www.musictheory.net/lessons',
  note: 'Free interactive lessons; the chord chapters (building triads, inversions, diatonic chords) mirror these units.',
}
const MICHAEL_NEW: ExternalResource = {
  title: 'Michael New (YouTube)',
  url: 'https://www.youtube.com/@MichaelNew',
  note: 'Unhurried whiteboard theory — his videos on building chords and why progressions work pair perfectly with units 1–5.',
}
const OPEN_MUSIC_THEORY: ExternalResource = {
  title: 'Open Music Theory (free textbook)',
  url: 'https://viva.pressbooks.pub/openmusictheory/',
  note: 'A proper open-source harmony textbook when you want the full story behind roman numerals, function and cadences.',
}
const HOOKTHEORY: ExternalResource = {
  title: 'Hooktheory — TheoryTab database',
  url: 'https://www.hooktheory.com/theorytab',
  note: 'Thousands of real songs analyzed with roman numerals — search any song you love and see its progression.',
}
const BILL_HILTON_CHORDS: ExternalResource = {
  title: 'Bill Hilton (YouTube)',
  url: 'https://www.youtube.com/@BillHilton',
  note: 'Practical piano accompaniment: chord voicings, left-hand patterns and playing from lead sheets, calmly explained.',
}

export const CHORD_UNITS: ChordUnit[] = [
  // ── Unit 1 ────────────────────────────────────────────────────────────────
  {
    id: 'unit-1',
    title: 'Unit 1 — What a chord is',
    tagline: 'Intervals, triads, and the four qualities',
    overview:
      'A chord is just notes sounding together — but which notes? This unit builds chords from scratch: ' +
      'intervals stack into triads, and two small choices (the size of the 3rd and the 5th) produce the four ' +
      'triad qualities that colour almost all music. By the end you can build, play and hear major, minor, ' +
      'diminished and augmented triads.',
    theory: [
      {
        title: 'Two notes make an interval, three make a chord',
        body:
          'The distance between two notes is an interval, and chords are built by stacking one particular interval: ' +
          'the 3rd — every other note as you walk up a scale (C, skip D, E, skip F, G). Stack two 3rds and you get a ' +
          'triad: root, 3rd and 5th. On the staff a root-position triad is unmistakable — three notes stacked on ' +
          'adjacent lines or adjacent spaces, a little snowman. If you can find a root and count skips, you can build ' +
          'any chord in this unit.',
        links: [
          quiz('intervals', 1, 'Ear quiz: intervals — up, down, or the same?'),
          quiz('interval-staff', 1, 'Reading quiz: intervals on the staff'),
        ],
      },
      {
        title: 'Major, minor — and the other two',
        body:
          'All triads have a root, 3rd and 5th; the quality lives in the exact sizes. A major triad has a major 3rd ' +
          'on the bottom (four semitones) — bright, settled. Lower that 3rd one semitone and it turns minor — darker, ' +
          'more inward — while the root and 5th stay put. The last two qualities move the 5th: diminished shrinks it ' +
          '(tense, unstable, wants to collapse inward), augmented stretches it (floating, unresolved, faintly eerie). ' +
          'One root, four colours — train your ear on the difference before your fingers memorize the shapes.',
        links: [
          chord('C', 'major', 'Chords library — C major, up close'),
          chord('C', 'minor', 'Chords library — C minor, one semitone darker'),
          quiz('chords', 1, 'Ear quiz: major or minor?'),
        ],
      },
      {
        title: 'Spelling chords',
        body:
          'Every chord has a spelling: C major is C–E–G, always, in any octave. Spelling chords from their symbol ' +
          '(Cm means C–Eb–G) is the literacy skill the rest of the path leans on — progressions, lead sheets and ' +
          'quizzes all talk in symbols. Learn a few roots deeply rather than all twelve shallowly; the pattern of ' +
          'whole keyboard transfers.',
        links: [quiz('chord-spelling', 1, 'Quiz: which notes spell this chord?')],
      },
    ],
    practice: [
      lesson('triad-blocks-majors', 'Major triads — C, F and G'),
      lesson('triad-blocks-minors', 'Minor triads — Am, Dm and Em'),
      lesson('triad-quality-contrast', 'Four qualities side by side'),
    ],
    check: [
      quiz('chord-spelling', 2, 'Spell triads incl. dim & aug'),
      quiz('chords', 2, 'Ear: name the triad quality'),
    ],
    moveOnWhen: [
      'You can play C, F, G, Am, Dm and Em as block chords without searching for notes',
      'Played a major then a minor triad, you can say which is which with your eyes closed',
      'Given a chord symbol like Dm or G, you can name its three notes within a few seconds',
    ],
    resources: [MUSICTHEORY_NET, MICHAEL_NEW],
  },

  // ── Unit 2 ────────────────────────────────────────────────────────────────
  {
    id: 'unit-2',
    title: 'Unit 2 — Inversions',
    tagline: 'Same notes, different bass — the key to smooth changes',
    overview:
      'A triad does not have to sit root-on-the-bottom. Rearrange the same three notes and you get inversions — ' +
      'and with them, the single most practical chord skill there is: moving between chords with almost no hand ' +
      'movement. This unit is where chords stop being isolated shapes and start connecting.',
    theory: [
      {
        title: 'Root position, first and second inversion',
        body:
          'Take C major (C–E–G) and move the bottom note up an octave: E–G–C, first inversion. Do it again: G–C–E, ' +
          'second inversion. Same three notes, same chord — different note in the bass, different flavour of the same ' +
          'colour. Chord symbols write inversions with a slash: C/E means "C major with E on the bottom". On the staff ' +
          'the tidy snowman comes apart — one note sits a 4th above its neighbour — which is exactly how you spot an ' +
          'inversion when reading.',
        links: [
          { kind: 'route', route: '/chords?root=C&quality=major', label: 'Chords library — flip C major through its inversions' },
          quiz('chords', 5, 'Ear quiz: qualities in any inversion'),
        ],
      },
      {
        title: 'Why inversions exist',
        body:
          'Play C, then F, then G, all in root position, and your hand leaps around the keyboard. Play C, then F as ' +
          'F/C, then G as G/B, and your hand barely moves — each chord keeps a note or lands next door. Less movement ' +
          'means fewer wrong notes, faster changes, and a smoother sound, because the notes themselves move by step ' +
          'instead of by leap. Every accompanist voices chords this way by instinct; this unit makes the instinct ' +
          'deliberate.',
        links: [lesson('broken-C-major', 'Warm-up: C major broken through its inversions')],
      },
    ],
    practice: [
      lesson('inversion-ladder-C', 'Inversion ladder in C'),
      lesson('inversion-ladder-G', 'Inversion ladder in G'),
      lesson('inversion-ladder-F', 'Inversion ladder in F'),
      lesson('inversion-switch-C', 'Chord switching in C (slash chords)'),
      lesson('inversion-switch-G', 'Chord switching in G'),
      lesson('inversion-switch-F', 'Chord switching in F'),
      lesson('broken-A-minor', 'A minor broken chords'),
    ],
    check: [
      quiz('chords', 5, 'Ear: qualities in any inversion'),
      quiz('chord-spelling', 2, 'Spelling check under pressure'),
    ],
    moveOnWhen: [
      'You can climb a major triad root → 1st → 2nd → octave and back without looking at a chart',
      'C → F/C → G/B → C flows without stopping, and you can name the bass note of each shape',
      'You understand a slash symbol like G/B at sight',
    ],
    resources: [MUSICTHEORY_NET, BILL_HILTON_CHORDS],
  },

  // ── Unit 3 ────────────────────────────────────────────────────────────────
  {
    id: 'unit-3',
    title: 'Unit 3 — Chords come from scales',
    tagline: 'Diatonic chords and roman numerals',
    overview:
      'Why do certain chords sound like they belong together? Because they are all made from the same scale. ' +
      'Build a triad on every note of a major scale and you get the seven diatonic chords of that key — the pool ' +
      'nearly every song draws from — and roman numerals give them names that work in every key at once.',
    theory: [
      {
        title: 'Harmonizing the scale',
        body:
          'Take C major and build a snowman on each note using only white keys: C–E–G, D–F–A, E–G–B and so on. ' +
          'Nobody chose the qualities that come out — the scale spacing dictates them, and the pattern is always ' +
          'major, minor, minor, major, major, minor, diminished. That fixed pattern is why a song in C and the same ' +
          'song in F feel identical: the chords sit in the same seats, just built on different notes.',
        links: [
          { kind: 'scale', root: 'C', type: 'major', label: 'Scales library — C major, the raw material' },
          lesson('diatonic-triads-C', 'Play the seven chords of C major'),
        ],
      },
      {
        title: 'Roman numerals — names that travel',
        body:
          'Numbering the diatonic chords with roman numerals (I ii iii IV V vi vii°) names a chord by its seat in ' +
          'the key instead of its letter: upper-case for major, lower-case for minor, ° for diminished. Say "the ' +
          'IV chord" and you mean F in C major, C in G major, Bb in F major — one name, every key. Progressions are ' +
          'always discussed this way, which is why learning numerals now pays for itself for the rest of the path.',
        links: [quiz('chord-function', 1, 'Quiz: name I, IV and V in easy keys')],
      },
      {
        title: 'Minor keys',
        body:
          'Minor keys harmonize the same way with one famous exception: the V chord is usually played major, not ' +
          'minor, by raising the scale\'s 7th note (the harmonic minor). That raised leading tone is what gives ' +
          'V its pull home even in minor — without it, minor-key music loses its sense of arrival. The full minor ' +
          'pattern is i ii° III iv V VI VII.',
        links: [quiz('chord-function', 5, 'Quiz: diatonic chords in minor keys')],
      },
    ],
    practice: [
      lesson('diatonic-triads-C', 'Diatonic triads of C major'),
      lesson('diatonic-triads-G', 'Diatonic triads of G major'),
      lesson('diatonic-triads-F', 'Diatonic triads of F major'),
    ],
    check: [
      quiz('chord-function', 2, 'Numerals beyond the primaries'),
      quiz('chord-function', 3, 'Numerals in more keys'),
    ],
    moveOnWhen: [
      'You can play the seven diatonic triads of C, G and F up the scale, naming the numerals',
      'Asked "what is the V of D major?" you can answer (A major) without playing it',
      'You can recite the quality pattern — M m m M M m dim — from memory',
    ],
    resources: [OPEN_MUSIC_THEORY, MUSICTHEORY_NET],
  },

  // ── Unit 4 ────────────────────────────────────────────────────────────────
  {
    id: 'unit-4',
    title: 'Unit 4 — Harmonic function and cadences',
    tagline: 'Home, away, tension — why progressions work',
    overview:
      'Chords are not interchangeable: each diatonic chord does a job. Some feel like home, some lead away from ' +
      'it, and one exists to demand the return. This unit is the "why" of the whole path — once you hear function, ' +
      'progressions stop being arbitrary lists and start being stories with grammar.',
    theory: [
      {
        title: 'Three jobs: tonic, subdominant, dominant',
        body:
          'The I chord is the tonic — home, rest, the place phrases end. IV is the subdominant — a step away from ' +
          'home, motion without urgency. V is the dominant — tension that points straight back at I. Every other ' +
          'diatonic chord is a understudy for one of these three (vi shadows I, ii shadows IV, vii° shadows V), ' +
          'which is why three chords are enough to harmonize thousands of songs and why I–IV–V–I feels like a ' +
          'complete journey: home, away, tension, home.',
        links: [lesson('cadence-C', 'Play home–away–tension–home: I–IV–V–I in C')],
      },
      {
        title: 'Cadences — musical punctuation',
        body:
          'A cadence is how a phrase ends, and there are four to know. Authentic (V–I) is the full stop — the ' +
          'strongest arrival in music. Plagal (IV–I) is the gentle "amen" of hymn endings. The half cadence stops ' +
          'ON V — a comma, a held breath, a question mark. And the deceptive cadence (V–vi) promises home and lands ' +
          'on its minor shadow instead — the surprise composers use to keep a phrase going when you expected it to ' +
          'close. Learn to hear all four; they are the punctuation marks of every piece you will ever play.',
        links: [
          lesson('cadence-types-C', 'Play all four cadences in C'),
          quiz('cadence', 1, 'Ear quiz: full stop or comma?'),
        ],
      },
      {
        title: 'The leading tone',
        body:
          'Why does V pull so hard toward I? Inside the V chord sits the scale\'s 7th note — the leading tone — one ' +
          'semitone below the tonic, close enough to ache for resolution. Play B against a G chord in C major and ' +
          'hold it: your ear leans toward C before your finger moves. Composers control this force constantly, and ' +
          'in unit 6 you\'ll see the V7 chord double it with a second unstable note.',
        links: [quiz('cadence', 2, 'Ear quiz: more cadence types')],
      },
    ],
    practice: [
      lesson('cadence-C', 'I–IV–V–I in C'),
      lesson('cadence-G', 'I–IV–V–I in G'),
      lesson('cadence-F', 'I–IV–V–I in F'),
      lesson('cadence-types-C', 'The four cadences in C'),
      lesson('cadence-types-G', 'The four cadences in G'),
    ],
    check: [
      quiz('cadence', 3, 'Ear: name the cadence'),
      quiz('chord-function', 1, 'Function check: I, IV and V'),
    ],
    moveOnWhen: [
      'You can play I–IV–V–I from memory in C, G and F',
      'Hearing a phrase end, you can say whether it closed (authentic/plagal) or hung (half/deceptive)',
      'You can explain in one sentence why V wants to move to I',
    ],
    resources: [OPEN_MUSIC_THEORY, MICHAEL_NEW],
  },

  // ── Unit 5 ────────────────────────────────────────────────────────────────
  {
    id: 'unit-5',
    title: 'Unit 5 — The great progressions',
    tagline: 'Pop, doo-wop, blues, and ii–V–I',
    overview:
      'A handful of chord loops power an absurd share of Western music. This unit puts the big four under your ' +
      'hands — the pop loop, the 50s progression, the 12-bar blues and the jazz ii–V–I — in voicings that barely ' +
      'move, and shows why each one works using the functions you learned in unit 4.',
    theory: [
      {
        title: 'I–V–vi–IV: four chords, a thousand songs',
        body:
          'The modern pop loop visits home (I), tension (V), home\'s minor shadow (vi) and the gentle away chord ' +
          '(IV), then rolls around again — a complete emotional circuit with no dead ends, which is why it loops so ' +
          'well. Let It Be, No Woman No Cry, Someone Like You and hundreds more sit on exactly these four chords. ' +
          'Start the same loop from vi (vi–IV–I–V) and you get its melancholy twin.',
        links: [
          lesson('prog-pop-C', 'Loop I–V–vi–IV in C'),
          { kind: 'route', route: '/circle', label: 'Circle of fifths — see why I, IV and V are neighbours' },
        ],
      },
      {
        title: 'The 50s progression: I–vi–IV–V',
        body:
          'Reorder the same four chords and the character changes completely: I–vi–IV–V is the doo-wop ballad — ' +
          'Stand By Me, Earth Angel, Blue Moon. The crucial difference is the ending: each lap closes on V, so the ' +
          'loop hands itself back to I with a push rather than drifting. Same ingredients, different grammar — ' +
          'proof that order matters as much as content in harmony.',
        links: [lesson('prog-50s-C', 'Loop the 50s progression in C')],
      },
      {
        title: 'The 12-bar blues',
        body:
          'The blues is a form, not just a progression: twelve bars in a fixed map — four bars of I, two of IV, two ' +
          'of I, then the V–IV–I turnaround that folds the end back into the beginning. Knowing where you are in the ' +
          'form at all times is the actual skill, and it transfers straight to jam sessions: say "blues in C" and ' +
          'everyone in the room knows all twelve bars.',
        links: [
          lesson('prog-blues-triads-C', 'The form with plain triads'),
          song('twelve-bar-blues-c', 'Hear it as a song: 12-bar blues in C'),
        ],
      },
      {
        title: 'ii–V–I: the jazz cell',
        body:
          'Jazz builds its harmony from one three-chord move: ii–V–I — subdominant understudy, dominant, home. It ' +
          'is the authentic cadence with an approach chord in front, and jazz tunes chain it through key after key. ' +
          'You already played it in unit 4 without the name; the jazz lessons voice it with guide tones so each ' +
          'chord melts into the next.',
        links: [lesson('jazz-251-C', 'ii–V–I with guide tones in C')],
      },
    ],
    practice: [
      lesson('prog-pop-C', 'Pop progression in C'),
      lesson('prog-pop-G', 'Pop progression in G'),
      lesson('prog-pop-F', 'Pop progression in F'),
      lesson('prog-50s-C', '50s progression in C'),
      lesson('prog-50s-G', '50s progression in G'),
      lesson('prog-blues-triads-C', '12-bar blues with triads'),
      lesson('jazz-251-C', 'ii–V–I in C'),
    ],
    check: [
      quiz('chord-function', 4, 'All seven numerals in major keys'),
      quiz('cadence', 4, 'Ear: cadences in context'),
    ],
    moveOnWhen: [
      'You can loop I–V–vi–IV and I–vi–IV–V in two keys without reading',
      'You can play the 12-bar form from memory and always know which bar you are in',
      'Hearing a pop song, you can often feel where the loop restarts',
    ],
    resources: [HOOKTHEORY, MICHAEL_NEW],
  },

  // ── Unit 6 ────────────────────────────────────────────────────────────────
  {
    id: 'unit-6',
    title: 'Unit 6 — Seventh chords',
    tagline: 'Four-note colour, and the engine of resolution',
    overview:
      'Stack one more 3rd on a triad and you enter four-note harmony: seventh chords. One of them — the dominant ' +
      '7th — is the single most important chord in tonal music, because it concentrates the key\'s tension into one ' +
      'sonority. The others are the colours that make jazz, soul and film music sound the way they do.',
    theory: [
      {
        title: 'The four common sevenths',
        body:
          'Major 7th (Cmaj7): a major triad plus a major 7th — dreamy, suspended, the sound of bossa nova and ' +
          'ballads. Dominant 7th (G7): major triad plus a flat 7th — bluesy and restless, built to resolve. Minor ' +
          '7th (Dm7): minor triad plus flat 7th — soft, rounded, the workhorse ii chord. Half-diminished (Bm7♭5): ' +
          'a diminished triad with a minor 7th — the dark doorway into minor keys. Each is one small alteration ' +
          'away from its neighbours; play them side by side and the personalities separate quickly.',
        links: [
          chord('G', 'dominant 7th', 'Chords library — G7 up close'),
          chord('C', 'major 7th', 'Chords library — Cmaj7, the dreamy one'),
          quiz('chords', 3, 'Ear quiz: seventh-chord qualities'),
        ],
      },
      {
        title: 'V7 → I: the strongest pull in music',
        body:
          'Add the 7th to the V chord and the tension doubles, because G7 contains B and F — a tritone, the most ' +
          'unstable interval there is — and both notes resolve by a single semitone in opposite directions: B rises ' +
          'to C, F falls to E. That squeeze is the engine inside every authentic cadence, every blues turnaround and ' +
          'every jazz ii–V–I. The resolution drill strips it down to those two notes so you can feel the mechanism ' +
          'directly under two fingers.',
        links: [lesson('v7-resolve-C', 'Resolve G7 to C — full chords, then the bare tritone')],
      },
      {
        title: 'Sevenths inside the key',
        body:
          'Harmonize the major scale in four-note stacks and each seat gets a characteristic seventh: Imaj7, ii7, ' +
          'iii7, IVmaj7, V7, vi7, viiø7. Notice that the dominant-7th quality occurs on exactly one seat — V — which ' +
          'is why hearing that quality anywhere instantly implies "a V of something". The jazz ii–V–I you met in ' +
          'unit 5 is simply seats two, five and one played with their native sevenths: Dm7 → G7 → Cmaj7.',
        links: [lesson('jazz-251-C', 'ii7–V7–Imaj7 with guide tones')],
      },
    ],
    practice: [
      lesson('sevenths-blocks-C', 'The four sevenths as blocks'),
      lesson('v7-resolve-C', 'V7 → I in C'),
      lesson('v7-resolve-G', 'V7 → I in G'),
      lesson('v7-resolve-F', 'V7 → I in F'),
      lesson('jazz-251-F', 'ii–V–I in F'),
    ],
    check: [
      quiz('chord-spelling', 3, 'Spell the common sevenths'),
      quiz('chords', 4, 'Ear: all qualities incl. sevenths'),
    ],
    moveOnWhen: [
      'You can play Cmaj7, Dm7, G7 and Bm7♭5 and name each quality by ear more often than not',
      'You can resolve V7 to I in three keys and point at the two notes doing the work',
      'You know which scale seat owns the dominant-7th sound, and why that matters',
    ],
    resources: [OPEN_MUSIC_THEORY, MUSICTHEORY_NET],
  },

  // ── Unit 7 ────────────────────────────────────────────────────────────────
  {
    id: 'unit-7',
    title: 'Unit 7 — Accompaniment craft',
    tagline: 'Voice leading, left-hand patterns, and the lead sheet',
    overview:
      'Everything so far becomes music here. Voice leading turns chord changes into smooth lines; left-hand ' +
      'patterns turn held chords into motion; and the lead sheet — a melody with chord symbols — is the format in ' +
      'which most of the world\'s songs are actually written down. The capstone: accompany a whole song from ' +
      'symbols alone.',
    theory: [
      {
        title: 'Voice leading — move as little as possible',
        body:
          'The rule of thumb behind every smooth progression: keep common tones, and move the other voices by step. ' +
          'You have been doing this since unit 2 — the inversion switches, the chained progression voicings and the ' +
          'jazz guide tones are all the same principle at different strengths. When you voice chords yourself, reach ' +
          'for the inversion that shares notes with where you are, not the root position that happens to match the ' +
          'symbol.',
        links: [
          lesson('inversion-switch-C', 'Revisit: the smooth switches that started it'),
          lesson('jazz-251-C', 'Guide tones — voice leading distilled to two notes'),
        ],
      },
      {
        title: 'Left-hand patterns',
        body:
          'A chord symbol tells you what to play, never how — that choice is the accompaniment pattern. Block ' +
          'chords give solemn support; broken chords ripple; the Alberti bass (bottom–top–middle–top) sparkles ' +
          'through Mozart; the root–chord "stride" bounce drives ragtime and campfire songs alike. Same four chords, ' +
          'four completely different characters — pattern is arrangement, and arrangement is a choice you now get ' +
          'to make.',
        links: [song('mozart-k545', 'Hear Alberti bass in the wild: Mozart K545')],
      },
      {
        title: 'Reading a lead sheet',
        body:
          'A lead sheet is a melody line with chord symbols above it — no left-hand staff, no voicings, just C, Am, ' +
          'F, G7 and your judgement. It looks like less information; it is actually a licence: any voicing, any ' +
          'pattern, any register that serves the song is correct. Reading one is the exact skill this path has been ' +
          'assembling — spell the symbol (unit 1), choose a close voicing (units 2 and 7), trust the progression\'s ' +
          'grammar (units 4–5). Songbooks, jazz fake books and almost every pop transcription online are written ' +
          'this way.',
        links: [song('when-the-saints', 'The tune you\'ll accompany: When the Saints')],
      },
    ],
    practice: [
      lesson('accomp-block-C', 'Block-chord accompaniment'),
      lesson('accomp-broken-C', 'Broken-chord accompaniment'),
      lesson('accomp-alberti-C', 'Alberti bass'),
      lesson('accomp-stride-C', 'Root–chord stride'),
      lesson('arpeggio-C-major', 'C major arpeggio — the pattern stretched wide'),
      lesson('lead-sheet-capstone', 'Capstone: When the Saints from symbols'),
    ],
    check: [
      quiz('chord-spelling', 4, 'Spelling: the full quality set'),
      quiz('chord-function', 6, 'Function: both modes, all numerals'),
    ],
    moveOnWhen: [
      'You can accompany I–vi–IV–V with all four patterns without stopping between bars',
      'You can play When the Saints from its chord symbols alone, eyes on the symbols not your hands',
      'Handed a new three-chord song as a lead sheet, you could work out an accompaniment in a few minutes',
    ],
    resources: [BILL_HILTON_CHORDS, HOOKTHEORY],
  },
]
