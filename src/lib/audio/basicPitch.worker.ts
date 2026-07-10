/// <reference lib="webworker" />
/**
 * Polyphonic note detection worker: Spotify Basic Pitch on the TF.js WASM
 * backend. Basic Pitch is an offline model, so we adapt it to streaming with
 * sliding-window inference: every ~0.5 s of new audio, run the model over the
 * most recent 2 s window and emit notes not already reported.
 *
 * Protocol:
 *   in:  { type: 'chunk', samples: Float32Array }   // 22050 Hz mono
 *   out: { type: 'ready' }
 *        { type: 'notes', notes: [{ midi, onset, duration, amplitude }] }  // onset = absolute stream seconds
 *        { type: 'error', message: string }
 */
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import { BasicPitch, noteFramesToTime, outputToNotesPoly } from '@spotify/basic-pitch'
import { filterPolyNotes } from './polyFilter'
import { assetUrl } from '../assetUrl'

const SAMPLE_RATE = 22050
const WINDOW_SAMPLES = SAMPLE_RATE * 2 // 2 s
const HOP_SAMPLES = Math.floor(SAMPLE_RATE * 0.5) // rerun every 0.5 s of new audio
/** Notes starting this early in a window are truncated re-detections of older audio. */
const EDGE_SEC = 0.12
/** A note is "already emitted" if the same midi was reported within this distance. */
const DEDUP_SEC = 0.3

const ONSET_THRESH = 0.5
const FRAME_THRESH = 0.3
const MIN_NOTE_FRAMES = 5
/**
 * Skip inference on near-silent windows — below the post-filter ambient of
 * any usable room. This only saves CPU; the amplitude floor in polyFilter.ts
 * stays the detection gate.
 */
const SKIP_RMS = 0.002

let model: BasicPitch | null = null
let ring = new Float32Array(WINDOW_SAMPLES)
let ringFilled = 0
let totalSamples = 0
let newSinceRun = 0
let busy = false
const emitted: { midi: number; onset: number }[] = []

/**
 * tfjs 3.21's wasm Fill kernel crashes with "Unknown dtype undefined" when the
 * dtype attr is omitted — and tf.signal.frame's end-padding omits it, which
 * Basic Pitch hits on every window. Re-register the kernel with a default.
 */
function patchWasmFillKernel() {
  const fill = tf.getKernel('Fill', 'wasm')
  if (!fill) return
  tf.unregisterKernel('Fill', 'wasm')
  tf.registerKernel({
    kernelName: 'Fill',
    backendName: 'wasm',
    kernelFunc: (args) => {
      const attrs = args.attrs as { value?: unknown; dtype?: string }
      const dtype = attrs.dtype ?? (typeof attrs.value === 'string' ? 'string' : 'float32')
      return fill.kernelFunc({ ...args, attrs: { ...args.attrs, dtype } as typeof args.attrs })
    },
  })
}

async function init() {
  try {
    setWasmPaths(assetUrl('tfjs-wasm/'))
    try {
      await tf.setBackend('wasm')
    } catch {
      await tf.setBackend('cpu')
    }
    await tf.ready()
    patchWasmFillKernel()
    model = new BasicPitch(assetUrl('model/model.json'))
    // Warm-up: the first inference compiles kernels; do it on silence now
    // instead of on the user's first chord.
    await runModel(new Float32Array(SAMPLE_RATE))
    postMessage({ type: 'ready', backend: tf.getBackend() })
  } catch (err) {
    postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}

async function runModel(audio: Float32Array) {
  const frames: number[][] = []
  const onsets: number[][] = []
  await model!.evaluateModel(
    audio as Float32Array<ArrayBuffer>,
    (f, o) => {
      frames.push(...f)
      onsets.push(...o)
    },
    () => {},
  )
  return noteFramesToTime(outputToNotesPoly(frames, onsets, ONSET_THRESH, FRAME_THRESH, MIN_NOTE_FRAMES))
}

function pushSamples(samples: Float32Array) {
  if (samples.length >= ring.length) {
    ring.set(samples.subarray(samples.length - ring.length))
    ringFilled = ring.length
  } else {
    const keep = Math.min(ringFilled, ring.length - samples.length)
    ring.copyWithin(0, ringFilled - keep, ringFilled)
    ring.set(samples, keep)
    ringFilled = keep + samples.length
  }
  totalSamples += samples.length
  newSinceRun += samples.length
}

async function maybeInfer() {
  if (busy || !model || newSinceRun < HOP_SAMPLES || ringFilled < SAMPLE_RATE / 2) return
  busy = true
  newSinceRun = 0
  const window = ring.slice(0, ringFilled)
  let sum = 0
  for (let i = 0; i < window.length; i++) sum += window[i] * window[i]
  if (Math.sqrt(sum / window.length) < SKIP_RMS) {
    busy = false
    return
  }
  const windowStart = (totalSamples - ringFilled) / SAMPLE_RATE
  try {
    const t0 = performance.now()
    const notes = await runModel(window)
    const inferMs = performance.now() - t0

    const fresh: { midi: number; onset: number; duration: number; amplitude: number }[] = []
    for (const n of filterPolyNotes(notes)) {
      if (windowStart > 0 && n.startTimeSeconds < EDGE_SEC) continue
      const onset = windowStart + n.startTimeSeconds
      const dup = emitted.some((e) => e.midi === n.pitchMidi && Math.abs(e.onset - onset) < DEDUP_SEC)
      if (dup) continue
      emitted.push({ midi: n.pitchMidi, onset })
      fresh.push({
        midi: n.pitchMidi,
        onset,
        duration: n.durationSeconds,
        amplitude: n.amplitude,
      })
    }
    // keep the dedup list short
    const horizon = totalSamples / SAMPLE_RATE - 10
    while (emitted.length && emitted[0].onset < horizon) emitted.shift()

    if (fresh.length) postMessage({ type: 'notes', notes: fresh, inferMs })
  } catch (err) {
    postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  } finally {
    busy = false
    void maybeInfer()
  }
}

onmessage = (e: MessageEvent) => {
  const msg = e.data
  if (msg.type === 'chunk') {
    pushSamples(msg.samples as Float32Array)
    void maybeInfer()
  }
}

void init()
