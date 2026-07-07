import type { Finger, Hand } from '../../theory/types'
import { IMPORTED_SONGS } from './catalogImported'
import type { Song, SongMeasure, SongNote } from './types'

/**
 * Bundled graded repertoire — public-domain pieces in our own simple
 * arrangements (plus a few original études). Compact tuple encoding:
 * [midi, startBeat, durationBeats, finger?]. More (and longer) pieces
 * arrive via the MusicXML pipeline; this set covers grades 1–7 with
 * classical and jazz at every level.
 */
type N = [number, number, number, Finger?]

const notes = (hand: Hand, ns: N[]): SongNote[] =>
  ns.map(([midi, startBeat, durationBeats, finger]) => ({ midi, startBeat, durationBeats, hand, finger }))

const bar = (rh: N[], lh: N[]): SongMeasure => ({ notes: [...notes('R', rh), ...notes('L', lh)] })

// Midi shorthands (octave 2–6)
const G2 = 43, A2 = 45, B2 = 47
const C3 = 48, D3 = 50, Eb3 = 51, F3 = 53, G3 = 55, A3 = 57, Bb3 = 58, B3 = 59
const C4 = 60, D4 = 62, Eb4 = 63, E4 = 64, F4 = 65, Fs4 = 66, G4 = 67, A4 = 69, Bb4 = 70, B4 = 71
const C5 = 72, D5 = 74, E5 = 76, Fs5 = 78, G5 = 79
const F2 = 41
const C2 = 36, D2 = 38, E2 = 40, Fs2 = 42
const Cs3 = 49, Ds3 = 51, E3 = 52, Fs3 = 54, Gs3 = 56
const Cs4 = 61, Ds4 = 63, Gs4 = 68
const Cs5 = 73, Ds5 = 75, F5 = 77, A5 = 81, B5 = 83
const C6 = 84

/** Stride/ragtime LH: bass on 1 & 3, chord on 2 & 4. */
const oomPah = (bass1: number, chord: number[], bass2: number, chord2 = chord): N[] => [
  [bass1, 0, 1],
  ...chord.map((m): N => [m, 1, 1]),
  [bass2, 2, 1],
  ...chord2.map((m): N => [m, 3, 1]),
]

const odeToJoy: Song = {
  id: 'ode-to-joy',
  title: 'Ode to Joy',
  composer: 'L. van Beethoven',
  grade: 1,
  style: 'classical',
  keySignature: 'C',
  timeSignature: [4, 4],
  tempoBpm: 100,
  sections: [
    { label: 'First phrase', fromMeasure: 0, toMeasure: 3 },
    { label: 'Second phrase', fromMeasure: 4, toMeasure: 7 },
  ],
  measures: [
    bar([[E4, 0, 1, 3], [E4, 1, 1, 3], [F4, 2, 1, 4], [G4, 3, 1, 5]], [[C3, 0, 4]]),
    bar([[G4, 0, 1, 5], [F4, 1, 1, 4], [E4, 2, 1, 3], [D4, 3, 1, 2]], [[G2, 0, 4]]),
    bar([[C4, 0, 1, 1], [C4, 1, 1, 1], [D4, 2, 1, 2], [E4, 3, 1, 3]], [[C3, 0, 4]]),
    bar([[E4, 0, 1.5, 3], [D4, 1.5, 0.5, 2], [D4, 2, 2, 2]], [[G2, 0, 4]]),
    bar([[E4, 0, 1, 3], [E4, 1, 1, 3], [F4, 2, 1, 4], [G4, 3, 1, 5]], [[C3, 0, 4]]),
    bar([[G4, 0, 1, 5], [F4, 1, 1, 4], [E4, 2, 1, 3], [D4, 3, 1, 2]], [[G2, 0, 4]]),
    bar([[C4, 0, 1, 1], [C4, 1, 1, 1], [D4, 2, 1, 2], [E4, 3, 1, 3]], [[C3, 0, 4]]),
    bar([[D4, 0, 1.5, 2], [C4, 1.5, 0.5, 1], [C4, 2, 2, 1]], [[G2, 0, 2], [C3, 2, 2]]),
  ],
}

const twinkle: Song = {
  id: 'twinkle-twinkle',
  title: 'Twinkle, Twinkle, Little Star',
  composer: 'Traditional',
  grade: 1,
  style: 'folk',
  keySignature: 'C',
  timeSignature: [4, 4],
  tempoBpm: 92,
  sections: [
    { label: 'A', fromMeasure: 0, toMeasure: 3 },
    { label: 'B', fromMeasure: 4, toMeasure: 7 },
    { label: 'A again', fromMeasure: 8, toMeasure: 11 },
  ],
  measures: [
    bar([[C4, 0, 1, 1], [C4, 1, 1, 1], [G4, 2, 1, 5], [G4, 3, 1, 5]], [[C3, 0, 4]]),
    bar([[A4, 0, 1], [A4, 1, 1], [G4, 2, 2, 5]], [[F3, 0, 2], [C3, 2, 2]]),
    bar([[F4, 0, 1, 4], [F4, 1, 1, 4], [E4, 2, 1, 3], [E4, 3, 1, 3]], [[F3, 0, 2], [C3, 2, 2]]),
    bar([[D4, 0, 1, 2], [D4, 1, 1, 2], [C4, 2, 2, 1]], [[G2, 0, 2], [C3, 2, 2]]),
    bar([[G4, 0, 1, 5], [G4, 1, 1, 5], [F4, 2, 1, 4], [F4, 3, 1, 4]], [[C3, 0, 2], [F3, 2, 2]]),
    bar([[E4, 0, 1, 3], [E4, 1, 1, 3], [D4, 2, 2, 2]], [[C3, 0, 2], [G2, 2, 2]]),
    bar([[G4, 0, 1, 5], [G4, 1, 1, 5], [F4, 2, 1, 4], [F4, 3, 1, 4]], [[C3, 0, 2], [F3, 2, 2]]),
    bar([[E4, 0, 1, 3], [E4, 1, 1, 3], [D4, 2, 2, 2]], [[C3, 0, 2], [G2, 2, 2]]),
    bar([[C4, 0, 1, 1], [C4, 1, 1, 1], [G4, 2, 1, 5], [G4, 3, 1, 5]], [[C3, 0, 4]]),
    bar([[A4, 0, 1], [A4, 1, 1], [G4, 2, 2, 5]], [[F3, 0, 2], [C3, 2, 2]]),
    bar([[F4, 0, 1, 4], [F4, 1, 1, 4], [E4, 2, 1, 3], [E4, 3, 1, 3]], [[F3, 0, 2], [C3, 2, 2]]),
    bar([[D4, 0, 1, 2], [D4, 1, 1, 2], [C4, 2, 2, 1]], [[G2, 0, 2], [C3, 2, 2]]),
  ],
}

