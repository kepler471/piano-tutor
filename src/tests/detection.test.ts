import { describe, expect, it } from 'vitest'
import { MonoTracker } from '../lib/audio/monoTracker'
import { midiToFrequency, type NoteEvent } from '../lib/audio/noteEvents'
import { clusterOnsets } from '../lib/transcribe/cluster'

const SAMPLE_RATE = 44100
const FRAME = 2048
/** Hop matching the live setInterval polling cadence (~10 ms). */
const FAST_HOP = Math.round(SAMPLE_RATE * 0.01)

/** Piano-ish tone: fundamental + decaying harmonics + exponential envelope. */
function synthNote(midi: number, seconds: number, decay = 1.5): Float32Array<ArrayBuffer> {
  const freq = midiToFrequency(midi)
  const n = Math.floor(seconds * SAMPLE_RATE)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    const env = Math.exp(-t * decay) * Math.min(1, t * 200)
    out[i] =
      env *
      (0.6 * Math.sin(2 * Math.PI * freq * t) +
        0.25 * Math.sin(2 * Math.PI * 2 * freq * t) +
        0.1 * Math.sin(2 * Math.PI * 3 * freq * t))
  }
  return out
}

/** Steady 2048-sample tone frame (no envelope) for frame-level tracker tests. */
function toneFrame(midi: number): Float32Array<ArrayBuffer> {
  const freq = midiToFrequency(midi)
  const out = new Float32Array(FRAME)
  for (let i = 0; i < FRAME; i++) {
    const t = i / SAMPLE_RATE
    out[i] =
      0.6 * Math.sin(2 * Math.PI * freq * t) +
      0.25 * Math.sin(2 * Math.PI * 2 * freq * t) +
      0.1 * Math.sin(2 * Math.PI * 3 * freq * t)
  }
  return out
}

function silence(seconds: number): Float32Array<ArrayBuffer> {
  return new Float32Array(Math.floor(seconds * SAMPLE_RATE))
}

