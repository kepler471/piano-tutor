import { describe, expect, it } from 'vitest'
import { MonoTracker } from '../lib/audio/monoTracker'
import { midiToFrequency, type NoteEvent } from '../lib/audio/noteEvents'
import { clusterOnsets } from '../lib/transcribe/cluster'

const SAMPLE_RATE = 44100
const FRAME = 2048

/** Piano-ish tone: fundamental + decaying harmonics + exponential envelope. */
function synthNote(midi: number, seconds: number): Float32Array<ArrayBuffer> {
  const freq = midiToFrequency(midi)
  const n = Math.floor(seconds * SAMPLE_RATE)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    const env = Math.exp(-t * 1.5) * Math.min(1, t * 200)
    out[i] =
      env *
      (0.6 * Math.sin(2 * Math.PI * freq * t) +
        0.25 * Math.sin(2 * Math.PI * 2 * freq * t) +
        0.1 * Math.sin(2 * Math.PI * 3 * freq * t))
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

/** Run audio through the tracker exactly as the live loop does. */
function detectEvents(audio: Float32Array<ArrayBuffer>): NoteEvent[] {
  const tracker = new MonoTracker({ frameSize: FRAME })
  const events: NoteEvent[] = []
  for (let off = 0; off + FRAME <= audio.length; off += FRAME / 2) {
    const frame = audio.slice(off, off + FRAME)
    events.push(...tracker.process(frame, SAMPLE_RATE, off / SAMPLE_RATE))
  }
  return events
}

function detect(audio: Float32Array<ArrayBuffer>): number[] {
  return detectEvents(audio)
    .filter((ev) => ev.kind === 'on')
    .map((ev) => ev.midi)
}

describe('mono detection on synthesized audio', () => {
  it('detects a single A4 accurately', () => {
    const tracker = new MonoTracker({ frameSize: FRAME })
    const audio = synthNote(69, 0.5)
    let detected: number | null = null
    for (let off = 0; off + FRAME <= audio.length; off += FRAME / 2) {
      tracker.process(audio.slice(off, off + FRAME), SAMPLE_RATE, off / SAMPLE_RATE)
      if (tracker.state.midi !== null) detected = tracker.state.midi
    }
    expect(detected).toBe(69)
    expect(Math.abs(tracker.state.cents)).toBeLessThan(10)
  })

  it('detects an ascending C major scale in order', () => {
    const scaleMidis = [60, 62, 64, 65, 67, 69, 71, 72]
    const audio = concat(scaleMidis.flatMap((m) => [synthNote(m, 0.4), silence(0.15)]))
    expect(detect(audio)).toEqual(scaleMidis)
  })

  it('detects low and high registers', () => {
    expect(detect(concat([synthNote(48, 0.6)]))).toEqual([48]) // C3
    expect(detect(concat([synthNote(84, 0.6)]))).toEqual([84]) // C6
  })

  it('emits nothing for silence', () => {
    expect(detect(silence(1.0))).toEqual([])
  })
})

describe('mono detection in noise (adaptive noise floor)', () => {
  it('detects a scale through moderate white noise', () => {
    const scaleMidis = [60, 62, 64, 65, 67, 69, 71, 72]
    const clean = concat(scaleMidis.flatMap((m) => [synthNote(m, 0.4), silence(0.15)]))
    const noisy = mix(clean, whiteNoise(clean.length / SAMPLE_RATE, 0.01))
    expect(detect(noisy)).toEqual(scaleMidis)
  })

  it('emits nothing for white noise alone', () => {
    expect(detect(whiteNoise(3, 0.05))).toEqual([])
  })

  it('silences steady mains hum once the floor adapts', () => {
    // 60 Hz hum at RMS ~0.021 — loud enough to read as a clear B1 forever
    // under a fixed 0.004 gate. The adaptive floor must gate it; at most one
    // short-lived false note may slip through before the first blocks close.
    const events = detectEvents(hum(5, 0.03))
    const ons = events.filter((ev) => ev.kind === 'on')
    const offs = events.filter((ev) => ev.kind === 'off')
    expect(ons.length).toBeLessThanOrEqual(1)
    expect(ons.filter((ev) => ev.t > 2.5)).toEqual([])
    expect(offs.length).toBe(ons.length)
  })

  it('still detects a note after the floor has adapted to room noise', () => {
    const noise = whiteNoise(3.5, 0.01)
    const note = concat([silence(1.5), synthNote(60, 0.8)])
    expect(detect(mix(noise, note))).toEqual([60])
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