const mary: Song = {
  id: 'mary-had-a-little-lamb',
  title: 'Mary Had a Little Lamb',
  composer: 'Traditional',
  grade: 1,
  style: 'folk',
  keySignature: 'C',
  timeSignature: [4, 4],
  tempoBpm: 96,
  sections: [
    { label: 'First half', fromMeasure: 0, toMeasure: 3 },
    { label: 'Second half', fromMeasure: 4, toMeasure: 7 },
  ],
  measures: [
    bar([[E4, 0, 1, 3], [D4, 1, 1, 2], [C4, 2, 1, 1], [D4, 3, 1, 2]], [[C3, 0, 4]]),
    bar([[E4, 0, 1, 3], [E4, 1, 1, 3], [E4, 2, 2, 3]], [[C3, 0, 4]]),
    bar([[D4, 0, 1, 2], [D4, 1, 1, 2], [D4, 2, 2, 2]], [[G2, 0, 4]]),
    bar([[E4, 0, 1, 3], [G4, 1, 1, 5], [G4, 2, 2, 5]], [[C3, 0, 4]]),
    bar([[E4, 0, 1, 3], [D4, 1, 1, 2], [C4, 2, 1, 1], [D4, 3, 1, 2]], [[C3, 0, 4]]),
    bar([[E4, 0, 1, 3], [E4, 1, 1, 3], [E4, 2, 1, 3], [E4, 3, 1, 3]], [[C3, 0, 4]]),
    bar([[D4, 0, 1, 2], [D4, 1, 1, 2], [E4, 2, 1, 3], [D4, 3, 1, 2]], [[G2, 0, 4]]),
    bar([[C4, 0, 4, 1]], [[C3, 0, 4]]),
  ],
}

const jingleBells: Song = {
  id: 'jingle-bells',
  title: 'Jingle Bells (chorus)',
  composer: 'J. Pierpont',
  grade: 1,
  style: 'folk',
  keySignature: 'C',
  timeSignature: [4, 4],
  tempoBpm: 104,
  sections: [
    { label: 'First half', fromMeasure: 0, toMeasure: 3 },
    { label: 'Second half', fromMeasure: 4, toMeasure: 7 },
  ],
  measures: [
    bar([[E4, 0, 1, 3], [E4, 1, 1, 3], [E4, 2, 2, 3]], [[C3, 0, 4]]),
    bar([[E4, 0, 1, 3], [E4, 1, 1, 3], [E4, 2, 2, 3]], [[C3, 0, 4]]),
    bar([[E4, 0, 1, 3], [G4, 1, 1, 5], [C4, 2, 1, 1], [D4, 3, 1, 2]], [[C3, 0, 4]]),
    bar([[E4, 0, 4, 3]], [[C3, 0, 4]]),
    bar([[F4, 0, 1, 4], [F4, 1, 1, 4], [F4, 2, 1, 4], [F4, 3, 1, 4]], [[F3, 0, 4]]),
    bar([[F4, 0, 1, 4], [E4, 1, 1, 3], [E4, 2, 1, 3], [E4, 3, 0.5, 3], [E4, 3.5, 0.5, 3]], [[C3, 0, 4]]),
    bar([[E4, 0, 1, 3], [D4, 1, 1, 2], [D4, 2, 1, 2], [E4, 3, 1, 3]], [[G2, 0, 4]]),
    bar([[D4, 0, 2, 2], [G4, 2, 2, 5]], [[G2, 0, 4]]),
  ],
}

const saints: Song = {
  id: 'when-the-saints',
  title: 'When the Saints Go Marching In',
  composer: 'Traditional',
  grade: 1,
  style: 'jazz',
  keySignature: 'C',
  timeSignature: [4, 4],
  tempoBpm: 108,
  swing: true,
  sections: [
    { label: 'Call', fromMeasure: 0, toMeasure: 3 },
    { label: 'Answer', fromMeasure: 4, toMeasure: 7 },
  ],
  measures: [
    bar([[C4, 1, 1, 1], [E4, 2, 1, 3], [F4, 3, 1, 4]], [[C3, 0, 4]]),
    bar([[G4, 0, 4, 5]], [[C3, 0, 4]]),
    bar([[C4, 1, 1, 1], [E4, 2, 1, 3], [F4, 3, 1, 4]], [[C3, 0, 4]]),
    bar([[G4, 0, 4, 5]], [[C3, 0, 4]]),
    bar([[C4, 1, 1, 1], [E4, 2, 1, 3], [F4, 3, 1, 4]], [[C3, 0, 4]]),
    bar([[G4, 0, 2, 5], [E4, 2, 2, 3]], [[C3, 0, 4]]),
    bar([[C4, 0, 2, 1], [E4, 2, 2, 3]], [[C3, 0, 4]]),
    bar([[D4, 0, 4, 2]], [[G2, 0, 4]]),
  ],
}

