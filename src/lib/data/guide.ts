import type { SightLevel } from '../sightread/generator'
import type { ChordQualityId, ScaleTypeId } from '../theory/types'
import type { QuizModeId } from '../quiz/modes'
import { buildHash } from '../routing'

/**
 * The learning guide: a staged map from first notes to early intermediate
 * (~ABRSM Grade 3–4), organizing the app's lessons, songs and quizzes into a
 * path and pointing to the outside learning that should supplement it.
 *
 * Deliberately static — the guide never tracks progress. "moveOnWhen" is
 * self-assessment prose, not checkboxes. Every link is validated against the
 * real lesson/song/quiz registries by src/tests/guide.test.ts.
 */

export type GuideLink =
  | { kind: 'lesson'; lessonId: string; label: string }
  | { kind: 'song'; songId: string; label: string }
  | { kind: 'quiz'; mode: QuizModeId; level: number; label: string }
  | { kind: 'rhythm'; level: 1 | 2 | 3 | 4; label: string }
  | { kind: 'sight'; level: SightLevel; label: string }
  | { kind: 'scale'; root: string; type: ScaleTypeId; label: string }
  | { kind: 'chord'; root: string; quality: ChordQualityId; label: string }
  | { kind: 'route'; route: string; label: string }

export interface ExternalResource {
  title: string
  url: string
  note: string
}

export interface TheorySection {
  title: string
  body: string
  links: GuideLink[]
}

export interface GuideStage {
  id: string
  title: string
  gradeEquivalent: string
  overview: string
  goals: string[]
  technique: GuideLink[]
  repertoire: GuideLink[]
  ear: GuideLink[]
  rhythm: GuideLink[]
  sight: GuideLink[]
  theory: TheorySection[]
  weeklyPlan: { totalMinutes: number; items: string[] }
  resources: ExternalResource[]
  moveOnWhen: string[]
}

/** Hash href for a guide link, e.g. '#/practice?lesson=scale-C-major'. */
export function guideHref(link: GuideLink): string {
  switch (link.kind) {
    case 'lesson':
      return '#' + buildHash('/practice', { lesson: link.lessonId })
    case 'song':
      return '#' + buildHash('/songs', { song: link.songId })
    case 'quiz':
      return '#' + buildHash('/ear', { mode: link.mode, level: String(link.level) })
    case 'rhythm':
      return '#' + buildHash('/rhythm', { level: String(link.level) })
    case 'sight':
      return '#' + buildHash('/practice', { sight: String(link.level) })
    case 'scale':
      return '#' + buildHash('/scales', { root: link.root, type: link.type })
    case 'chord':
      return '#' + buildHash('/chords', { root: link.root, quality: link.quality })
    case 'route':
      return '#' + link.route
  }
}

const lesson = (lessonId: string, label: string): GuideLink => ({ kind: 'lesson', lessonId, label })
const song = (songId: string, label: string): GuideLink => ({ kind: 'song', songId, label })
const quiz = (mode: QuizModeId, level: number, label: string): GuideLink => ({ kind: 'quiz', mode, level, label })
const rhythm = (level: 1 | 2 | 3 | 4, label: string): GuideLink => ({ kind: 'rhythm', level, label })
const sight = (level: SightLevel, label: string): GuideLink => ({ kind: 'sight', level, label })

