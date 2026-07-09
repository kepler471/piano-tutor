import { PitchDetector } from 'pitchy'
import { NoiseFloor } from './noiseFloor'
import { frequencyToMidi, type NoteEvent } from './noteEvents'

export interface MonoTrackerOptions {
  frameSize?: number
  minClarity?: number
  minRms?: number
  confirmFrames?: number
  fastConfirmFrames?: number
  confirmGraceFrames?: number
  octaveMemorySec?: number
  releaseFrames?: number
  noiseFloorK?: number
  /** Tuning reference in Hz (default 440) — see settings.a4. */
  a4?: number
}

export interface MonoState {
  midi: number | null
  freq: number | null
  cents: number
  clarity: number
  rms: number
  noiseFloor: number
}

const MIDI_MIN = 21
const MIDI_MAX = 108

/**
 * Monophonic note tracker: feed it fixed-size audio frames, it emits note
 * on/off events. Pure logic — the same code path runs on live mic frames and
 * on synthesized audio in tests. A note is accepted only after several
 * consecutive detections of the same MIDI number with sufficient clarity,
 * which suppresses octave flicker from piano harmonics. The confirmation is
 * two-tier: candidates at harmonically suspect intervals from the note that
 * is (or just was) sounding — octave/fifth-related or a large leap (see
 * `requiredConfirms`) — need the full `confirmFrames`, anything else — e.g.
 * the next scale step — confirms after `fastConfirmFrames`. One
 * low-clarity frame mid-confirmation (`confirmGraceFrames`) holds the
 * candidate instead of restarting the count, so a glitchy transition frame
 * can't double the latency.
 */
export class MonoTracker {
  private detector: PitchDetector<Float32Array<ArrayBuffer>>
  private minClarity: number
  private minRms: number
  private confirmFrames: number
  private fastConfirmFrames: number
  private confirmGraceFrames: number
  private octaveMemorySec: number
  private releaseFrames: number
  private noiseFloorK: number
  private a4: number
  private noiseFloor = new NoiseFloor()

  private candidateMidi: number | null = null
  private candidateCount = 0
  private graceUsed = 0
  private missCount = 0
  private lastOffMidi: number | null = null
  private lastOffT = -Infinity

  readonly state: MonoState = { midi: null, freq: null, cents: 0, clarity: 0, rms: 0, noiseFloor: 0 }

  constructor(opts: MonoTrackerOptions = {}) {
    this.detector = PitchDetector.forFloat32Array(opts.frameSize ?? 2048)
    this.minClarity = opts.minClarity ?? 0.88
    this.minRms = opts.minRms ?? 0.004
    this.confirmFrames = opts.confirmFrames ?? 3
    this.fastConfirmFrames = opts.fastConfirmFrames ?? 2
    this.confirmGraceFrames = opts.confirmGraceFrames ?? 1
    this.octaveMemorySec = opts.octaveMemorySec ?? 0.5
    this.releaseFrames = opts.releaseFrames ?? 6
    this.noiseFloorK = opts.noiseFloorK ?? 2.5
    this.a4 = opts.a4 ?? 440
  }

  /**
   * Drop any pending note (e.g. while demo playback is sounding). Does NOT
   * reset the noise floor — the ambient estimate stays valid across playback
   * pauses (the floor just closes its stale block on the next frame).
   */
  reset(t: number): NoteEvent[] {
    this.candidateMidi = null
    this.candidateCount = 0
    this.graceUsed = 0
    this.missCount = 0
    const events = this.endNote(t)
    // A note that ended because playback muted the mic must not act as an
    // octave reference when listening resumes.
    this.lastOffMidi = null
    return events
  }

  private endNote(t: number): NoteEvent[] {
    if (this.state.midi === null) return []
    this.lastOffMidi = this.state.midi
    this.lastOffT = t
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

  /**
   * MPM's failure modes relative to the note that is (or was just) sounding
   * are harmonically related: octave multiples (±12/±24/±36…), twelfths and
   * fifth-locks (±19, ±31, ±7 — period × or ÷ 3/2), and, when two notes ring
   * together, far subharmonics of the mixture's common period. All of those
   * are either octave/fifth-related mod 12 or big leaps, so they keep the
   * full `confirmFrames`. Small non-harmonic intervals — scale steps, thirds,
   * sixths, i.e. actual fast melodic playing — confirm after
   * `fastConfirmFrames`. With no reference (cold start), keep full
   * protection: the attack transient is exactly when the detector is least
   * trustworthy.
   */
  private requiredConfirms(midi: number, t: number): number {
    const ref =
      this.state.midi ?? (t - this.lastOffT <= this.octaveMemorySec ? this.lastOffMidi : null)
    if (ref === null) return this.confirmFrames
    const d = Math.abs(midi - ref)
    const suspect = d > 9 || d % 12 === 0 || d % 12 === 7
    return suspect ? this.confirmFrames : this.fastConfirmFrames
  }

  process(frame: Float32Array<ArrayBuffer>, sampleRate: number, t: number): NoteEvent[] {
    let sum = 0
    for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i]
    const rms = Math.sqrt(sum / frame.length)
    this.state.rms = rms

    // Adaptive gate: steady room noise (hum, fans) raises the RMS floor so it
    // can't register as notes. Limitation: strongly periodic noise can still
    // slip through as one false note during the first ~1.5 s, before the
    // floor's first blocks complete — a strict improvement over a fixed gate
    // (which lets it through forever), and safer than starting the floor high,
    // which would swallow the user's first note.
    this.noiseFloor.update(rms, t)
    this.state.noiseFloor = this.noiseFloor.floor
    const effMinRms = Math.max(this.minRms, this.noiseFloorK * this.noiseFloor.floor)

    const [freq, clarity] = this.detector.findPitch(frame, sampleRate)
    this.state.clarity = clarity

    const { midi, cents } = frequencyToMidi(freq, this.a4)
    const valid = clarity >= this.minClarity && rms >= effMinRms && midi >= MIDI_MIN && midi <= MIDI_MAX

    if (!valid) {
      this.missCount++
      const events = this.missCount >= this.releaseFrames ? this.endNote(t) : []
      // Grace preserves the candidate only; the note-off release logic above
      // is independent — grace is about confirmation continuity, not sustain.
      if (this.candidateMidi !== null && this.graceUsed < this.confirmGraceFrames) {
        this.graceUsed++ // hold the candidate; candidateCount does NOT advance
      } else {
        this.candidateMidi = null
        this.candidateCount = 0
        this.graceUsed = 0
      }
      return events
    }

    this.missCount = 0
    if (midi === this.state.midi) {
      this.state.freq = freq
      this.state.cents = cents
      return []
    }
    if (midi === this.candidateMidi) {
      this.candidateCount++
      if (this.candidateCount >= this.requiredConfirms(midi, t)) {
        const events = this.endNote(t)
        this.candidateMidi = null
        this.candidateCount = 0
        this.graceUsed = 0
        this.state.midi = midi
        this.state.freq = freq
        this.state.cents = cents
        events.push({ kind: 'on', midi, t, confidence: clarity, cents, source: 'mono' })
        return events
      }
    } else {
      // The grace budget is per candidate run — it is deliberately not
      // replenished by valid frames, or alternating valid/invalid frames
      // could confirm a note from 50% garbage.
      this.candidateMidi = midi
      this.candidateCount = 1
      this.graceUsed = 0
    }
    return []
  }
}
