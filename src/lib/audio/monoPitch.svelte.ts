import { settings } from '../settings.svelte'
import { mic } from './mic.svelte'
import { MonoTracker } from './monoTracker'
import type { NoteEvent, NoteEventListener } from './noteEvents'
import * as playback from './playback'

/**
 * Live monophonic detection: polls the mic AnalyserNode on a short interval
 * and feeds frames to a MonoTracker. Detection deliberately does NOT run on
 * requestAnimationFrame — rAF ties note latency to display refresh (and to
 * tab throttling), while a 10 ms interval keeps the tracker's confirmation
 * time low and steady. Only the reactive display state syncs on rAF, so
 * meters update at display rate without runes churning at 100 Hz.
 */
const FRAME_SIZE = 2048
const POLL_MS = 10

let running = $state(false)
let currentMidi = $state<number | null>(null)
let currentFreq = $state<number | null>(null)
let currentCents = $state(0)
let currentClarity = $state(0)
let level = $state(0)

let rafId = 0
let intervalId = 0
let tracker: MonoTracker | null = null
let buffer: Float32Array<ArrayBuffer> | null = null

const listeners = new Set<NoteEventListener>()

export function onNoteEvent(fn: NoteEventListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emitAll(events: NoteEvent[]) {
  const tMs = performance.now()
  for (const ev of events) {
    ev.tMs = tMs
    listeners.forEach((fn) => fn(ev))
  }
}

function syncState() {
  if (!tracker) return
  currentMidi = tracker.state.midi
  currentFreq = tracker.state.freq
  currentCents = tracker.state.cents
  currentClarity = tracker.state.clarity
  level = tracker.state.rms
}

function detectTick() {
  const analyser = mic.analyser
  const ctx = mic.audioContext
  if (!analyser || !ctx || !tracker || !buffer) return

  analyser.getFloatTimeDomainData(buffer)

  // Ignore the mic while the app itself is playing a demo through the speakers.
  // t is the audio clock: monotonic and immune to timer throttling, so the
  // tracker's noise-floor blocks and octave memory stay wall-clock correct.
  const events = playback.isPlaying
    ? tracker.reset(ctx.currentTime)
    : tracker.process(buffer, ctx.sampleRate, ctx.currentTime)

  emitAll(events)
}

function uiTick() {
  syncState()
  rafId = requestAnimationFrame(uiTick)
}

export async function startMonoDetection(): Promise<void> {
  await mic.start()
  if (mic.status !== 'running' || running) return
  // a4 is read at detection start; the Tuner restarts detection to apply it.
  tracker = new MonoTracker({ frameSize: FRAME_SIZE, a4: settings.a4 })
  buffer = new Float32Array(FRAME_SIZE)
  running = true
  intervalId = window.setInterval(detectTick, POLL_MS)
  rafId = requestAnimationFrame(uiTick)
}

export function stopMonoDetection(): void {
  clearInterval(intervalId)
  cancelAnimationFrame(rafId)
  running = false
  currentMidi = null
  currentFreq = null
  currentClarity = 0
  level = 0
  tracker = null
  mic.stop()
}

export const monoPitch = {
  get running() {
    return running
  },
  get midi() {
    return currentMidi
  },
  get freq() {
    return currentFreq
  },
  get cents() {
    return currentCents
  },
  get clarity() {
    return currentClarity
  },
  get level() {
    return level
  },
}
