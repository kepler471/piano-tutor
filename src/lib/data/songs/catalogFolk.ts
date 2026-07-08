import type { Song, SongMeasure, SongNote } from './types'
import type { Hand } from '../../theory/types'

/**
 * Hand-transcribed grade-1 folk/hymn/round melodies -- universally known public-domain
 * tunes, simple RH melody + sustained/root-position LH accompaniment. Compact tuple
 * encoding: [midi, startBeat, durationBeats] (no fingering source for these).
 */
type N = [number, number, number]

const notes = (hand: Hand, ns: N[]): SongNote[] =>
  ns.map(([midi, startBeat, durationBeats]) => ({ midi, startBeat, durationBeats, hand }))

const bar = (rh: N[], lh: N[]): SongMeasure => ({ notes: [...notes('R', rh), ...notes('L', lh)] })

/** Traditional public-domain melody, hand-transcribed. */
const frereJacques: Song = {
  id: 'frere-jacques',
  title: 'Frère Jacques',
  composer: 'Traditional',
  grade: 1,
  style: 'folk',
  keySignature: 'C',
  timeSignature: [4, 4],
  tempoBpm: 96,
  sections: [
    { label: 'Frère Jacques', fromMeasure: 1, toMeasure: 2 },
    { label: 'Dormez-vous? Sonnez les matines', fromMeasure: 3, toMeasure: 6 },
    { label: 'Ding, ding, dong', fromMeasure: 7, toMeasure: 7 },
  ],
  measures: [
    bar([[60, 0, 1], [62, 1, 1], [64, 2, 1], [60, 3, 1]], [[48, 0, 4]]),
    bar([[60, 0, 1], [62, 1, 1], [64, 2, 1], [60, 3, 1]], [[48, 0, 4]]),
    bar([[64, 0, 1], [65, 1, 1], [67, 2, 2]], [[43, 0, 4]]),
    bar([[64, 0, 1], [65, 1, 1], [67, 2, 2]], [[43, 0, 4]]),
    bar([[67, 0, 0.5], [69, 0.5, 0.5], [67, 1, 0.5], [65, 1.5, 0.5], [64, 2, 1], [60, 3, 1]], [[48, 0, 4]]),
    bar([[67, 0, 0.5], [69, 0.5, 0.5], [67, 1, 0.5], [65, 1.5, 0.5], [64, 2, 1], [60, 3, 1]], [[48, 0, 4]]),
    bar([[60, 0, 1], [55, 1, 1], [60, 2, 2]], [[48, 0, 2], [43, 2, 2]]),
    bar([[60, 0, 1], [55, 1, 1], [60, 2, 2]], [[48, 0, 2], [43, 2, 2]]),
  ],
}

/** Traditional public-domain melody, hand-transcribed. */
const hotCrossBuns: Song = {
  id: 'hot-cross-buns',
  title: 'Hot Cross Buns',
  composer: 'Traditional',
  grade: 1,
  style: 'folk',
  keySignature: 'C',
  timeSignature: [4, 4],
  tempoBpm: 100,
  sections: [
    { label: 'Melody', fromMeasure: 1, toMeasure: 4 },
    { label: 'Repeat', fromMeasure: 5, toMeasure: 7 },
  ],
  measures: [
    bar([[64, 0, 1], [62, 1, 1], [60, 2, 1]], [[48, 0, 4]]),
    bar([[64, 0, 1], [62, 1, 1], [60, 2, 1]], [[48, 0, 4]]),
    bar([[60, 0, 0.5], [60, 0.5, 0.5], [60, 1, 0.5], [60, 1.5, 0.5], [62, 2, 0.5], [62, 2.5, 0.5], [62, 3, 0.5], [62, 3.5, 0.5]], [[43, 0, 4]]),
    bar([[64, 0, 1], [62, 1, 1], [60, 2, 1]], [[48, 0, 4]]),
    bar([[64, 0, 1], [62, 1, 1], [60, 2, 1]], [[48, 0, 4]]),
    bar([[64, 0, 1], [62, 1, 1], [60, 2, 1]], [[48, 0, 4]]),
    bar([[60, 0, 0.5], [60, 0.5, 0.5], [60, 1, 0.5], [60, 1.5, 0.5], [62, 2, 0.5], [62, 2.5, 0.5], [62, 3, 0.5], [62, 3.5, 0.5]], [[43, 0, 4]]),
    bar([[64, 0, 1], [62, 1, 1], [60, 2, 1]], [[48, 0, 4]]),
  ],
}

