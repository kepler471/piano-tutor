// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { MusicXmlError, parseMusicXml } from '../lib/songs/musicxml'

const wrap = (measures: string, extra = '') => `<?xml version="1.0"?>
<score-partwise version="4.0">
  <work><work-title>Test Piece</work-title></work>
  <identification><creator type="composer">A. Composer</creator></identification>
  ${extra}
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">${measures}</part>
</score-partwise>`

const ATTRS = `<attributes>
  <divisions>2</divisions>
  <key><fifths>1</fifths></key>
  <time><beats>3</beats><beat-type>4</beat-type></time>
</attributes>`

const note = (step: string, octave: number, dur: number, opts: { chord?: boolean; staff?: number; alter?: number; tie?: string } = {}) => `
  <note>
    ${opts.chord ? '<chord/>' : ''}
    <pitch><step>${step}</step>${opts.alter ? `<alter>${opts.alter}</alter>` : ''}<octave>${octave}</octave></pitch>
    <duration>${dur}</duration>
    ${opts.staff ? `<staff>${opts.staff}</staff>` : ''}
    ${opts.tie ? `<tie type="${opts.tie}"/>` : ''}
  </note>`

describe('parseMusicXml', () => {
  it('parses key, time, title, composer and pitches', () => {
    const song = parseMusicXml(
      wrap(`<measure number="1">${ATTRS}${note('G', 4, 2)}${note('A', 4, 2)}${note('B', 4, 2)}</measure>`),
      'test',
    )
    expect(song.title).toBe('Test Piece')
    expect(song.composer).toBe('A. Composer')
    expect(song.keySignature).toBe('G')
    expect(song.timeSignature).toEqual([3, 4])
    expect(song.measures).toHaveLength(1)
    expect(song.measures[0].notes.map((n) => n.midi)).toEqual([67, 69, 71])
    expect(song.measures[0].notes.map((n) => n.startBeat)).toEqual([0, 1, 2])
    expect(song.measures[0].notes.every((n) => n.durationBeats === 1)).toBe(true)
  })

  it('groups <chord/> notes at the same onset', () => {
    const song = parseMusicXml(
      wrap(`<measure number="1">${ATTRS}${note('C', 4, 4)}${note('E', 4, 4, { chord: true })}${note('G', 4, 4, { chord: true })}<note><rest/><duration>2</duration></note></measure>`),
      'test',
    )
    const onsets = song.measures[0].notes.map((n) => n.startBeat)
    expect(onsets).toEqual([0, 0, 0])
    expect(song.measures[0].notes.map((n) => n.midi).sort((a, b) => a - b)).toEqual([60, 64, 67])
  })

  it('routes staff 2 to the left hand', () => {
    const song = parseMusicXml(
      wrap(`<measure number="1">${ATTRS}${note('C', 5, 2)}<backup><duration>2</duration></backup>${note('C', 3, 2, { staff: 2 })}</measure>`),
      'test',
    )
    const hands = new Map(song.measures[0].notes.map((n) => [n.midi, n.hand]))
    expect(hands.get(72)).toBe('R')
    expect(hands.get(48)).toBe('L')
    expect(song.measures[0].notes.every((n) => n.startBeat === 0)).toBe(true)
  })

  it('merges tied notes into one longer note', () => {
    const song = parseMusicXml(
      wrap(
        `<measure number="1">${ATTRS}${note('D', 4, 4, { tie: 'start' })}</measure>` +
          `<measure number="2">${note('D', 4, 2, { tie: 'stop' })}</measure>`,
      ),
      'test',
    )
    const all = song.measures.flatMap((m) => m.notes)
    expect(all).toHaveLength(1)
    expect(all[0].durationBeats).toBe(3)
  })

  it('applies alter for accidentals', () => {
    const song = parseMusicXml(wrap(`<measure number="1">${ATTRS}${note('F', 4, 2, { alter: 1 })}</measure>`), 't')
    expect(song.measures[0].notes[0].midi).toBe(66)
  })

  it('rejects multi-part scores loudly', () => {
    const xml = `<?xml version="1.0"?><score-partwise>
      <part-list/><part id="P1"><measure>${ATTRS}</measure></part><part id="P2"><measure/></part>
    </score-partwise>`
    expect(() => parseMusicXml(xml, 't')).toThrow(MusicXmlError)
    expect(() => parseMusicXml(xml, 't')).toThrow(/parts/)
  })

  it('rejects tuplets and grace notes loudly', () => {
    const tuplet = wrap(
      `<measure number="1">${ATTRS}<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification></note></measure>`,
    )
    expect(() => parseMusicXml(tuplet, 't')).toThrow(/Tuplets/)
    const grace = wrap(
      `<measure number="1">${ATTRS}<note><grace/><pitch><step>C</step><octave>4</octave></pitch></note></measure>`,
    )
    expect(() => parseMusicXml(grace, 't')).toThrow(/Grace/)
  })

  it('rejects scores without divisions', () => {
    expect(() => parseMusicXml(wrap(`<measure number="1">${note('C', 4, 2)}</measure>`), 't')).toThrow(/divisions/)
  })
})