const minuetInG: Song = {
  id: 'minuet-in-g',
  title: 'Minuet in G (first phrase)',
  composer: 'C. Petzold (BWV Anh. 114)',
  grade: 2,
  style: 'classical',
  keySignature: 'G',
  timeSignature: [3, 4],
  tempoBpm: 104,
  sections: [
    { label: 'Question', fromMeasure: 0, toMeasure: 3 },
    { label: 'Answer', fromMeasure: 4, toMeasure: 7 },
  ],
  measures: [
    bar([[D5, 0, 1], [G4, 1, 0.5], [A4, 1.5, 0.5], [B4, 2, 0.5], [C5, 2.5, 0.5]], [[G3, 0, 3]]),
    bar([[D5, 0, 1], [G4, 1, 1], [G4, 2, 1]], [[B3, 0, 3]]),
    bar([[E5, 0, 1], [C5, 1, 0.5], [D5, 1.5, 0.5], [E5, 2, 0.5], [Fs5, 2.5, 0.5]], [[C4, 0, 3]]),
    bar([[G5, 0, 1], [G4, 1, 1], [G4, 2, 1]], [[B3, 0, 3]]),
    bar([[C5, 0, 1], [D5, 1, 0.5], [C5, 1.5, 0.5], [B4, 2, 0.5], [A4, 2.5, 0.5]], [[A3, 0, 3]]),
    bar([[B4, 0, 1], [C5, 1, 0.5], [B4, 1.5, 0.5], [A4, 2, 0.5], [G4, 2.5, 0.5]], [[G3, 0, 3]]),
    bar([[Fs4, 0, 1], [G4, 1, 0.5], [A4, 1.5, 0.5], [B4, 2, 0.5], [G4, 2.5, 0.5]], [[D3, 0, 3]]),
    bar([[A4, 0, 3]], [[D3, 0, 3]]),
  ],
}

/** I I I I / IV IV I I / V IV I V — LH shells, RH guide tones. */
const bluesShells: Song = {
  id: 'twelve-bar-blues-c',
  title: '12-Bar Blues in C (shells & guides)',
  composer: 'Piano Tutor',
  grade: 2,
  style: 'blues',
  keySignature: 'C',
  timeSignature: [4, 4],
  tempoBpm: 96,
  swing: true,
  sections: [
    { label: 'Bars 1–4', fromMeasure: 0, toMeasure: 3 },
    { label: 'Bars 5–8', fromMeasure: 4, toMeasure: 7 },
    { label: 'Turnaround', fromMeasure: 8, toMeasure: 11 },
  ],
  measures: (() => {
    const chordBar = (shell: N[], guides: [number, number]): SongMeasure =>
      bar(
        [
          [guides[0], 0, 2],
          [guides[1], 0, 2],
          [guides[0], 2, 2],
          [guides[1], 2, 2],
        ],
        shell,
      )
    const C7 = () => chordBar([[C3, 0, 4], [Bb3, 0, 4]], [E4, Bb4])
    const F7 = () => chordBar([[F2, 0, 4], [Eb3, 0, 4]], [Eb4, A4])
    const G7 = () => chordBar([[G2, 0, 4], [F3, 0, 4]], [F4, B4])
    return [C7(), C7(), C7(), C7(), F7(), F7(), C7(), C7(), G7(), F7(), C7(), G7()]
  })(),
}

const stJames: Song = {
  id: 'st-james-infirmary',
  title: 'St. James Infirmary',
  composer: 'Traditional',
  grade: 2,
  style: 'jazz',
  keySignature: 'Am',
  timeSignature: [4, 4],
  tempoBpm: 88,
  swing: true,
  sections: [
    { label: 'First line', fromMeasure: 0, toMeasure: 3 },
    { label: 'Second line', fromMeasure: 4, toMeasure: 7 },
  ],
  measures: [
    bar([[E4, 0, 1, 1], [A4, 1, 1, 4], [A4, 2, 1, 4], [A4, 3, 1, 4]], [[A2, 0, 2], [E3, 2, 2]]),
    bar([[G4, 0, 1, 3], [A4, 1, 3, 4]], [[A2, 0, 4]]),
    bar([[C5, 0, 1, 5], [B4, 1, 1, 4], [A4, 2, 1, 3], [B4, 3, 1, 4]], [[D3, 0, 2], [F3, 2, 2]]),
    bar([[A4, 0, 2, 3], [E4, 2, 2, 1]], [[A2, 0, 2], [E3, 2, 2]]),
    bar([[E4, 0, 1, 1], [A4, 1, 1, 4], [A4, 2, 1, 4], [B4, 3, 1, 5]], [[A2, 0, 2], [E3, 2, 2]]),
    bar([[C5, 0, 1, 5], [C5, 1, 1, 5], [B4, 2, 2, 4]], [[F2, 0, 2], [C3, 2, 2]]),
    bar([[A4, 0, 1, 3], [C5, 1, 1, 5], [B4, 2, 1, 4], [Gs4, 3, 1, 2]], [[E3, 0, 2], [B2, 2, 2]]),
    bar([[A4, 0, 4, 3]], [[A2, 0, 2], [E3, 2, 2]]),
  ],
}