/** Traditional public-domain melody, hand-transcribed. */
const londonBridgeIsFallingDown: Song = {
  id: 'london-bridge-is-falling-down',
  title: 'London Bridge Is Falling Down',
  composer: 'Traditional',
  grade: 1,
  style: 'folk',
  keySignature: 'C',
  timeSignature: [4, 4],
  tempoBpm: 100,
  sections: [
    { label: 'London Bridge is falling down', fromMeasure: 0, toMeasure: 1 },
    { label: 'Falling down, falling down', fromMeasure: 2, toMeasure: 3 },
    { label: 'London Bridge / My fair lady', fromMeasure: 4, toMeasure: 7 },
  ],
  measures: [
    bar([[67, 0, 1], [69, 1, 1], [67, 2, 1], [65, 3, 1]], [[48, 0, 4]]),
    bar([[64, 0, 1], [65, 1, 1], [67, 2, 2]], [[43, 0, 4]]),
    bar([[62, 0, 1], [64, 1, 1], [65, 2, 2]], [[48, 0, 4]]),
    bar([[64, 0, 1], [65, 1, 1], [67, 2, 2]], [[43, 0, 4]]),
    bar([[67, 0, 1], [69, 1, 1], [67, 2, 1], [65, 3, 1]], [[48, 0, 4]]),
    bar([[64, 0, 1], [65, 1, 1], [67, 2, 2]], [[43, 0, 4]]),
    bar([[67, 0, 1], [64, 1, 1], [60, 2, 2]], [[48, 0, 4]]),
    bar([[62, 0, 1], [64, 1, 1], [60, 2, 2]], [[43, 0, 2], [48, 2, 2]]),
  ],
}

/** Traditional public-domain melody, hand-transcribed. */
const rowRowRowYourBoat: Song = {
  id: 'row-row-row-your-boat',
  title: 'Row, Row, Row Your Boat',
  composer: 'Traditional',
  grade: 1,
  style: 'folk',
  keySignature: 'C',
  timeSignature: [4, 4],
  tempoBpm: 100,
  sections: [
    { label: 'Row, Row, Row Your Boat', fromMeasure: 1, toMeasure: 3 },
    { label: 'Merrily, Merrily, Merrily, Merrily', fromMeasure: 4, toMeasure: 6 },
    { label: 'Life Is But a Dream', fromMeasure: 7, toMeasure: 7 },
  ],
  measures: [
    bar([[60, 0, 1], [60, 1, 1], [60, 2, 1], [62, 3, 1]], [[48, 0, 4]]),
    bar([[64, 0, 2], [64, 2, 1], [62, 3, 1]], [[48, 0, 4]]),
    bar([[64, 0, 1], [65, 1, 1], [67, 2, 2]], [[55, 0, 4]]),
    bar([[60, 0, 1], [60, 1, 1], [60, 2, 1], [67, 3, 1]], [[48, 0, 4]]),
    bar([[67, 0, 1], [67, 1, 1], [64, 2, 1], [64, 3, 1]], [[55, 0, 4]]),
    bar([[64, 0, 1], [60, 1, 1], [60, 2, 1], [60, 3, 1]], [[48, 0, 4]]),
    bar([[67, 0, 1], [65, 1, 1], [64, 2, 1], [62, 3, 1]], [[55, 0, 4]]),
    bar([[60, 0, 4]], [[48, 0, 4]]),
  ],
}

