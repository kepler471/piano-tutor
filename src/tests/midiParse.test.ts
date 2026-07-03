import { describe, expect, it } from 'vitest'
import { parseMidiMessage } from '../lib/input/midiParse'
import { chooseSource, shouldForward } from '../lib/input/routing'

const bytes = (...b: number[]) => new Uint8Array(b)

describe('parseMidiMessage', () => {
  it('parses note-on with velocity', () => {
    const ev = parseMidiMessage(bytes(0x90, 60, 100), 1234)
    expect(ev).toMatchObject({ kind: 'on', midi: 60, source: 'midi', confidence: 1, tMs: 1234 })
    expect(ev!.velocity).toBeCloseTo(100 / 127)
    expect(ev!.t).toBeCloseTo(1.234)
  })

  it('parses note-off', () => {
    expect(parseMidiMessage(bytes(0x80, 64, 64), 0)).toMatchObject({ kind: 'off', midi: 64 })
  })

  it('treats note-on with velocity 0 as note-off', () => {
    expect(parseMidiMessage(bytes(0x90, 60, 0), 0)).toMatchObject({ kind: 'off', midi: 60 })
    expect(parseMidiMessage(bytes(0x90, 60, 0), 0)!.velocity).toBeUndefined()
  })

  it('handles all channels via status masking', () => {
    expect(parseMidiMessage(bytes(0x95, 72, 80), 0)).toMatchObject({ kind: 'on', midi: 72 })
    expect(parseMidiMessage(bytes(0x8f, 72, 0), 0)).toMatchObject({ kind: 'off', midi: 72 })
  })

  it('ignores non-note messages', () => {
    expect(parseMidiMessage(bytes(0xb0, 64, 127), 0)).toBeNull() // CC (sustain)
    expect(parseMidiMessage(bytes(0xe0, 0, 64), 0)).toBeNull() // pitch bend
    expect(parseMidiMessage(bytes(0xa0, 60, 50), 0)).toBeNull() // aftertouch
  })

  it('ignores notes outside the piano range', () => {
    expect(parseMidiMessage(bytes(0x90, 20, 100), 0)).toBeNull()
    expect(parseMidiMessage(bytes(0x90, 109, 100), 0)).toBeNull()
    expect(parseMidiMessage(bytes(0x90, 21, 100), 0)).not.toBeNull()
    expect(parseMidiMessage(bytes(0x90, 108, 100), 0)).not.toBeNull()
  })

  it('ignores null or truncated data', () => {
    expect(parseMidiMessage(null, 0)).toBeNull()
    expect(parseMidiMessage(bytes(0x90, 60), 0)).toBeNull()
    expect(parseMidiMessage(bytes(), 0)).toBeNull()
  })
})

describe('input routing', () => {
  it('prefers MIDI whenever available', () => {
    expect(chooseSource(true, 'mono')).toBe('midi')
    expect(chooseSource(true, 'poly')).toBe('midi')
  })

  it('falls back to the preferred mic detector', () => {
    expect(chooseSource(false, 'mono')).toBe('mic-mono')
    expect(chooseSource(false, 'poly')).toBe('mic-poly')
  })

  it('forwards only the active source to subscribers', () => {
    expect(shouldForward('midi', 'midi')).toBe(true)
    expect(shouldForward('mono', 'midi')).toBe(false)
    expect(shouldForward('mono', 'mic-mono')).toBe(true)
    expect(shouldForward('poly', 'mic-mono')).toBe(false)
    // Mono still runs in poly mode for the level meter, but must not grade.
    expect(shouldForward('poly', 'mic-poly')).toBe(true)
    expect(shouldForward('mono', 'mic-poly')).toBe(false)
    expect(shouldForward('midi', 'none')).toBe(false)
    expect(shouldForward('mono', 'none')).toBe(false)
  })
})
