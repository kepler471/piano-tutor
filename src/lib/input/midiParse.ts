import type { NoteEvent } from '../audio/noteEvents'

const MIDI_MIN = 21
const MIDI_MAX = 108

/**
 * Parse a raw Web MIDI message into a NoteEvent. Pure — testable without a
 * device. Handles note-on (0x9n), note-off (0x8n), and the common
 * note-on-with-velocity-0 convention for note-off. Everything else
 * (aftertouch, CC, pitch bend, clock…) returns null.
 *
 * @param tMs event timestamp in the performance.now() domain — Web MIDI's
 *   MIDIMessageEvent.timeStamp is already in this clock.
 */
export function parseMidiMessage(data: Uint8Array | null, tMs: number): NoteEvent | null {
  if (!data || data.length < 3) return null
  const type = data[0] & 0xf0
  if (type !== 0x90 && type !== 0x80) return null
  const midi = data[1]
  if (midi < MIDI_MIN || midi > MIDI_MAX) return null
  const velocity = data[2]
  if (type === 0x90 && velocity > 0) {
    return {
      kind: 'on',
      midi,
      t: tMs / 1000,
      tMs,
      confidence: 1,
      velocity: velocity / 127,
      source: 'midi',
    }
  }
  return { kind: 'off', midi, t: tMs / 1000, tMs, confidence: 1, source: 'midi' }
}