/** Traditional public-domain melody, hand-transcribed. */
const thisOldMan: Song = {
  id: 'this-old-man',
  title: 'This Old Man',
  composer: 'Traditional',
  grade: 1,
  style: 'folk',
  keySignature: 'C',
  timeSignature: [4, 4],
  tempoBpm: 100,
  sections: [
    { label: 'This old man, he played one', fromMeasure: 1, toMeasure: 4 },
    { label: 'Knick-knack paddy-whack', fromMeasure: 5, toMeasure: 7 },
  ],
  measures: [
    bar([[67, 0, 1], [64, 1, 1], [67, 2, 2]], [[48, 0, 4]]),
    bar([[67, 0, 1], [64, 1, 1], [67, 2, 2]], [[48, 0, 4]]),
    bar([[69, 0, 1], [67, 1, 1], [65, 2, 1], [67, 3, 1]], [[53, 0, 2], [50, 2, 2]]),
    bar([[62, 0, 1], [64, 1, 1], [65, 2, 1], [64, 3, 0.5], [65, 3.5, 0.5]], [[55, 0, 4]]),
    bar([[67, 0, 1], [60, 1, 1], [60, 2, 0.5], [60, 2.5, 0.5], [60, 3, 1]], [[48, 0, 4]]),
    bar([[60, 0, 0.5], [62, 0.5, 0.5], [64, 1, 0.5], [65, 1.5, 0.5], [67, 2, 2]], [[48, 0, 4]]),
    bar([[67, 0, 1], [62, 1, 1], [62, 2, 1], [65, 3, 1]], [[55, 0, 4]]),
    bar([[64, 0, 1], [62, 1, 1], [60, 2, 2]], [[48, 0, 4]]),
  ],
}

/** Traditional public-domain melody, hand-transcribed. */
const yankeeDoodle: Song = {
  id: 'yankee-doodle',
  title: 'Yankee Doodle',
  composer: 'Traditional',
  grade: 1,
  style: 'folk',
  keySignature: 'C',
  timeSignature: [4, 4],
  tempoBpm: 104,
  sections: [
    { label: 'First half — "Yankee Doodle went to town, riding on a pony"', fromMeasure: 0, toMeasure: 3 },
    { label: 'Second half — "Stuck a feather in his cap and called it macaroni"', fromMeasure: 4, toMeasure: 7 },
  ],
  measures: [
    bar([[60, 0, 1], [60, 1, 1], [62, 2, 1], [64, 3, 1]], [[48, 0, 4]]),
    bar([[60, 0, 1], [64, 1, 1], [62, 2, 2]], [[55, 0, 4]]),
    bar([[60, 0, 1], [60, 1, 1], [62, 2, 1], [64, 3, 1]], [[48, 0, 4]]),
    bar([[62, 0, 4]], [[55, 0, 4]]),
    bar([[64, 0, 1], [64, 1, 1], [65, 2, 1], [64, 3, 1]], [[53, 0, 4]]),
    bar([[62, 0, 4]], [[55, 0, 4]]),
    bar([[62, 0, 1], [62, 1, 1], [60, 2, 1], [62, 3, 1]], [[55, 0, 4]]),
    bar([[60, 0, 4]], [[48, 0, 4]]),
  ],
}