// Resources that recur across stages.
const FABER_1: ExternalResource = {
  title: 'Faber — Adult Piano Adventures Book 1',
  url: 'https://pianoadventures.com/products/adult-piano-adventures-all-in-one-course-book-1/',
  note: 'The best-structured adult method book. Work through it alongside this app — it teaches reading and musicality the app can only drill.',
}
const FABER_2: ExternalResource = {
  title: 'Faber — Adult Piano Adventures Book 2',
  url: 'https://pianoadventures.com/products/adult-piano-adventures-all-in-one-course-book-2/',
  note: 'Continues where Book 1 ends — roughly the Grade 1–2 span of this guide.',
}
const ALFRED_ADULT: ExternalResource = {
  title: "Alfred's Basic Adult All-in-One Course",
  url: 'https://www.alfred.com/alfreds-basic-adult-all-in-one-course-book-1/p/00-5753/',
  note: 'The main alternative to Faber; pick one method book and stick with it.',
}
const BILL_HILTON: ExternalResource = {
  title: 'Bill Hilton (YouTube)',
  url: 'https://www.youtube.com/@BillHilton',
  note: 'Calm, practical piano tutorials — excellent on technique, practice habits and beginner theory.',
}
const PIANO_TV: ExternalResource = {
  title: 'PianoTV (YouTube)',
  url: 'https://www.youtube.com/@PianoTV',
  note: 'Graded repertoire suggestions, theory and practice advice organized by RCM/ABRSM level.',
}
const JOSH_WRIGHT: ExternalResource = {
  title: 'Josh Wright (YouTube)',
  url: 'https://www.youtube.com/@joshwrightpiano',
  note: 'Concert pianist; deep dives on technique problems once you have the basics.',
}
const ABRSM_SYLLABUS: ExternalResource = {
  title: 'ABRSM Piano syllabus',
  url: 'https://www.abrsm.org/en-gb/our-exams/piano-exams',
  note: 'The graded exam repertoire lists this guide is aligned to — browse pieces at your stage even if you never sit an exam.',
}
const RCM_SYLLABUS: ExternalResource = {
  title: 'RCM Piano syllabus',
  url: 'https://www.rcmusic.com/en/learning/academic-programs/certificate-program/piano',
  note: 'The North American equivalent of ABRSM; its repertoire lists are a goldmine of level-appropriate pieces.',
}
const IMSLP: ExternalResource = {
  title: 'IMSLP (Petrucci Music Library)',
  url: 'https://imslp.org',
  note: 'Free public-domain sheet music — every classical piece in this app and thousands more.',
}
const MUSESCORE: ExternalResource = {
  title: 'MuseScore',
  url: 'https://musescore.com',
  note: 'Community sheet music; export MusicXML and import it into the Songs screen to practice with feedback.',
}
const R_PIANOLEARNING: ExternalResource = {
  title: 'r/pianolearning',
  url: 'https://www.reddit.com/r/pianolearning/',
  note: 'Friendly community for feedback, practice questions and motivation.',
}
const GET_A_TEACHER: ExternalResource = {
  title: 'Consider a human teacher',
  url: 'https://www.abrsm.org/en-gb/find-a-music-teacher',
  note: 'From this stage on, occasional lessons (even monthly) catch technique problems an app cannot hear — posture, tension, tone. Worth it if you can.',
}