const furElise: Song = {
  id: 'fur-elise',
  title: 'Für Elise (theme)',
  composer: 'L. van Beethoven',
  grade: 3,
  style: 'classical',
  keySignature: 'Am',
  timeSignature: [3, 8],
  tempoBpm: 66,
  sections: [
    { label: 'First phrase', fromMeasure: 0, toMeasure: 4 },
    { label: 'Second phrase', fromMeasure: 5, toMeasure: 8 },
  ],
  measures: [
    bar([[E5, 1, 0.25, 4], [Ds5, 1.25, 0.25, 3]], []),
    bar([[E5, 0, 0.25, 4], [Ds5, 0.25, 0.25, 3], [E5, 0.5, 0.25], [B4, 0.75, 0.25, 1], [D5, 1, 0.25], [C5, 1.25, 0.25]], []),
    bar([[A4, 0, 0.5, 1], [C4, 0.75, 0.25, 1], [E4, 1, 0.25, 2], [A4, 1.25, 0.25, 5]], [[A2, 0, 0.25, 5], [E3, 0.25, 0.25, 2], [A3, 0.5, 0.25, 1]]),
    bar([[B4, 0, 0.5, 5], [E4, 0.75, 0.25, 1], [Gs4, 1, 0.25, 3], [B4, 1.25, 0.25, 5]], [[E2, 0, 0.25, 5], [E3, 0.25, 0.25, 2], [Gs3, 0.5, 0.25, 1]]),
    bar([[C5, 0, 0.5, 5], [E4, 0.75, 0.25, 1], [E5, 1, 0.25, 4], [Ds5, 1.25, 0.25, 3]], [[A2, 0, 0.25, 5], [E3, 0.25, 0.25, 2], [A3, 0.5, 0.25, 1]]),
    bar([[E5, 0, 0.25], [Ds5, 0.25, 0.25], [E5, 0.5, 0.25], [B4, 0.75, 0.25], [D5, 1, 0.25], [C5, 1.25, 0.25]], []),
    bar([[A4, 0, 0.5], [C4, 0.75, 0.25], [E4, 1, 0.25], [A4, 1.25, 0.25]], [[A2, 0, 0.25], [E3, 0.25, 0.25], [A3, 0.5, 0.25]]),
    bar([[B4, 0, 0.5], [E4, 0.75, 0.25], [C5, 1, 0.25], [B4, 1.25, 0.25]], [[E2, 0, 0.25], [E3, 0.25, 0.25], [Gs3, 0.5, 0.25]]),
    bar([[A4, 0, 1]], [[A2, 0, 0.25], [E3, 0.25, 0.25], [A3, 0.5, 0.25]]),
  ],
}

/** Ragtime: straight 16ths, not swung. */
const entertainerEasy: Song = ((): Song => {
  const figure = () =>
    bar(
      [
        [E4, 0, 0.25], [C5, 0.25, 0.75], [E4, 1, 0.25], [C5, 1.25, 0.75],
        [E4, 2, 0.25], [C5, 2.25, 0.75], [C5, 3, 1],
      ],
      oomPah(C3, [E3, G3, C4], G2),
    )
  const run = () =>
    bar(
      [
        [C5, 0, 0.25], [D5, 0.25, 0.25], [Ds5, 0.5, 0.25], [E5, 0.75, 0.25],
        [C5, 1, 0.25], [D5, 1.25, 0.25], [E5, 1.5, 0.5],
        [B4, 2, 0.25], [D5, 2.25, 0.75], [C5, 3, 1],
      ],
      oomPah(G2, [F3, G3, B3], C3, [E3, G3, C4]),
    )
  return {
    id: 'the-entertainer-easy',
    title: 'The Entertainer (easy)',
    composer: 'S. Joplin',
    grade: 3,
    style: 'jazz',
    keySignature: 'C',
    timeSignature: [4, 4],
    tempoBpm: 84,
    sections: [
      { label: 'A phrase', fromMeasure: 0, toMeasure: 3 },
      { label: 'A again & ending', fromMeasure: 4, toMeasure: 7 },
    ],
    measures: [
      bar([[D4, 3, 0.5, 1], [Ds4, 3.5, 0.5, 2]], []),
      figure(),
      run(),
      figure(),
      run(),
      figure(),
      bar(
        [
          [D5, 0, 0.5], [C5, 0.5, 0.5], [A4, 1, 0.5], [G4, 1.5, 0.5],
          [E4, 2, 0.5], [G4, 2.5, 0.5], [A4, 3, 0.5], [B4, 3.5, 0.5],
        ],
        oomPah(F2, [F3, A3, C4], G2, [F3, G3, B3]),
      ),
      bar([[C5, 0, 4]], oomPah(C3, [E3, G3, C4], G2, [E3, G3, C4])),
    ],
  }
})()

const bachPrelude: Song = ((): Song => {
  const fig = (b1: number, b2: number, r1: number, r2: number, r3: number): SongMeasure => {
    const rh: N[] = []
    for (const half of [0, 2]) {
      rh.push(
        [r1, half + 0.5, 0.25], [r2, half + 0.75, 0.25], [r3, half + 1, 0.25],
        [r1, half + 1.25, 0.25], [r2, half + 1.5, 0.25], [r3, half + 1.75, 0.25],
      )
    }
    return bar(rh, [[b1, 0, 0.25], [b2, 0.25, 1.75], [b1, 2, 0.25], [b2, 2.25, 1.75]])
  }
  return {
    id: 'bach-prelude-c',
    title: 'Prelude in C (opening)',
    composer: 'J. S. Bach (BWV 846)',
    grade: 4,
    style: 'classical',
    keySignature: 'C',
    timeSignature: [4, 4],
    tempoBpm: 69,
    sections: [
      { label: 'Bars 1–4', fromMeasure: 0, toMeasure: 3 },
      { label: 'Bars 5–8', fromMeasure: 4, toMeasure: 7 },
    ],
    measures: [
      fig(C3, E3, G3, C4, E4),
      fig(C3, D3, A3, D4, F4),
      fig(B2, D3, G3, D4, F4),
      fig(C3, E3, G3, C4, E4),
      fig(C3, E3, A3, E4, A4),
      fig(C3, D3, A3, D4, Fs4),
      fig(B2, D3, G3, D4, G4),
      fig(C3, E3, G3, C4, E4),
    ],
  }
})()