/** Traditional public-domain melody, hand-transcribed. */
const oldMacdonaldHadAFarm: Song = {
  id: 'old-macdonald-had-a-farm',
  title: 'Old MacDonald Had a Farm',
  composer: 'Traditional',
  grade: 1,
  style: 'folk',
  keySignature: 'C',
  timeSignature: [4, 4],
  tempoBpm: 100,
  sections: [
    { label: 'Old MacDonald had a farm, E-I-E-I-O', fromMeasure: 1, toMeasure: 4 },
    { label: 'With a moo-moo here, and a moo-moo there', fromMeasure: 5, toMeasure: 8 },
    { label: 'Old MacDonald had a farm (reprise)', fromMeasure: 9, toMeasure: 11 },
  ],
  measures: [
    bar([[60, 0, 1], [60, 1, 1], [60, 2, 1], [67, 3, 1]], [[48, 0, 4]]),
    bar([[69, 0, 1], [69, 1, 1], [67, 2, 2]], [[53, 0, 4]]),
    bar([[64, 0, 1], [64, 1, 1], [62, 2, 1], [62, 3, 1]], [[55, 0, 4]]),
    bar([[60, 0, 2]], [[48, 0, 4]]),
    bar([[67, 0, 1], [67, 1, 1], [67, 2, 1], [62, 3, 1]], [[55, 0, 4]]),
    bar([[62, 0, 1], [62, 1, 1], [67, 2, 2]], [[55, 0, 4]]),
    bar([[67, 0, 1], [67, 1, 1], [64, 2, 1], [64, 3, 1]], [[48, 0, 4]]),
    bar([[60, 0, 2]], [[48, 0, 4]]),
    bar([[60, 0, 1], [60, 1, 1], [60, 2, 1], [67, 3, 1]], [[48, 0, 4]]),
    bar([[69, 0, 1], [69, 1, 1], [67, 2, 2]], [[53, 0, 4]]),
    bar([[64, 0, 1], [64, 1, 1], [62, 2, 1], [62, 3, 1]], [[55, 0, 4]]),
    bar([[60, 0, 4]], [[48, 0, 4]]),
  ],
}

/** Traditional public-domain melody, hand-transcribed. */
const camptownRaces: Song = {
  id: 'camptown-races',
  title: 'Camptown Races',
  composer: 'S. Foster',
  grade: 1,
  style: 'folk',
  keySignature: 'C',
  timeSignature: [4, 4],
  tempoBpm: 104,
  sections: [
    { label: 'Verse', fromMeasure: 1, toMeasure: 8 },
    { label: 'Chorus', fromMeasure: 9, toMeasure: 15 },
  ],
  measures: [
    bar([[67, 0, 1], [67, 1, 1], [64, 2, 1], [67, 3, 1]], [[48, 0, 4]]),
    bar([[69, 0, 1], [67, 1, 1], [64, 2, 2]], [[48, 0, 4]]),
    bar([[64, 0, 1], [62, 1, 2]], [[43, 0, 4]]),
    bar([[64, 0, 1], [62, 1, 2], [67, 3, 1]], [[48, 0, 4]]),
    bar([[67, 0, 1], [67, 1, 1], [64, 2, 1], [67, 3, 1]], [[48, 0, 4]]),
    bar([[69, 0, 1], [67, 1, 1], [64, 2, 2]], [[48, 0, 4]]),
    bar([[62, 0, 2], [64, 2, 1], [62, 3, 1]], [[43, 0, 4]]),
    bar([[60, 0, 4]], [[48, 0, 4]]),
    bar([[60, 0, 1.5], [60, 1.5, 0.5], [64, 2, 1], [67, 3, 1]], [[48, 0, 4]]),
    bar([[72, 0, 4]], [[43, 0, 4]]),
    bar([[69, 0, 1.5], [69, 1.5, 0.5], [72, 2, 1], [69, 3, 1]], [[48, 0, 4]]),
    bar([[67, 0, 3], [64, 3, 1]], [[43, 0, 4]]),
    bar([[67, 0, 1], [67, 1, 1], [64, 2, 0.5], [64, 2.5, 0.5], [67, 3, 0.5], [67, 3.5, 0.5]], [[48, 0, 4]]),
    bar([[69, 0, 1], [67, 1, 1], [64, 2, 2]], [[48, 0, 4]]),
    bar([[62, 0, 1], [64, 1, 0.5], [65, 1.5, 0.5], [64, 2, 1], [62, 3, 0.5], [62, 3.5, 0.5]], [[43, 0, 4]]),
    bar([[60, 0, 4]], [[48, 0, 4]]),
  ],
}