export const GUIDE_STAGES: GuideStage[] = [
  {
    id: 'stage-1',
    title: 'Stage 1 — Foundations',
    gradeEquivalent: 'Before Grade 1',
    overview:
      'Get comfortable at the keyboard: find notes by name, play five-finger patterns with curved ' +
      'fingers and a relaxed hand, keep a steady pulse, and read your first notes on the staff. ' +
      'Everything else in this guide builds on these habits, so take your time here.',
    goals: [
      'Play five-finger positions in C, G and F with either hand, evenly and without looking at your hands for every note',
      'Name any white key instantly; find sharps and flats from it',
      'Clap and tap steady quarter and half notes with the metronome',
      'Recognize the treble and bass staff and read notes in the C five-finger range',
      'Hear the difference between two notes moving up and moving down',
    ],
    technique: [
      lesson('five-finger-C', 'Five-finger position in C'),
      lesson('five-finger-G', 'Five-finger position in G'),
      lesson('five-finger-F', 'Five-finger position in F'),
      lesson('hanon-1', 'Hanon No. 1 — first finger exercise'),
    ],
    repertoire: [
      song('twinkle-twinkle', 'Twinkle, Twinkle, Little Star'),
      song('mary-had-a-little-lamb', 'Mary Had a Little Lamb'),
      song('ode-to-joy', 'Ode to Joy (Beethoven)'),
    ],
    ear: [quiz('intervals', 1, 'Intervals — level 1 (up, down, or the same?)')],
    rhythm: [rhythm(1, 'Rhythm — level 1 (quarters, halves, whole notes)')],
    sight: [sight(1, 'Sight-reading — level 1 (C position, one note at a time)')],
    theory: [
      {
        title: 'The staff, the clefs, and note names',
        body:
          'Music is written on a five-line staff. The treble clef (𝄞) marks the staff your right hand ' +
          'usually reads; the bass clef (𝄢) the left. Middle C sits between them on its own small ledger ' +
          'line. Notes climb line-space-line-space; every eighth note the letter names repeat. Learn a ' +
          'few anchor notes (middle C, treble G, bass F) and count neighbours from them rather than ' +
          'memorizing every line at once.',
        links: [
          { kind: 'route', route: '/tuner', label: 'Note Detector — play a key, see its name and notation' },
          sight(1, 'Practice reading single notes in C position'),
        ],
      },
    ],
    weeklyPlan: {
      totalMinutes: 20,
      items: [
        '5 min — five-finger positions (rotate C, G, F; hands separately)',
        '5 min — Hanon No. 1, slowly, watching for tension',
        '5 min — one song, small sections at a time',
        '3 min — rhythm level 1 with the metronome',
        '2 min — interval quiz level 1',
      ],
    },
    resources: [
      FABER_1,
      ALFRED_ADULT,
      BILL_HILTON,
      {
        title: 'musictheory.net — The Staff, Clefs, and Ledger Lines',
        url: 'https://www.musictheory.net/lessons',
        note: 'Free interactive theory lessons; the first few cover exactly this stage.',
      },
    ],
    moveOnWhen: [
      'You can play all three five-finger positions evenly at 70 bpm without watching your hands',
      'You can play Ode to Joy through without stopping',
      'You can read any note in the C five-finger range within a couple of seconds',
    ],
  },
  {
    id: 'stage-2',
    title: 'Stage 2 — First scales and full pieces',
    gradeEquivalent: '≈ ABRSM Grade 1',
    overview:
      'Thumb-under scales, your first arpeggios, and playing hands together. The pieces get longer and ' +
      'use both hands at once — the big skill of this stage is keeping going: steady tempo, eyes ahead, ' +
      'no stopping to fix mistakes.',
    goals: [
      'Play C, G, D and F major scales one octave, hands separately then together',
      'Play root-position arpeggios in C, G and F',
      'Play I–IV–V–I cadences in C — your first chords',
      'Play a complete piece hands together at a steady tempo',
      'Name major 2nds, 3rds, 5ths and octaves by ear',
    ],
    technique: [
      lesson('scale-C-major', 'C major scale (1 & 2 octaves, hands together)'),
      lesson('scale-G-major', 'G major scale'),
      lesson('scale-D-major', 'D major scale'),
      lesson('scale-F-major', 'F major scale'),
      lesson('arpeggio-C-major', 'C major arpeggio'),
      lesson('arpeggio-G-major', 'G major arpeggio'),
      lesson('arpeggio-F-major', 'F major arpeggio'),
      lesson('cadence-C', 'I–IV–V–I cadence in C'),
    ],
    repertoire: [
      song('jingle-bells', 'Jingle Bells'),
      song('when-the-saints', 'When the Saints Go Marching In'),
      song('minuet-in-g', 'Minuet in G (Petzold) — stretch piece'),
    ],
    ear: [
      quiz('intervals', 2, 'Intervals — level 2'),
      quiz('chords', 1, 'Chord qualities — level 1 (major vs minor)'),
      quiz('echo', 1, 'Play it back — level 1'),
    ],
    rhythm: [rhythm(2, 'Rhythm — level 2 (eighth notes, rests, off-beats)')],
    sight: [sight(2, 'Sight-reading — level 2 (G, D and F positions, skips)')],
    theory: [
      {
        title: 'Key signatures: your first sharps and flats',
        body:
          'A key signature at the start of each line tells you which notes are always sharp or flat. ' +
          'G major has one sharp (F♯); F major one flat (B♭); D major two sharps (F♯, C♯). Rather than ' +
          'reading each accidental, think "I am in G, so every F is sharp". Scales make key signatures ' +
          'physical: your fingers learn where the black keys live in each key.',
        links: [
          { kind: 'scale', root: 'G', type: 'major', label: 'G major in the scale library' },
          { kind: 'scale', root: 'F', type: 'major', label: 'F major in the scale library' },
        ],
      },
      {
        title: 'Intervals: the distance between notes',
        body:
          'An interval is the distance between two notes, counted in letter names: C to E is a 3rd, ' +
          'C to G a 5th. Reading by interval ("up a 3rd") is faster than naming every note, and hearing ' +
          'intervals is how melodies become predictable. The interval quiz trains your ear; sight-reading ' +
          'trains your eye to see the same distances on the staff.',
        links: [
          quiz('intervals', 2, 'Interval ear quiz'),
          sight(2, 'Read by interval in sight-reading'),
        ],
      },
    ],
    weeklyPlan: {
      totalMinutes: 30,
      items: [
        '8 min — scales C/G/D/F (one key per day, hands separate then together)',
        '4 min — arpeggios and the C cadence',
        '10 min — your current piece, in sections, slow then at tempo',
        '4 min — sight-reading level 2 (one new melody a day)',
        '4 min — ear training (alternate intervals and chords)',
      ],
    },
    resources: [
      FABER_1,
      BILL_HILTON,
      ABRSM_SYLLABUS,
      {
        title: 'ABRSM Grade 1 piano pieces (current list)',
        url: 'https://www.abrsm.org/en-gb/our-exams/piano-exams/piano-grade-1',
        note: 'Browse real Grade 1 pieces to supplement the app — most are on IMSLP or in the exam book.',
      },
      R_PIANOLEARNING,
    ],
    moveOnWhen: [
      'C, G, D and F major scales are secure hands together at 72 bpm',
      'You can play Jingle Bells or When the Saints start to finish, hands together, without stopping',
      'The I–IV–V–I cadence in C feels like one gesture per chord, not three separate notes',
    ],
  },
  {
    id: 'stage-3',
    title: 'Stage 3 — Minor keys and independence',
    gradeEquivalent: '≈ ABRSM Grade 2',
    overview:
      'Minor scales bring new colours; broken chords and two-octave scales stretch your technique; and ' +
      'the repertoire starts demanding real independence between the hands — a melody that sings over ' +
      'an accompaniment that stays out of its way.',
    goals: [
      'Play A, E and D harmonic minor scales, hands separately then together',
      'Play broken chords through all inversions in the common keys',
      'Play cadences in G and F as well as C',
      'Play pieces where the hands do genuinely different things',
      'Recognize major, minor, diminished and augmented chords by ear',
    ],
    technique: [
      lesson('scale-A-harmonic-minor', 'A harmonic minor scale'),
      lesson('scale-E-harmonic-minor', 'E harmonic minor scale'),
      lesson('scale-D-harmonic-minor', 'D harmonic minor scale'),
      lesson('broken-C-major', 'C major broken chords'),
      lesson('broken-A-minor', 'A minor broken chords'),
      lesson('broken-G-major', 'G major broken chords'),
      lesson('cadence-G', 'I–IV–V–I cadence in G'),
      lesson('cadence-F', 'I–IV–V–I cadence in F'),
    ],
    repertoire: [
      song('st-james-infirmary', 'St. James Infirmary'),
      song('twelve-bar-blues-c', '12-Bar Blues in C'),
      song('fur-elise', 'Für Elise — theme (Beethoven)'),
      song('the-entertainer-easy', 'The Entertainer — easy arrangement (Joplin)'),
    ],
    ear: [
      quiz('chords', 2, 'Chord qualities — level 2 (adds diminished & augmented)'),
      quiz('intervals', 3, 'Intervals — level 3'),
      quiz('echo', 2, 'Play it back — level 2'),
    ],
    rhythm: [rhythm(3, 'Rhythm — level 3 (dotted rhythms & syncopation)')],
    sight: [sight(3, 'Sight-reading — level 3 (bass clef, accidentals)')],
    theory: [
      {
        title: 'Relative minors: two keys, one signature',
        body:
          'Every key signature serves two keys: a major and its relative minor, three semitones below ' +
          '(C major / A minor share no sharps or flats). Minor pieces usually raise the 7th note as an ' +
          'accidental in the score — that raised note is why the harmonic minor scale sounds the way it ' +
          'does, and why you practice it.',
        links: [
          { kind: 'scale', root: 'A', type: 'harmonic minor', label: 'A harmonic minor in the scale library' },
          { kind: 'scale', root: 'A', type: 'natural minor', label: 'A natural minor for comparison' },
        ],
      },
      {
        title: 'Primary chords: I, IV and V',
        body:
          'Almost every simple piece is built from three chords: the tonic (I), subdominant (IV) and ' +
          'dominant (V), built on the 1st, 4th and 5th notes of the key. The cadence drills teach your ' +
          'hands their shapes; the blues teaches you to hear them go by — a 12-bar blues is nothing but ' +
          'I, IV and V in a fixed order.',
        links: [
          lesson('cadence-G', 'Cadences in G'),
          song('twelve-bar-blues-c', 'Hear I–IV–V in the 12-bar blues'),
        ],
      },
    ],
    weeklyPlan: {
      totalMinutes: 40,
      items: [
        '10 min — scales: rotate the harmonic minors and keep two majors warm',
        '5 min — broken chords and cadences (one key per day)',
        '15 min — repertoire: one classical piece and one blues/jazz piece in parallel',
        '5 min — sight-reading level 3',
        '5 min — ear training (chords level 2 is the priority)',
      ],
    },
    resources: [
      FABER_2,
      PIANO_TV,
      ABRSM_SYLLABUS,
      IMSLP,
      R_PIANOLEARNING,
    ],
    moveOnWhen: [
      'Harmonic minor scales in A, E and D are secure hands together',
      'You can play Für Elise (theme) with the left hand quiet under the melody',
      'You can hear whether a chord is major, minor or diminished most of the time',
    ],
  },
  {
    id: 'stage-4',
    title: 'Stage 4 — Fluency in more keys',
    gradeEquivalent: '≈ ABRSM Grade 3',
    overview:
      'The technique net widens: more minor keys, two-octave playing as the norm, and repertoire with ' +
      'flowing sixteenth-note figuration and walking bass lines. Rhythm work reaches swing. This is ' +
      'where daily technique practice starts to pay off audibly in the pieces.',
    goals: [
      'Play major scales with black-key tonics (B♭, E♭, A major) and more minors',
      'Play two octaves hands together as your default scale form',
      'Play minor arpeggios in the common keys',
      'Keep a walking bass steady under right-hand chords',
      'Identify seventh chords by ear',
    ],
    technique: [
      lesson('scale-Bb-major', 'B♭ major scale'),
      lesson('scale-Eb-major', 'E♭ major scale'),
      lesson('scale-A-major', 'A major scale'),
      lesson('scale-B-harmonic-minor', 'B harmonic minor scale'),
      lesson('scale-G-harmonic-minor', 'G harmonic minor scale'),
      lesson('arpeggio-A-minor', 'A minor arpeggio'),
      lesson('arpeggio-D-minor', 'D minor arpeggio'),
      lesson('arpeggio-E-minor', 'E minor arpeggio'),
    ],
    repertoire: [
      song('bach-prelude-c', 'Prelude in C (Bach, WTC I) — opening'),
      song('jazz-blues-walking-g', 'Jazz Blues in G with walking bass'),
    ],
    ear: [
      quiz('chords', 3, 'Chord qualities — level 3 (adds 7th chords)'),
      quiz('intervals', 4, 'Intervals — level 4 (all twelve)'),
      quiz('echo', 3, 'Play it back — level 3'),
    ],
    rhythm: [rhythm(4, 'Rhythm — level 4 (swing, Charleston, comping)')],
    sight: [sight(4, 'Sight-reading — level 4 (eighths & dotted rhythms)')],
    theory: [
      {
        title: 'Seventh chords and the circle of fifths',
        body:
          'Add one more third on top of a triad and you get a seventh chord — the sound of jazz and of ' +
          'every dominant that pulls home to its tonic. The circle of fifths orders all twelve keys by ' +
          'how many sharps or flats they carry; moving one step around it adds one accidental. Practice ' +
          'scales in circle order (C, G, D, A… / C, F, B♭, E♭…) and the pattern becomes second nature.',
        links: [
          { kind: 'chord', root: 'G', quality: 'dominant 7th', label: 'G7 in the chord library' },
          quiz('chords', 3, 'Hear 7th chords in the ear quiz'),
        ],
      },
    ],
    weeklyPlan: {
      totalMinutes: 45,
      items: [
        '12 min — scales & arpeggios in circle-of-fifths order, two octaves hands together',
        '18 min — repertoire: Bach prelude in sections; jazz blues at a slow, dead-steady tempo',
        '5 min — rhythm level 4 (swing feels strange until suddenly it does not)',
        '5 min — sight-reading level 4',
        '5 min — ear training level 3+',
      ],
    },
    resources: [
      GET_A_TEACHER,
      PIANO_TV,
      JOSH_WRIGHT,
      ABRSM_SYLLABUS,
      RCM_SYLLABUS,
      IMSLP,
    ],
    moveOnWhen: [
      'Two-octave hands-together scales feel like the normal way to play a scale',
      'The Bach prelude flows without accents inside the figuration',
      'You can hold the walking bass steady while the right hand comps off the beat',
    ],
  },
  {
    id: 'stage-5',
    title: 'Stage 5 — Early intermediate',
    gradeEquivalent: '≈ ABRSM Grade 4',
    overview:
      'All keys are now in play, jazz harmony enters properly with the ii–V–I, and the repertoire is ' +
      'real intermediate music: Canon in D, a Chopin prelude, stride patterns. From here the path is ' +
      'less about new mechanics and more about sound: voicing, phrasing, and control — which is exactly ' +
      'where a human teacher matters most.',
    goals: [
      'Play any major or harmonic minor scale, two octaves hands together',
      'Play ii–V–I progressions with guide tones in several keys',
      'Play the blues scale and improvise simple phrases over a 12-bar form',
      'Learn a piece of several pages and keep it in your fingers over weeks',
      'Recognize all common chord qualities and wide intervals by ear',
    ],
    technique: [
      lesson('scale-B-major', 'B major scale'),
      lesson('scale-F#-major', 'F♯ major scale'),
      lesson('scale-Db-major', 'D♭ major scale'),
      lesson('scale-C#-harmonic-minor', 'C♯ harmonic minor scale'),
      lesson('jazz-251-C', 'ii–V–I in C with guide tones'),
      lesson('jazz-251-F', 'ii–V–I in F'),
      lesson('jazz-blues-scale-C', 'C blues scale'),
      lesson('jazz-blues-comp-C', '12-bar blues comping in C'),
    ],
    repertoire: [
      song('canon-in-d', 'Canon in D (Pachelbel)'),
      song('ii-v-i-etude', 'ii–V–I Étude (swing)'),
      song('chopin-prelude-e-minor', 'Prelude in E minor, Op. 28 No. 4 (Chopin)'),
      song('when-the-saints-stride', 'When the Saints — stride version'),
    ],
    ear: [
      quiz('chords', 4, 'Chord qualities — level 4 (everything)'),
      quiz('intervals', 4, 'Intervals — level 4'),
    ],
    rhythm: [rhythm(4, 'Rhythm — level 4 (keep swing honest)')],
    sight: [sight(5, 'Sight-reading — level 5 (hands together)')],
    theory: [
      {
        title: 'The ii–V–I: how jazz moves',
        body:
          'Jazz harmony strings dominant motion together: the ii chord leads to V, V resolves to I. The ' +
          'guide tones — each chord’s 3rd and 7th — are the two notes that carry the progression; ' +
          'voice-lead them smoothly and the harmony plays itself. Learn the drill in C and F first, then ' +
          'take it around the circle of fifths.',
        links: [
          lesson('jazz-251-C', 'ii–V–I drill in C'),
          song('ii-v-i-etude', 'Hear it as music in the étude'),
        ],
      },
      {
        title: 'Where to go from here',
        body:
          'Beyond this stage the priorities shift to tone, pedalling, dynamics and interpretation — ' +
          'things a microphone-based app cannot fully hear. Keep the daily technique routine, keep ' +
          'sight-reading a level below your pieces, and if you have not already, this is the point where ' +
          'working with a teacher (even occasionally) accelerates everything.',
        links: [],
      },
    ],
    weeklyPlan: {
      totalMinutes: 60,
      items: [
        '15 min — scales & arpeggios: all keys on rotation, two octaves hands together',
        '10 min — jazz: ii–V–I in two keys, blues scale improvisation over the comping track',
        '25 min — repertoire: one long-term piece (Canon/Chopin) plus one lighter piece',
        '5 min — sight-reading level 5',
        '5 min — ear training level 4',
      ],
    },
    resources: [
      GET_A_TEACHER,
      JOSH_WRIGHT,
      ABRSM_SYLLABUS,
      RCM_SYLLABUS,
      IMSLP,
      MUSESCORE,
      {
        title: 'Open Studio (YouTube)',
        url: 'https://www.youtube.com/@OpenStudioJazz',
        note: 'When the jazz side hooks you: real jazz piano pedagogy from working musicians.',
      },
    ],
    moveOnWhen: [
      'You can sit down and play two contrasting pieces from memory, musically',
      'ii–V–I voicings come out without thinking in at least four keys',
      'You are choosing your own repertoire — at which point you have outgrown this guide 🎉',
    ],
  },
]