function concat(parts: Float32Array<ArrayBuffer>[]): Float32Array<ArrayBuffer> {
  const total = parts.reduce((a, p) => a + p.length, 0)
  const out = new Float32Array(total)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

/** Deterministic PRNG so noise tests never flake. */
function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function whiteNoise(seconds: number, amp: number, seed = 1): Float32Array<ArrayBuffer> {
  const rand = mulberry32(seed)
  const out = new Float32Array(Math.floor(seconds * SAMPLE_RATE))
  for (let i = 0; i < out.length; i++) out[i] = (rand() * 2 - 1) * amp
  return out
}

function hum(seconds: number, amp: number, freq = 60): Float32Array<ArrayBuffer> {
  const out = new Float32Array(Math.floor(seconds * SAMPLE_RATE))
  for (let i = 0; i < out.length; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE)
  return out
}

function mix(a: Float32Array<ArrayBuffer>, b: Float32Array<ArrayBuffer>): Float32Array<ArrayBuffer> {
  const out = new Float32Array(Math.max(a.length, b.length))
  for (let i = 0; i < out.length; i++) out[i] = (a[i] ?? 0) + (b[i] ?? 0)
  return out
}

/** Overlap-add parts into one buffer at their start offsets (seconds). */
function placeAt(parts: { audio: Float32Array<ArrayBuffer>; atSec: number }[]): Float32Array<ArrayBuffer> {
  const total = Math.max(...parts.map((p) => Math.floor(p.atSec * SAMPLE_RATE) + p.audio.length))
  const out = new Float32Array(total)
  for (const p of parts) {
    const off = Math.floor(p.atSec * SAMPLE_RATE)
    for (let i = 0; i < p.audio.length; i++) out[off + i] += p.audio[i]
  }
  return out
}

/** Run audio through the tracker exactly as the live loop does. */
function detectEvents(audio: Float32Array<ArrayBuffer>, hop = FRAME / 2): NoteEvent[] {
  const tracker = new MonoTracker({ frameSize: FRAME })
  const events: NoteEvent[] = []
  for (let off = 0; off + FRAME <= audio.length; off += hop) {
    const frame = audio.slice(off, off + FRAME)
    events.push(...tracker.process(frame, SAMPLE_RATE, off / SAMPLE_RATE))
  }
  return events
}

function detect(audio: Float32Array<ArrayBuffer>, hop = FRAME / 2): number[] {
  return detectEvents(audio, hop)
    .filter((ev) => ev.kind === 'on')
    .map((ev) => ev.midi)
}

describe.each([
  ['23 ms hop', FRAME / 2],
  ['10 ms live cadence', FAST_HOP],
])('mono detection on synthesized audio (%s)', (_label, hop) => {
  it('detects a single A4 accurately', () => {
    const tracker = new MonoTracker({ frameSize: FRAME })
    const audio = synthNote(69, 0.5)
    let detected: number | null = null
    for (let off = 0; off + FRAME <= audio.length; off += hop) {
      tracker.process(audio.slice(off, off + FRAME), SAMPLE_RATE, off / SAMPLE_RATE)
      if (tracker.state.midi !== null) detected = tracker.state.midi
    }
    expect(detected).toBe(69)
    expect(Math.abs(tracker.state.cents)).toBeLessThan(10)
  })

  it('detects an ascending C major scale in order', () => {
    const scaleMidis = [60, 62, 64, 65, 67, 69, 71, 72]
    const audio = concat(scaleMidis.flatMap((m) => [synthNote(m, 0.4), silence(0.15)]))
    expect(detect(audio, hop)).toEqual(scaleMidis)
  })

  it('detects low and high registers', () => {
    expect(detect(concat([synthNote(48, 0.6)]), hop)).toEqual([48]) // C3
    expect(detect(concat([synthNote(84, 0.6)]), hop)).toEqual([84]) // C6
  })

  it('emits nothing for silence', () => {
    expect(detect(silence(1.0), hop)).toEqual([])
  })
})

describe.each([
  ['23 ms hop', FRAME / 2],
  ['10 ms live cadence', FAST_HOP],
])('mono detection in noise (adaptive noise floor, %s)', (_label, hop) => {
  it('detects a scale through moderate white noise', () => {
    const scaleMidis = [60, 62, 64, 65, 67, 69, 71, 72]
    const clean = concat(scaleMidis.flatMap((m) => [synthNote(m, 0.4), silence(0.15)]))
    const noisy = mix(clean, whiteNoise(clean.length / SAMPLE_RATE, 0.01))
    expect(detect(noisy, hop)).toEqual(scaleMidis)
  })

  it('emits nothing for white noise alone', () => {
    expect(detect(whiteNoise(3, 0.05), hop)).toEqual([])
  })

  it('silences steady mains hum once the floor adapts', () => {
    // 60 Hz hum at RMS ~0.021 — loud enough to read as a clear B1 forever
    // under a fixed 0.004 gate. The adaptive floor must gate it; at most one
    // short-lived false note may slip through before the first blocks close.
    const events = detectEvents(hum(5, 0.03), hop)
    const ons = events.filter((ev) => ev.kind === 'on')
    const offs = events.filter((ev) => ev.kind === 'off')
    expect(ons.length).toBeLessThanOrEqual(1)
    expect(ons.filter((ev) => ev.t > 2.5)).toEqual([])
    expect(offs.length).toBe(ons.length)
  })

  it('still detects a note after the floor has adapted to room noise', () => {
    const noise = whiteNoise(3.5, 0.01)
    const note = concat([silence(1.5), synthNote(60, 0.8)])
    expect(detect(mix(noise, note), hop)).toEqual([60])
  })
})

describe('fast playing (10 ms live cadence)', () => {
  // A brisk scale: 8 notes/sec, each note still ringing (decaying) under the
  // next — the situation that used to drop notes. Decay 8 models the damper
  // falling as the next key is struck (previous note at ~37% when the next
  // starts); decay 6 with short notes models a lighter, faster release.
  const scaleMidis = [60, 62, 64, 65, 67, 69, 71, 72]
  const NOTE_SPACING = 0.125

  function fastScale(decay: number, noteLen = 0.4): Float32Array<ArrayBuffer> {
    return placeAt(
      scaleMidis.map((m, i) => ({ audio: synthNote(m, noteLen, decay), atSec: i * NOTE_SPACING }))
    )
  }

  it('detects every note of an 8-notes/sec scale with realistic release tails', () => {
    expect(detect(fastScale(8.0), FAST_HOP)).toEqual(scaleMidis)
  })

  it('detects every note of an 8-notes/sec scale with light, short strokes', () => {
    expect(detect(fastScale(6.0, 0.25), FAST_HOP)).toEqual(scaleMidis)
  })

  // Frontier, deliberately skipped: with the previous keys HELD (no damper,
  // decay 1.5) 2–3 notes ring at comparable amplitude — genuinely polyphonic
  // content. MPM then reports the mixture's common period (deep subharmonics
  // like midi 24/31) and never sees the true pitch at all; no amount of
  // confirmation tuning can recover it. That material is what the poly
  // (Basic Pitch) detector is for.
  it.skip('legato scale with held keys — beyond monophonic MPM', () => {
    expect(detect(fastScale(1.5), FAST_HOP)).toEqual(scaleMidis)
  })

  it('confirms each onset within 100 ms of the key strike', () => {
    const ons = detectEvents(fastScale(8.0), FAST_HOP).filter((ev) => ev.kind === 'on')
    expect(ons).toHaveLength(scaleMidis.length)
    const latencies = ons.map((ev, i) => ev.t - i * NOTE_SPACING)
    for (const lat of latencies) {
      // Event t is stamped at the analysis-window START, so a confirmation
      // whose window straddles the strike can land slightly "early".
      expect(lat).toBeGreaterThan(-0.05)
      expect(lat).toBeLessThan(0.1)
    }
    const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length
    expect(mean).toBeLessThan(0.05)
  })
})

describe('octave-flicker protection (frame-level)', () => {
  // Drive the tracker with hand-built frames so the exact number of
  // octave-error frames is controlled. Frames are independent analyses, so
  // phase continuity between them does not matter.
  const HOP_SEC = 0.01

  function run(frames: Float32Array<ArrayBuffer>[]): NoteEvent[] {
    const tracker = new MonoTracker({ frameSize: FRAME })
    const events: NoteEvent[] = []
    frames.forEach((f, i) => events.push(...tracker.process(f, SAMPLE_RATE, i * HOP_SEC)))
    return events
  }

  const ons = (events: NoteEvent[]) => events.filter((ev) => ev.kind === 'on').map((ev) => ev.midi)

  it('a 2-frame octave-error burst over a sounding note emits no false onset', () => {
    const frames = [
      ...Array.from({ length: 20 }, () => toneFrame(60)),
      toneFrame(72),
      toneFrame(72),
      ...Array.from({ length: 20 }, () => toneFrame(60)),
    ]
    expect(ons(run(frames))).toEqual([60])
  })

  it('a sustained octave jump still registers after full confirmation', () => {
    const frames = [
      ...Array.from({ length: 20 }, () => toneFrame(60)),
      ...Array.from({ length: 20 }, () => toneFrame(72)),
    ]
    expect(ons(run(frames))).toEqual([60, 72])
  })

  it('one dropout frame mid-confirmation does not restart the count', () => {
    // valid, invalid, valid, valid: with a 1-frame grace the note confirms on
    // the 4th frame; without it, confirmation restarts and needs two more.
    const zeros = new Float32Array(FRAME)
    const frames = [toneFrame(64), zeros, toneFrame(64), toneFrame(64)]
    expect(ons(run(frames))).toEqual([64])
  })

  it('a fresh note after silence still needs full confirmation', () => {
    // Two valid frames after a cold start must not fire an onset — the fast
    // path only applies when a reference note is (or was just) sounding.
    const frames = [...Array.from({ length: 10 }, () => new Float32Array(FRAME)), toneFrame(64), toneFrame(64)]
    expect(ons(run(frames))).toEqual([])
  })
})

describe('onset clustering (Tier A transcription)', () => {
  it('groups near-simultaneous onsets into a chord', () => {
    const clustered = clusterOnsets([
      { midi: 60, t: 1.0 },
      { midi: 64, t: 1.03 },
      { midi: 67, t: 1.06 },
      { midi: 72, t: 2.0 },
    ])
    expect(clustered).toHaveLength(2)
    expect(clustered[0].midis).toEqual([60, 64, 67])
    expect(clustered[1].midis).toEqual([72])
  })

  it('deduplicates repeated midis inside a cluster and sorts input by time', () => {
    const clustered = clusterOnsets([
      { midi: 64, t: 1.02 },
      { midi: 60, t: 1.0 },
      { midi: 60, t: 1.04 },
    ])
    expect(clustered).toHaveLength(1)
    expect(clustered[0].midis).toEqual([60, 64])
  })
})