/** 12-bar jazz blues: swung riff over a walking quarter-note bass. */
const walkingBlues: Song = {
  id: 'jazz-blues-walking-g',
  title: 'Jazz Blues in G (walking bass)',
  composer: 'Piano Tutor',
  grade: 4,
  style: 'jazz',
  keySignature: 'G',
  timeSignature: [4, 4],
  tempoBpm: 112,
  swing: true,
  sections: [
    { label: 'Bars 1–4', fromMeasure: 0, toMeasure: 3 },
    { label: 'Bars 5–8', fromMeasure: 4, toMeasure: 7 },
    { label: 'Turnaround', fromMeasure: 8, toMeasure: 11 },
  ],
  measures: [
    bar(
      [[D4, 0, 0.5], [F4, 0.5, 0.5], [G4, 1, 0.5], [Bb4, 1.5, 0.5], [B4, 2, 1], [D5, 3, 1]],
      [[G2, 0, 1], [A2, 1, 1], [B2, 2, 1], [D3, 3, 1]],
    ),
    bar(
      [[E4, 0, 0.5], [G4, 0.5, 0.5], [A4, 1, 0.5], [C5, 1.5, 0.5], [Bb4, 2, 2]],
      [[C3, 0, 1], [D3, 1, 1], [E3, 2, 1], [G3, 3, 1]],
    ),
    bar(
      [[D5, 0, 0.5], [B4, 0.5, 0.5], [Bb4, 1, 0.5], [G4, 1.5, 0.5], [F4, 2, 1], [D4, 3, 1]],
      [[G2, 0, 1], [B2, 1, 1], [D3, 2, 1], [E3, 3, 1]],
    ),
    bar(
      [[D4, 3, 0.5], [Ds4, 3.5, 0.5]],
      [[G3, 0, 1], [F3, 1, 1], [E3, 2, 1], [D3, 3, 1]],
    ),
    bar(
      [[E4, 0, 0.5], [G4, 0.5, 0.5], [A4, 1, 0.5], [C5, 1.5, 0.5], [Bb4, 2, 2]],
      [[C3, 0, 1], [E3, 1, 1], [G3, 2, 1], [E3, 3, 1]],
    ),
    bar(
      [[E4, 0, 0.5], [G4, 0.5, 0.5], [A4, 1, 0.5], [C5, 1.5, 0.5], [A4, 2, 1], [G4, 3, 1]],
      [[C3, 0, 1], [D3, 1, 1], [E3, 2, 1], [Fs3, 3, 1]],
    ),
    bar(
      [[D4, 0, 0.5], [F4, 0.5, 0.5], [G4, 1, 0.5], [Bb4, 1.5, 0.5], [B4, 2, 1], [D5, 3, 1]],
      [[G3, 0, 1], [F3, 1, 1], [E3, 2, 1], [D3, 3, 1]],
    ),
    bar(
      [[B4, 0, 0.5], [G4, 0.5, 0.5], [F4, 1, 0.5], [D4, 1.5, 0.5], [F4, 2, 2]],
      [[G2, 0, 1], [A2, 1, 1], [B2, 2, 1], [Cs3, 3, 1]],
    ),
    bar(
      [[Fs4, 0, 0.5], [A4, 0.5, 0.5], [B4, 1, 0.5], [C5, 1.5, 0.5], [D5, 2, 2]],
      [[D3, 0, 1], [Fs3, 1, 1], [A3, 2, 1], [Fs3, 3, 1]],
    ),
    bar(
      [[C5, 0, 0.5], [A4, 0.5, 0.5], [G4, 1, 0.5], [E4, 1.5, 0.5], [G4, 2, 2]],
      [[C3, 0, 1], [E3, 1, 1], [G3, 2, 1], [E3, 3, 1]],
    ),
    bar(
      [[D4, 0, 0.5], [F4, 0.5, 0.5], [G4, 1, 2], [B4, 3, 0.5], [C5, 3.5, 0.5]],
      [[G2, 0, 1], [B2, 1, 1], [D3, 2, 1], [E3, 3, 1]],
    ),
    bar(
      [[A4, 0, 1], [C5, 1, 1], [A4, 2, 1], [Fs4, 3, 1]],
      [[D3, 0, 1], [E3, 1, 1], [Fs3, 2, 1], [A3, 3, 1]],
    ),
  ],
}

