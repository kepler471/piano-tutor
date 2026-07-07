import type { Hand } from '../theory/types'
import type { Song, SongMeasure, SongNote } from '../data/songs/types'

/**
 * Standard MIDI File (format 0/1) → Song. Onsets and durations quantize to
 * a 16th-note grid. Hands: when exactly two tracks carry notes (the common
 * piano-staff export), the higher-pitched track is the right hand; otherwise
 * notes below middle C go left. Assumes 4/4 unless the file carries a
 * time-signature meta event.
 */
export class MidiImportError extends Error {}

function fail(msg: string): never {
  throw new MidiImportError(msg)
}

class Reader {
  pos = 0
  constructor(private data: DataView) {}
  get remaining() {
    return this.data.byteLength - this.pos
  }
  u8(): number {
    return this.data.getUint8(this.pos++)
  }
  u16(): number {
    const v = this.data.getUint16(this.pos)
    this.pos += 2
    return v
  }
  u32(): number {
    const v = this.data.getUint32(this.pos)
    this.pos += 4
    return v
  }
  ascii(len: number): string {
    let s = ''
    for (let i = 0; i < len; i++) s += String.fromCharCode(this.u8())
    return s
  }
  varlen(): number {
    let value = 0
    for (let i = 0; i < 4; i++) {
      const b = this.u8()
      value = (value << 7) | (b & 0x7f)
      if ((b & 0x80) === 0) break
    }
    return value
  }
  skip(n: number) {
    this.pos += n
  }
}

interface RawNote {
  midi: number
  startTick: number
  durationTicks: number
  track: number
}

export function parseMidiFile(buffer: ArrayBuffer, id: string): Song {
  const r = new Reader(new DataView(buffer))
  if (r.ascii(4) !== 'MThd') fail('Not a MIDI file (missing MThd).')
  const headerLen = r.u32()
  const format = r.u16()
  const trackCount = r.u16()
  const division = r.u16()
  if (headerLen > 6) r.skip(headerLen - 6)
  if (format > 1) fail(`MIDI format ${format} is not supported (only 0 and 1).`)
  if (division & 0x8000) fail('SMPTE time division is not supported.')

  const notes: RawNote[] = []
  let tempoBpm = 100
  let timeSignature: [number, number] = [4, 4]

  for (let t = 0; t < trackCount; t++) {
    if (r.remaining < 8) break
    if (r.ascii(4) !== 'MTrk') fail(`Track ${t} is malformed.`)
    const length = r.u32()
    const end = r.pos + length
    let tick = 0
    let runningStatus = 0
    const open = new Map<number, number>() // midi -> startTick

    while (r.pos < end) {
      tick += r.varlen()
      let status = r.u8()
      if (status < 0x80) {
        // running status: reuse previous, byte was data
        r.pos--
        status = runningStatus
      } else if (status < 0xf0) {
        runningStatus = status
      }
      const type = status & 0xf0
      if (status === 0xff) {
        const metaType = r.u8()
        const len = r.varlen()
        if (metaType === 0x51 && len === 3) {
          const usPerQuarter = (r.u8() << 16) | (r.u8() << 8) | r.u8()
          tempoBpm = Math.round(60_000_000 / usPerQuarter)
        } else if (metaType === 0x58 && len >= 2) {
          timeSignature = [r.u8(), 2 ** r.u8()]
          r.skip(len - 2)
        } else {
          r.skip(len)
        }
      } else if (status === 0xf0 || status === 0xf7) {
        r.skip(r.varlen())
      } else if (type === 0x90 || type === 0x80) {
        const midi = r.u8()
        const velocity = r.u8()
        if (type === 0x90 && velocity > 0) {
          if (!open.has(midi)) open.set(midi, tick)
        } else {
          const start = open.get(midi)
          if (start !== undefined) {
            open.delete(midi)
            if (midi >= 21 && midi <= 108)
              notes.push({ midi, startTick: start, durationTicks: tick - start, track: t })
          }
        }
      } else if (type === 0xc0 || type === 0xd0) {
        r.skip(1)
      } else {
        r.skip(2) // other channel messages carry 2 data bytes
      }
    }
    r.pos = end
  }

  if (notes.length === 0) fail('No notes found in this MIDI file.')

  // Two note-bearing tracks = a piano staff: the higher-pitched track is
  // the right hand. Anything else falls back to the middle-C split.
  const byTrack = new Map<number, { sum: number; count: number }>()
  for (const n of notes) {
    const acc = byTrack.get(n.track) ?? { sum: 0, count: 0 }
    acc.sum += n.midi
    acc.count++
    byTrack.set(n.track, acc)
  }
  let rightTrack: number | null = null
  if (byTrack.size === 2) {
    const [a, b] = [...byTrack.entries()]
    rightTrack = a[1].sum / a[1].count >= b[1].sum / b[1].count ? a[0] : b[0]
  }
  const handOf = (n: RawNote): Hand =>
    rightTrack !== null ? (n.track === rightTrack ? 'R' : 'L') : n.midi < 60 ? 'L' : 'R'

  // Quantize to the 16th grid and bucket into measures.
  const q = (ticks: number) => Math.round((ticks / division) * 4) / 4
  const beatsPerMeasure = (timeSignature[0] * 4) / timeSignature[1]
  const measures: SongMeasure[] = []
  for (const n of notes.sort((a, b) => a.startTick - b.startTick)) {
    const start = q(n.startTick)
    const duration = Math.max(0.25, q(n.durationTicks))
    const measureIndex = Math.floor(start / beatsPerMeasure + 1e-6)
    while (measures.length <= measureIndex) measures.push({ notes: [] })
    const songNote: SongNote = {
      midi: n.midi,
      startBeat: start - measureIndex * beatsPerMeasure,
      durationBeats: duration,
      hand: handOf(n),
    }
    measures[measureIndex].notes.push(songNote)
  }

  return {
    id,
    title: id,
    composer: 'Imported MIDI',
    grade: 2,
    style: 'classical',
    keySignature: 'C',
    timeSignature,
    tempoBpm: Math.min(200, Math.max(30, tempoBpm)),
    sections: [{ label: 'Whole piece', fromMeasure: 0, toMeasure: measures.length - 1 }],
    measures,
  }
}
