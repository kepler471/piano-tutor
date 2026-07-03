import { describe, expect, it } from 'vitest'
import { MonoTracker } from '../lib/audio/monoTracker'
import { midiToFrequency } from '../lib/audio/noteEvents'
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

/** Run audio through the tracker exactly as the live loop does. */
function detect(audio: Float32Array<ArrayBuffer>): number[] {
  const tracker = new MonoTracker({ frameSize: FRAME })
  const onsets: number[] = []
  for (let off = 0; off + FRAME <= audio.length; off += FRAME / 2) {
    const frame = audio.slice(off, off + FRAME)
    for (const ev of tracker.process(frame, SAMPLE_RATE, off / SAMPLE_RATE)) {
      if (ev.kind === 'on') onsets.push(ev.midi)
    }
  }
  return onsets
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