const canonInD: Song = ((): Song => {
  const ground: [number, number][] = [[D3, A2], [B2, Fs2], [G2, D2], [G2, A2]]
  const groundBar = (i: number): N[] => [[ground[i % 4][0], 0, 2], [ground[i % 4][1], 2, 2]]
  return {
    id: 'canon-in-d',
    title: 'Canon in D (theme & variations)',
    composer: 'J. Pachelbel',
    grade: 5,
    style: 'classical',
    keySignature: 'D',
    timeSignature: [4, 4],
    tempoBpm: 76,
    sections: [
      { label: 'Ground & chords', fromMeasure: 0, toMeasure: 3 },
      { label: 'Quarter-note theme', fromMeasure: 4, toMeasure: 7 },
      { label: 'Eighth-note variation', fromMeasure: 8, toMeasure: 11 },
    ],
    measures: [
      bar([[Fs4, 0, 2], [A4, 0, 2], [Cs4, 2, 2], [E4, 2, 2]], groundBar(0)),
      bar([[D4, 0, 2], [Fs4, 0, 2], [Cs4, 2, 2], [Fs4, 2, 2]], groundBar(1)),
      bar([[B3, 0, 2], [D4, 0, 2], [A3, 2, 2], [D4, 2, 2]], groundBar(2)),
      bar([[B3, 0, 2], [D4, 0, 2], [A3, 2, 2], [Cs4, 2, 2]], groundBar(3)),
      bar([[Fs5, 0, 1, 5], [E5, 1, 1, 4], [D5, 2, 1, 3], [Cs5, 3, 1, 2]], groundBar(0)),
      bar([[B4, 0, 1, 1], [A4, 1, 1, 1], [B4, 2, 1, 2], [Cs5, 3, 1, 3]], groundBar(1)),
      bar([[D5, 0, 1, 4], [Cs5, 1, 1, 3], [B4, 2, 1, 2], [A4, 3, 1, 1]], groundBar(2)),
      bar([[G4, 0, 1, 5], [Fs4, 1, 1, 4], [G4, 2, 1, 5], [E4, 3, 1, 3]], groundBar(3)),
      bar(
        [[D5, 0, 0.5], [E5, 0.5, 0.5], [Fs5, 1, 0.5], [G5, 1.5, 0.5], [A5, 2, 0.5], [E5, 2.5, 0.5], [Cs5, 3, 0.5], [E5, 3.5, 0.5]],
        groundBar(0),
      ),
      bar(
        [[D5, 0, 0.5], [Cs5, 0.5, 0.5], [B4, 1, 0.5], [D5, 1.5, 0.5], [Cs5, 2, 0.5], [A4, 2.5, 0.5], [Fs4, 3, 0.5], [A4, 3.5, 0.5]],
        groundBar(1),
      ),
      bar(
        [[B4, 0, 0.5], [A4, 0.5, 0.5], [G4, 1, 0.5], [B4, 1.5, 0.5], [A4, 2, 0.5], [Fs4, 2.5, 0.5], [D4, 3, 0.5], [Fs4, 3.5, 0.5]],
        groundBar(2),
      ),
      bar(
        [[G4, 0, 0.5], [B4, 0.5, 0.5], [A4, 1, 0.5], [Cs5, 1.5, 0.5], [D5, 2, 2]],
        [[G2, 0, 1], [A2, 1, 1], [D3, 2, 2]],
      ),
    ],
  }
})()

/** Swung lines over two-note LH shells — the ii–V–I in every jazz tune. */
const iiVIEtude: Song = {
  id: 'ii-v-i-etude',
  title: 'ii–V–I Étude (swing)',
  composer: 'Piano Tutor',
  grade: 5,
  style: 'jazz',
  keySignature: 'C',
  timeSignature: [4, 4],
  tempoBpm: 116,
  swing: true,
  sections: [
    { label: 'Question', fromMeasure: 0, toMeasure: 3 },
    { label: 'Answer', fromMeasure: 4, toMeasure: 7 },
  ],
  measures: [
    bar(
      [[D4, 0, 0.5], [F4, 0.5, 0.5], [A4, 1, 0.5], [C5, 1.5, 0.5], [B4, 2, 0.5], [A4, 2.5, 0.5], [F4, 3, 0.5], [A4, 3.5, 0.5]],
      [[D3, 0, 4], [C4, 0, 4]],
    ),
    bar(
      [[B4, 0, 0.5], [D5, 0.5, 0.5], [F5, 1, 0.5], [D5, 1.5, 0.5], [B4, 2, 0.5], [A4, 2.5, 0.5], [G4, 3, 1]],
      [[G2, 0, 4], [F3, 0, 4]],
    ),
    bar(
      [[E4, 0, 0.5], [G4, 0.5, 0.5], [B4, 1, 0.5], [D5, 1.5, 0.5], [C5, 2, 2]],
      [[C3, 0, 4], [B3, 0, 4]],
    ),
    bar(
      [[Cs5, 0, 0.5], [E5, 0.5, 0.5], [G5, 1, 0.5], [E5, 1.5, 0.5], [Cs5, 2, 0.5], [A4, 2.5, 0.5], [G4, 3, 0.5], [E4, 3.5, 0.5]],
      [[A2, 0, 4], [G3, 0, 4]],
    ),
    bar(
      [[D4, 0, 0.5], [E4, 0.5, 0.5], [F4, 1, 0.5], [A4, 1.5, 0.5], [C5, 2, 0.5], [A4, 2.5, 0.5], [F4, 3, 1]],
      [[D3, 0, 4], [C4, 0, 4]],
    ),
    bar(
      [[B4, 0, 0.5], [C5, 0.5, 0.5], [D5, 1, 0.5], [F5, 1.5, 0.5], [E5, 2, 0.5], [D5, 2.5, 0.5], [B4, 3, 0.5], [G4, 3.5, 0.5]],
      [[G2, 0, 4], [F3, 0, 4]],
    ),
    bar(
      [[A4, 0, 0.5], [G4, 0.5, 0.5], [E4, 1, 0.5], [G4, 1.5, 0.5], [A4, 2, 2]],
      [[C3, 0, 4], [A3, 0, 4]],
    ),
    bar(
      [[D5, 0, 0.5], [C5, 0.5, 0.5], [B4, 1, 0.5], [A4, 1.5, 0.5], [G4, 2, 0.5], [C5, 2.5, 1.5]],
      [[D3, 0, 2], [C4, 0, 2], [G2, 2, 2], [F3, 2, 2]],
    ),
  ],
}

