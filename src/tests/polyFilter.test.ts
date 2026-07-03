import { describe, expect, it } from 'vitest'
import { filterPolyNotes, type RawPolyNote } from '../lib/audio/polyFilter'

const note = (pitchMidi: number, amplitude: number, start = 0): RawPolyNote => ({
  pitchMidi,
  amplitude,
  startTimeSeconds: start,
  durationSeconds: 0.5,
})

describe('filterPolyNotes', () => {
  it('keeps a clean chord (real Basic Pitch output for synthetic C major)', () => {
    // Amplitudes observed when running the model on a synthesized C4-E4-G4 chord
    const raw = [note(67, 0.69), note(64, 0.73), note(60, 0.58), note(86, 0.36), note(76, 0.34)]
    const kept = filterPolyNotes(raw).map((n) => n.pitchMidi)
    expect(kept.sort()).toEqual([60, 64, 67])
  })

  it('drops the octave ghost of a loud note even above the amplitude floor', () => {
    const raw = [note(60, 0.9), note(72, 0.45)]
    expect(filterPolyNotes(raw).map((n) => n.pitchMidi)).toEqual([60])
  })

  it('keeps a real octave doubling of similar loudness', () => {
    const raw = [note(60, 0.7), note(72, 0.65)]
    expect(filterPolyNotes(raw).map((n) => n.pitchMidi)).toEqual([60, 72])
  })

  it('does not treat notes far apart in time as harmonics', () => {
    const raw = [note(60, 0.9, 0), note(72, 0.5, 1.0)]
    expect(filterPolyNotes(raw).map((n) => n.pitchMidi)).toEqual([60, 72])
  })
})
