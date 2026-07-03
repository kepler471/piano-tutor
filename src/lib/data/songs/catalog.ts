import type { Finger, Hand } from '../../theory/types'
import type { Song, SongMeasure, SongNote } from './types'

/**
 * Bundled graded repertoire — public-domain pieces in our own simple
 * arrangements. Compact tuple encoding: [midi, startBeat, durationBeats,
 * finger?]. More (and longer) pieces arrive via the MusicXML pipeline;
 * this starter set covers grades 1–2.
 */
type N = [number, number, number, Finger?]

const notes = (hand: Hand, ns: N[]): SongNote[] =>
  ns.map(([midi, startBeat, durationBeats, finger]) => ({ midi, startBeat, durationBeats, hand, finger }))

const bar = (rh: N[], lh: N[]): SongMeasure => ({ notes: [...notes('R', rh), ...notes('L', lh)] })

// Midi shorthands (octave 2–5)
const G2 = 43, A2 = 45, B2 = 47
const C3 = 48, D3 = 50, Eb3 = 51, F3 = 53, G3 = 55, A3 = 57, Bb3 = 58, B3 = 59
const C4 = 60, D4 = 62, Eb4 = 63, E4 = 64, F4 = 65, Fs4 = 66, G4 = 67, A4 = 69, Bb4 = 70, B4 = 71
const C5 = 72, D5 = 74, E5 = 76, Fs5 = 78, G5 = 79
const F2 = 41

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

export const SONG_CATALOG: Song[] = [odeToJoy, twinkle, mary, jingleBells, saints, minuetInG, bluesShells]
