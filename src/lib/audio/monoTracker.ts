import { PitchDetector } from 'pitchy'
import { frequencyToMidi, type NoteEvent } from './noteEvents'

export interface MonoTrackerOptions {
  frameSize?: number
  minClarity?: number
  minRms?: number
  confirmFrames?: number
  releaseFrames?: number
}

export interface MonoState {
  midi: number | null
  freq: number | null
  cents: number
  clarity: number
  rms: number
}

const MIDI_MIN = 21
const MIDI_MAX = 108

/**
 * Monophonic note tracker: feed it fixed-size audio frames, it emits note
 * on/off events. Pure logic — the same code path runs on live mic frames and
 * on synthesized audio in tests. A note is accepted only after `confirmFrames`
 * consecutive detections of the same MIDI number with sufficient clarity,
 * which suppresses octave flicker from piano harmonics.
 */
export class MonoTracker {
  private detector: PitchDetector<Float32Array<ArrayBuffer>>
  private minClarity: number
  private minRms: number
  private confirmFrames: number
  private releaseFrames: number

  private candidateMidi: number | null = null
  private candidateCount = 0
  private missCount = 0

  readonly state: MonoState = { midi: null, freq: null, cents: 0, clarity: 0, rms: 0 }

  constructor(opts: MonoTrackerOptions = {}) {
    this.detector = PitchDetector.forFloat32Array(opts.frameSize ?? 2048)
    this.minClarity = opts.minClarity ?? 0.88
    this.minRms = opts.minRms ?? 0.004
    this.confirmFrames = opts.confirmFrames ?? 3
    this.releaseFrames = opts.releaseFrames ?? 6
  }

  /** Drop any pending note (e.g. while demo playback is sounding). */
  reset(t: number): NoteEvent[] {
    this.candidateMidi = null
    this.candidateCount = 0
    this.missCount = 0
    return this.endNote(t)
  }

  private endNote(t: number): NoteEvent[] {
    if (this.state.midi === null) return []
    const ev: NoteEvent = {
      kind: 'off',
      midi: this.state.midi,
      t,
      confidence: this.state.clarity,
      source: 'mono',
    }
    this.state.midi = null
    this.state.freq = null
    return [ev]
  }

  process(frame: Float32Array<ArrayBuffer>, sampleRate: number, t: number): NoteEvent[] {
    let sum = 0
    for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i]
    const rms = Math.sqrt(sum / frame.length)
    this.state.rms = rms

    const [freq, clarity] = this.detector.findPitch(frame, sampleRate)
    this.state.clarity = clarity

    const { midi, cents } = frequencyToMidi(freq)
    const valid = clarity >= this.minClarity && rms >= this.minRms && midi >= MIDI_MIN && midi <= MIDI_MAX

    if (!valid) {
      this.candidateMidi = null
      this.candidateCount = 0
      this.missCount++
      return this.missCount >= this.releaseFrames ? this.endNote(t) : []
    }

    this.missCount = 0
    if (midi === this.state.midi) {
      this.state.freq = freq
      this.state.cents = cents
      return []
    }
    if (midi === this.candidateMidi) {
      this.candidateCount++
      if (this.candidateCount >= this.confirmFrames) {
        const events = this.endNote(t)
        this.candidateMidi = null
        this.candidateCount = 0
        this.state.midi = midi
        this.state.freq = freq
        this.state.cents = cents
        events.push({ kind: 'on', midi, t, confidence: clarity, cents, source: 'mono' })
        return events
      }
    } else {
      this.candidateMidi = midi
      this.candidateCount = 1
    }
    return []
  }
}
