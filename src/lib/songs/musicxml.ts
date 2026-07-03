import type { Hand } from '../theory/types'
import type { Song, SongMeasure, SongNote } from '../data/songs/types'

/**
 * MusicXML → Song, strict v1 subset. DOMParser-based so the same code runs
 * for browser imports and (later) a build-time converter under jsdom.
 *
 * Supported: one piano part, up to 2 staves (staff 1 → RH, staff 2 → LH),
 * chords (<chord/>), ties (merged into one longer note), durations from
 * whole to 16th incl. dots, key/time signatures, tempo.
 *
 * Rejected loudly (no silent mangling): multiple parts, tuplets
 * (<time-modification>), grace notes, and anything without <divisions>.
 */
const FIFTHS_TO_KEY = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#']

const STEP_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export class MusicXmlError extends Error {}

function fail(msg: string): never {
  throw new MusicXmlError(msg)
}

function text(el: Element | null | undefined, selector: string): string | null {
  const t = el?.querySelector(selector)?.textContent
  return t == null || t === '' ? null : t
}

export function parseMusicXml(xml: string, id: string): Song {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) fail('Not valid XML.')
  const root = doc.querySelector('score-partwise') ?? fail('Only score-partwise MusicXML is supported.')

  const parts = root.querySelectorAll(':scope > part')
  if (parts.length === 0) fail('No <part> found.')
  if (parts.length > 1) fail(`Found ${parts.length} parts — only single-part piano scores are supported.`)
  const part = parts[0]

  const title = text(root, 'work > work-title') ?? text(root, 'movement-title') ?? id
  const composer = text(root, "identification creator[type='composer']") ?? 'Unknown'

  let divisions = 0
  let keySignature = 'C'
  let timeSignature: [number, number] = [4, 4]
  let tempoBpm = 100

  const measures: SongMeasure[] = []
  // Ties: pending note per (staff, midi) awaiting its tie-stop.
  const openTies = new Map<string, SongNote>()

  const measureEls = part.querySelectorAll(':scope > measure')
  measureEls.forEach((measureEl, measureIndex) => {
    const attrs = measureEl.querySelector(':scope > attributes')
    if (attrs) {
      const div = text(attrs, 'divisions')
      if (div) divisions = Number(div)
      const fifths = text(attrs, 'key > fifths')
      if (fifths !== null) {
        const idx = Number(fifths) + 7
        if (idx < 0 || idx >= FIFTHS_TO_KEY.length) fail(`Unsupported key signature (fifths=${fifths}).`)
        keySignature = FIFTHS_TO_KEY[idx]
      }
      const beats = text(attrs, 'time > beats')
      const beatType = text(attrs, 'time > beat-type')
      if (beats && beatType) timeSignature = [Number(beats), Number(beatType)]
    }
    const tempo = measureEl.querySelector('sound[tempo]')?.getAttribute('tempo')
    if (tempo) tempoBpm = Math.round(Number(tempo))

    if (!divisions) fail('Missing <divisions> — cannot interpret durations.')

    const notes: SongNote[] = []
    let cursor = 0 // in beats
    let lastOnset = 0

    for (const child of measureEl.children) {
      if (child.tagName === 'backup') {
        cursor -= Number(text(child, 'duration') ?? 0) / divisions
        continue
      }
      if (child.tagName === 'forward') {
        cursor += Number(text(child, 'duration') ?? 0) / divisions
        continue
      }
      if (child.tagName !== 'note') continue
      const note = child
      if (note.querySelector('grace')) fail(`Grace notes are not supported (measure ${measureIndex + 1}).`)
      if (note.querySelector('time-modification')) fail(`Tuplets are not supported (measure ${measureIndex + 1}).`)

      const durationBeats = Number(text(note, 'duration') ?? 0) / divisions
      const isChord = note.querySelector(':scope > chord') !== null
      const onset = isChord ? lastOnset : cursor

      if (note.querySelector('rest')) {
        if (!isChord) cursor += durationBeats
        continue
      }

      const step = text(note, 'pitch > step') ?? fail(`Note without pitch (measure ${measureIndex + 1}).`)
      const octave = Number(text(note, 'pitch > octave') ?? fail(`Note without octave (measure ${measureIndex + 1}).`))
      const alter = Number(text(note, 'pitch > alter') ?? 0)
      const midi = 12 * (octave + 1) + STEP_SEMITONES[step] + alter
      if (Number.isNaN(midi) || midi < 21 || midi > 108) fail(`Note out of piano range (measure ${measureIndex + 1}).`)

      const staff = Number(text(note, 'staff') ?? 1)
      if (staff > 2) fail(`More than 2 staves are not supported (measure ${measureIndex + 1}).`)
      const hand: Hand = staff === 2 ? 'L' : 'R'

      const tieTypes = [...note.querySelectorAll(':scope > tie')].map((t) => t.getAttribute('type'))
      const tieKey = `${staff}:${midi}`

      if (tieTypes.includes('stop') && openTies.has(tieKey)) {
        // Extend the note that started the tie; don't emit a new one.
        const open = openTies.get(tieKey)!
        open.durationBeats += durationBeats
        if (!tieTypes.includes('start')) openTies.delete(tieKey)
      } else {
        const songNote: SongNote = { midi, startBeat: onset, durationBeats, hand }
        notes.push(songNote)
        if (tieTypes.includes('start')) openTies.set(tieKey, songNote)
      }

      if (!isChord) {
        lastOnset = onset
        cursor = onset + durationBeats
      }
    }
    measures.push({ notes })
  })

  if (measures.length === 0) fail('Score has no measures.')

  return {
    id,
    title,
    composer,
    grade: 2,
    style: 'classical',
    keySignature,
    timeSignature,
    tempoBpm,
    sections: [{ label: 'Whole piece', fromMeasure: 0, toMeasure: measures.length - 1 }],
    measures,
  }
}
