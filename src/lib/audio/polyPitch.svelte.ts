import { mic } from './mic.svelte'
import type { NoteEvent, NoteEventListener } from './noteEvents'
import * as playback from './playback'
import { Resampler } from './resample'

/** Served from public/ — audioWorklet.addModule needs a real same-origin URL. */
const captureProcessorUrl = '/worklets/capture-processor.js'

/**
 * Main-thread facade over the Basic Pitch worker. Streams mic audio
 * (resampled to 22050 Hz) to the worker and re-emits detected notes as
 * NoteEvents. Detection runs 0.5–1.5 s behind real time — fine for chord
 * checking and transcription; the mono path covers instant feedback.
 */
export type PolyStatus = 'idle' | 'loading' | 'listening' | 'error'

let status = $state<PolyStatus>('idle')
let backend = $state('')
let errorMessage = $state('')
let activeNotes = $state(new Set<number>())
let lastInferMs = $state(0)

let worker: Worker | null = null
let workletNode: AudioWorkletNode | null = null
let resampler: Resampler | null = null
let workletModuleLoaded: AudioContext | null = null

const listeners = new Set<NoteEventListener>()

export function onPolyEvent(fn: NoteEventListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emit(ev: NoteEvent) {
  listeners.forEach((fn) => fn(ev))
}

function handleWorkerMessage(e: MessageEvent) {
  const msg = e.data
  if (msg.type === 'ready') {
    backend = msg.backend
    if (status === 'loading') status = 'listening'
  } else if (msg.type === 'notes') {
    lastInferMs = msg.inferMs ?? 0
    for (const n of msg.notes) {
      emit({ kind: 'on', midi: n.midi, t: n.onset, confidence: n.amplitude, source: 'poly' })
      // display-only "sounding" set
      activeNotes = new Set([...activeNotes, n.midi])
      const midi = n.midi
      setTimeout(
        () => {
          activeNotes = new Set([...activeNotes].filter((m) => m !== midi))
        },
        Math.max(300, Math.min(2000, n.duration * 1000)),
      )
    }
  } else if (msg.type === 'error') {
    status = 'error'
    errorMessage = msg.message
  }
}

export async function startPolyDetection(): Promise<void> {
  if (status === 'loading' || status === 'listening') return
  await mic.start()
  const ctx = mic.audioContext
  const source = mic.source
  if (!ctx || !source || mic.status !== 'running') return

  status = 'loading'
  errorMessage = ''

  if (!worker) {
    worker = new Worker(new URL('./basicPitch.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = handleWorkerMessage
    worker.onerror = (e) => {
      status = 'error'
      errorMessage = e.message || 'Worker failed to load'
    }
  }

  if (workletModuleLoaded !== ctx) {
    await ctx.audioWorklet.addModule(captureProcessorUrl)
    workletModuleLoaded = ctx
  }
  resampler = new Resampler(ctx.sampleRate, 22050)
  workletNode = new AudioWorkletNode(ctx, 'capture-processor')
  workletNode.port.onmessage = (e: MessageEvent) => {
    if (!worker || playback.isPlaying) return
    const samples = resampler!.push(e.data as Float32Array)
    worker.postMessage({ type: 'chunk', samples }, [samples.buffer])
  }
  source.connect(workletNode)
  // If the worker already reported ready earlier, we're listening now.
  if (backend) status = 'listening'
}

export function stopPolyDetection(): void {
  workletNode?.disconnect()
  workletNode = null
  resampler = null
  activeNotes = new Set()
  if (status !== 'error') status = 'idle'
}

export const polyPitch = {
  get status() {
    return status
  },
  get backend() {
    return backend
  },
  get errorMessage() {
    return errorMessage
  },
  get activeNotes() {
    return activeNotes
  },
  get lastInferMs() {
    return lastInferMs
  },
}
