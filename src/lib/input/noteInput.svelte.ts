import { mic } from '../audio/mic.svelte'
import { monoPitch, onNoteEvent, startMonoDetection, stopMonoDetection } from '../audio/monoPitch.svelte'
import type { NoteEvent, NoteEventListener } from '../audio/noteEvents'
import { onPolyEvent, polyPitch, startPolyDetection, stopPolyDetection } from '../audio/polyPitch.svelte'
import { midi, onMidiEvent } from './midi.svelte'
import { chooseSource, shouldForward, type ActiveSource } from './routing'

/**
 * Unified note-input hub: one subscription point over MIDI, mic-mono and
 * mic-poly. Screens call start('mono' | 'poly') with the detector they'd
 * want *if* the mic is used; when a MIDI keyboard is connected it is always
 * preferred and the mic never starts.
 */
let active = $state<ActiveSource>('none')
let midiNotes = $state(new Set<number>())

const listeners = new Set<NoteEventListener>()

function emit(ev: NoteEvent) {
  if (!shouldForward(ev.source, active)) return
  listeners.forEach((fn) => fn(ev))
}

onMidiEvent((ev) => {
  // Track held keys regardless of routing so the keyboard display is live.
  if (ev.kind === 'on') midiNotes = new Set([...midiNotes, ev.midi])
  else midiNotes = new Set([...midiNotes].filter((m) => m !== ev.midi))
  emit(ev)
})
onNoteEvent(emit)
onPolyEvent(emit)

export function onInput(fn: NoteEventListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

async function start(preferred: 'mono' | 'poly'): Promise<void> {
  const source = chooseSource(midi.hasInput, preferred)
  if (source === 'midi') {
    active = 'midi'
    return
  }
  await startMonoDetection()
  if (mic.status !== 'running') return // denied or errored; stay 'none'
  if (source === 'mic-poly') await startPolyDetection()
  active = source
}

function stop(): void {
  if (active === 'mic-poly') stopPolyDetection()
  if (active === 'mic-mono' || active === 'mic-poly') stopMonoDetection()
  active = 'none'
}

export const noteInput = {
  get activeSource() {
    return active
  },
  get listening() {
    return active !== 'none'
  },
  /** Currently sounding/held notes for keyboard display (union view on mic). */
  get activeNotes(): Set<number> {
    if (active === 'midi') return midiNotes
    const s = new Set<number>()
    if (monoPitch.midi !== null) s.add(monoPitch.midi)
    if (active === 'mic-poly') for (const m of polyPitch.activeNotes) s.add(m)
    return s
  },
  start,
  stop,
}
