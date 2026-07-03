import * as Tone from 'tone'

/**
 * Metronome click via Tone.Transport. Deliberately does NOT set the
 * playback.isPlaying flag — detection keeps running while it ticks; the click
 * is too short and inharmonic to register as a note.
 *
 * For timed grading it exposes a wall-clock anchor: beat 0 is the first beat
 * after the count-in, and getAnchorMs() returns its performance.now() time.
 */
export type BeatListener = (beatIndex: number, tMs: number) => void

let synth: Tone.Synth | null = null
let eventId: number | null = null
let beatCounter = 0
let countIn = 0
let anchorMs: number | null = null

const beatListeners = new Set<BeatListener>()

export function onBeat(fn: BeatListener): () => void {
  beatListeners.add(fn)
  return () => beatListeners.delete(fn)
}

/** Wall-clock ms of beat 0 (set once the count-in finishes); null until then. */
export function getAnchorMs(): number | null {
  return anchorMs
}

export async function startMetronome(bpm: number, opts: { countInBeats?: number } = {}): Promise<void> {
  await Tone.start()
  if (!synth) {
    synth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.02 },
    }).toDestination()
    synth.volume.value = -14
  }
  stopMetronome()
  countIn = opts.countInBeats ?? 0
  beatCounter = 0
  anchorMs = null
  const transport = Tone.getTransport()
  transport.bpm.value = bpm
  eventId = transport.scheduleRepeat((time) => {
    const beatIndex = beatCounter - countIn // negative during count-in
    // Count-in clicks are higher so the ear locks onto the change at beat 0.
    synth!.triggerAttackRelease(beatIndex < 0 ? 'G6' : 'C6', '64n', time)
    // Convert the scheduled audio time to the wall clock shared with NoteEvent.tMs.
    const tMs = performance.now() + (time - Tone.getContext().currentTime) * 1000
    if (beatIndex === 0) anchorMs = tMs
    beatListeners.forEach((fn) => fn(beatIndex, tMs))
    beatCounter++
  }, '4n')
  transport.start()
}

export function setMetronomeBpm(bpm: number): void {
  Tone.getTransport().bpm.value = bpm
}

export function stopMetronome(): void {
  const transport = Tone.getTransport()
  transport.stop()
  if (eventId !== null) {
    transport.clear(eventId)
    eventId = null
  }
}