/** Traditional public-domain melody, hand-transcribed. */
const silentNight: Song = {
  id: 'silent-night',
  title: 'Silent Night',
  composer: 'F. Gruber',
  grade: 1,
  style: 'folk',
  keySignature: 'C',
  timeSignature: [3, 4],
  tempoBpm: 92,
  sections: [
    { label: 'Silent night, holy night', fromMeasure: 0, toMeasure: 3 },
    { label: 'Round yon virgin, holy infant', fromMeasure: 4, toMeasure: 7 },
    { label: 'Sleep in heavenly peace', fromMeasure: 8, toMeasure: 11 },
  ],
  measures: [
    bar([[67, 0, 1.5], [67, 1.5, 0.5], [69, 2, 1]], [[48, 0, 3]]),
    bar([[67, 0, 1.5], [64, 1.5, 0.5], [64, 2, 1]], [[43, 0, 3]]),
    bar([[62, 0, 1.5], [62, 1.5, 0.5], [59, 2, 1]], [[48, 0, 3]]),
    bar([[59, 0, 1.5], [60, 1.5, 0.5], [64, 2, 1]], [[43, 0, 3]]),
    bar([[64, 0, 0.5], [64, 0.5, 0.5], [60, 1, 1], [64, 2, 0.5], [67, 2.5, 0.5]], [[48, 0, 3]]),
    bar([[67, 0, 1.5], [65, 1.5, 0.5], [64, 2, 1]], [[41, 0, 3]]),
    bar([[64, 0, 0.5], [64, 0.5, 0.5], [60, 1, 1], [64, 2, 0.5], [67, 2.5, 0.5]], [[48, 0, 3]]),
    bar([[67, 0, 1.5], [65, 1.5, 0.5], [64, 2, 1]], [[43, 0, 3]]),
    bar([[65, 0, 1.5], [65, 1.5, 0.5], [69, 2, 1]], [[41, 0, 3]]),
    bar([[67, 0, 1.5], [65, 1.5, 0.5], [62, 2, 1]], [[48, 0, 3]]),
    bar([[65, 0, 1.5], [65, 1.5, 0.5], [69, 2, 1]], [[41, 0, 3]]),
    bar([[67, 0, 1.5], [65, 1.5, 0.5], [60, 2, 1]], [[48, 0, 3]]),
  ],
}

/** Traditional public-domain melody, hand-transcribed. */
const amazingGrace: Song = {
  id: 'amazing-grace',
  title: 'Amazing Grace (opening phrase)',
  composer: 'Traditional',
  grade: 1,
  style: 'folk',
  keySignature: 'G',
  timeSignature: [3, 4],
  tempoBpm: 90,
  sections: [
    { label: 'Amazing grace, how sweet the sound', fromMeasure: 0, toMeasure: 2 },
    { label: 'That saved a wretch like me', fromMeasure: 3, toMeasure: 5 },
    { label: 'Repeat', fromMeasure: 6, toMeasure: 11 },
  ],
  measures: [
    bar([[62, 0, 1], [67, 1, 1], [71, 2, 1]], [[55, 0, 3]]),
    bar([[71, 0, 1], [69, 1, 1], [67, 2, 1]], [[48, 0, 3]]),
    bar([[64, 0, 1], [74, 1, 2]], [[50, 0, 3]]),
    bar([[67, 0, 1], [71, 1, 1], [71, 2, 1]], [[55, 0, 3]]),
    bar([[74, 0, 2], [71, 2, 1]], [[48, 0, 3]]),
    bar([[67, 0, 3]], [[55, 0, 3]]),
    bar([[62, 0, 1], [67, 1, 1], [71, 2, 1]], [[55, 0, 3]]),
    bar([[71, 0, 1], [69, 1, 1], [67, 2, 1]], [[48, 0, 3]]),
    bar([[64, 0, 1], [74, 1, 2]], [[50, 0, 3]]),
    bar([[67, 0, 1], [71, 1, 1], [71, 2, 1]], [[55, 0, 3]]),
    bar([[74, 0, 2], [71, 2, 1]], [[48, 0, 3]]),
    bar([[67, 0, 3]], [[55, 0, 3]]),
  ],
}

export const FOLK_SONGS: Song[] = [frereJacques, hotCrossBuns, londonBridgeIsFallingDown, rowRowRowYourBoat, thisOldMan, yankeeDoodle, oldMacdonaldHadAFarm, camptownRaces, silentNight, amazingGrace]