const chopinPrelude: Song = ((): Song => {
  const pulse = (chord: number[]): N[] =>
    Array.from({ length: 8 }, (_, i) => chord.map((m): N => [m, i * 0.5, 0.5])).flat()
  return {
    id: 'chopin-prelude-e-minor',
    title: 'Prelude in E minor, Op. 28 No. 4 (theme)',
    composer: 'F. Chopin',
    grade: 6,
    style: 'classical',
    keySignature: 'Em',
    timeSignature: [4, 4],
    tempoBpm: 56,
    sections: [
      { label: 'First phrase', fromMeasure: 0, toMeasure: 3 },
      { label: 'Second phrase', fromMeasure: 4, toMeasure: 7 },
    ],
    measures: [
      bar([[B4, 0, 4, 5]], pulse([E3, G3, B3])),
      bar([[C5, 0, 1.5, 5], [B4, 1.5, 0.5, 4], [B4, 2, 2, 4]], pulse([E3, G3, C4])),
      bar([[B4, 0, 1.5, 4], [A4, 1.5, 0.5, 3], [A4, 2, 2, 3]], pulse([E3, A3, C4])),
      bar([[A4, 0, 4, 3]], pulse([Ds3, Fs3, B3])),
      bar([[G4, 0, 4, 2]], pulse([E3, G3, B3])),
      bar([[A4, 0, 1.5, 3], [G4, 1.5, 0.5, 2], [G4, 2, 2, 2]], pulse([E3, G3, C4])),
      bar([[G4, 0, 1.5, 2], [Fs4, 1.5, 0.5, 1], [Fs4, 2, 2, 1]], pulse([Ds3, Fs3, A3])),
      bar([[E4, 0, 4, 1]], pulse([E3, G3, B3])),
    ],
  }
})()

/** The grade-1 tune again, now with stride left hand and harmonised melody. */
const saintsStride: Song = {
  id: 'when-the-saints-stride',
  title: 'When the Saints (stride)',
  composer: 'Traditional',
  grade: 6,
  style: 'jazz',
  keySignature: 'C',
  timeSignature: [4, 4],
  tempoBpm: 120,
  swing: true,
  sections: [
    { label: 'Call', fromMeasure: 0, toMeasure: 3 },
    { label: 'Call again', fromMeasure: 4, toMeasure: 7 },
    { label: 'That number', fromMeasure: 8, toMeasure: 11 },
    { label: 'Marching home', fromMeasure: 12, toMeasure: 15 },
  ],
  measures: [
    bar([[C4, 1, 1], [E4, 2, 1], [F4, 3, 1]], oomPah(C3, [E3, G3, B3], G2)),
    bar([[E4, 0, 4], [G4, 0, 4]], oomPah(C3, [E3, G3, B3], G2)),
    bar([[C4, 1, 1], [E4, 2, 1], [F4, 3, 1]], oomPah(C3, [E3, G3, B3], G2)),
    bar([[E4, 0, 4], [G4, 0, 4]], oomPah(C3, [E3, G3, B3], G2)),
    bar([[C4, 1, 1], [E4, 2, 1], [F4, 3, 1]], oomPah(C3, [E3, G3, B3], G2)),
    bar([[E4, 0, 2], [G4, 0, 2], [C4, 2, 2], [E4, 2, 2]], oomPah(C3, [E3, G3, B3], G2)),
    bar([[C4, 0, 2], [E4, 2, 2]], oomPah(C3, [E3, G3, B3], G2)),
    bar([[D4, 0, 4]], oomPah(G2, [F3, G3, B3], D3)),
    bar([[E4, 0, 1], [E4, 1, 1], [D4, 2, 1], [C4, 3, 1]], oomPah(C3, [E3, G3, B3], G2)),
    bar([[C4, 0, 2], [E4, 2, 2]], oomPah(C3, [E3, G3, Bb3], G2)),
    bar([[G4, 0, 2], [G4, 2, 1], [F4, 3, 1]], oomPah(F2, [F3, A3, C4], C3)),
    bar([[E4, 0, 4]], oomPah(C3, [E3, G3, B3], G2)),
    bar([[C4, 1, 1], [E4, 2, 1], [F4, 3, 1]], oomPah(C3, [E3, G3, B3], G2)),
    bar([[E4, 0, 2], [G4, 0, 2], [C4, 2, 2], [E4, 2, 2]], oomPah(C3, [E3, G3, B3], G2)),
    bar([[C4, 0, 1], [E4, 1, 1], [D4, 2, 2]], oomPah(G2, [F3, G3, B3], D3)),
    bar([[C4, 0, 4], [E4, 0, 4], [G4, 0, 4]], [[C3, 0, 1], [E3, 1, 1], [G3, 1, 1], [C2, 2, 2]]),
  ],
}

const mozartK545: Song = ((): Song => {
  /** Alberti eighths: low–high–mid–high, twice per bar. */
  const alberti = (low: number, mid: number, high: number): N[] =>
    [low, high, mid, high, low, high, mid, high].map((m, i): N => [m, i * 0.5, 0.5])
  return {
    id: 'mozart-k545',
    title: 'Sonata in C, K. 545 (opening)',
    composer: 'W. A. Mozart',
    grade: 7,
    style: 'classical',
    keySignature: 'C',
    timeSignature: [4, 4],
    tempoBpm: 116,
    sections: [
      { label: 'Theme', fromMeasure: 0, toMeasure: 3 },
      { label: 'Runs & cadence', fromMeasure: 4, toMeasure: 7 },
    ],
    measures: [
      bar([[C5, 0, 2, 1], [E5, 2, 1, 3], [G5, 3, 1, 5]], alberti(C4, E4, G4)),
      bar([[B4, 0, 1.5, 4], [C5, 1.5, 0.25, 5], [D5, 1.75, 0.25], [C5, 2, 2]], alberti(D4, F4, G4)),
      bar([[A5, 0, 1, 5], [G5, 1, 0.25], [F5, 1.25, 0.25], [E5, 1.5, 0.25], [D5, 1.75, 0.25], [E5, 2, 2]], alberti(F3, A3, C4)),
      bar([[B4, 0, 0.5], [C5, 0.5, 0.5], [D5, 1, 1], [G4, 2, 2]], alberti(G3, B3, D4)),
      bar(
        [
          [C6, 0, 0.25], [B5, 0.25, 0.25], [A5, 0.5, 0.25], [G5, 0.75, 0.25],
          [F5, 1, 0.25], [E5, 1.25, 0.25], [D5, 1.5, 0.25], [C5, 1.75, 0.25],
          [B4, 2, 0.25], [A4, 2.25, 0.25], [G4, 2.5, 0.25], [F4, 2.75, 0.25],
          [E4, 3, 0.25], [F4, 3.25, 0.25], [G4, 3.5, 0.25], [B4, 3.75, 0.25],
        ],
        [[C3, 0, 2], [G2, 2, 2]],
      ),
      bar(
        [
          [G4, 0, 0.25], [A4, 0.25, 0.25], [B4, 0.5, 0.25], [C5, 0.75, 0.25],
          [D5, 1, 0.25], [E5, 1.25, 0.25], [Fs5, 1.5, 0.25], [G5, 1.75, 0.25],
          [A5, 2, 1], [G5, 3, 1],
        ],
        [[D3, 0, 2], [G2, 2, 2]],
      ),
      bar(
        [
          [G5, 0, 0.25], [Fs5, 0.25, 0.25], [E5, 0.5, 0.25], [D5, 0.75, 0.25],
          [C5, 1, 0.25], [B4, 1.25, 0.25], [A4, 1.5, 0.25], [G4, 1.75, 0.25],
          [D5, 2, 0.5], [B4, 2.5, 0.5], [C5, 3, 0.5], [A4, 3.5, 0.5],
        ],
        [[G3, 0, 2], [D3, 2, 2]],
      ),
      bar([[G4, 0, 4], [B4, 0, 4]], [[G2, 0, 4], [D3, 0, 4]]),
    ],
  }
})()

/** The Entertainer again at full ragtime difficulty: octaves + stride. */
const entertainerStride: Song = ((): Song => {
  const figure = () =>
    bar(
      [
        [E4, 0, 0.25], [E5, 0, 0.25], [C5, 0.25, 0.75], [C6, 0.25, 0.75],
        [E4, 1, 0.25], [E5, 1, 0.25], [C5, 1.25, 0.75], [C6, 1.25, 0.75],
        [E4, 2, 0.25], [E5, 2, 0.25], [C5, 2.25, 0.75], [C6, 2.25, 0.75],
        [C5, 3, 1], [C6, 3, 1],
      ],
      oomPah(C3, [E3, G3, C4], G2),
    )
  const run = () =>
    bar(
      [
        [C5, 0, 0.25], [D5, 0.25, 0.25], [Ds5, 0.5, 0.25], [E5, 0.75, 0.25],
        [C5, 1, 0.25], [D5, 1.25, 0.25], [E5, 1.5, 0.5],
        [B4, 2, 0.25], [D5, 2.25, 0.75], [C5, 3, 1], [C6, 3, 1],
      ],
      oomPah(G2, [F3, G3, B3], C3, [E3, G3, C4]),
    )
  return {
    id: 'the-entertainer-stride',
    title: 'The Entertainer (ragtime octaves)',
    composer: 'S. Joplin',
    grade: 7,
    style: 'jazz',
    keySignature: 'C',
    timeSignature: [4, 4],
    tempoBpm: 92,
    sections: [
      { label: 'A phrase', fromMeasure: 0, toMeasure: 3 },
      { label: 'A again & ending', fromMeasure: 4, toMeasure: 7 },
    ],
    measures: [
      bar([[D4, 3, 0.5], [D5, 3, 0.5], [Ds4, 3.5, 0.5], [Ds5, 3.5, 0.5]], []),
      figure(),
      run(),
      figure(),
      run(),
      figure(),
      bar(
        [
          [F4, 0, 0.5], [D5, 0, 0.5], [E4, 0.5, 0.5], [C5, 0.5, 0.5],
          [C4, 1, 0.5], [A4, 1, 0.5], [B3, 1.5, 0.5], [G4, 1.5, 0.5],
          [C4, 2, 0.5], [E4, 2, 0.5], [B3, 2.5, 0.5], [G4, 2.5, 0.5],
          [C4, 3, 0.5], [A4, 3, 0.5], [D4, 3.5, 0.5], [B4, 3.5, 0.5],
        ],
        [[F2, 0, 1], [F3, 1, 1], [A3, 1, 1], [G2, 2, 1], [F3, 3, 1], [G3, 3, 1]],
      ),
      bar([[C4, 0, 4], [E4, 0, 4], [G4, 0, 4], [C5, 0, 4]], [[C2, 0, 4], [C3, 0, 4]]),
    ],
  }
})()

export const SONG_CATALOG: Song[] = [
  odeToJoy,
  twinkle,
  mary,
  jingleBells,
  saints,
  stJames,
  minuetInG,
  bluesShells,
  furElise,
  entertainerEasy,
  bachPrelude,
  walkingBlues,
  canonInD,
  iiVIEtude,
  chopinPrelude,
  saintsStride,
  mozartK545,
  entertainerStride,
  ...IMPORTED_SONGS,
].sort((a, b) => a.grade - b.grade)
