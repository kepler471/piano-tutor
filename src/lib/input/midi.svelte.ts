import type { NoteEventListener } from '../audio/noteEvents'
import { parseMidiMessage } from './midiParse'

/**
 * Web MIDI input: device discovery, hot-plug handling, and a NoteEvent
 * stream from the selected device. Chromium-only today — `supported` is
 * false elsewhere and the UI hides all MIDI affordances.
 */
export type MidiStatus = 'idle' | 'unsupported' | 'requesting' | 'ready' | 'denied' | 'error'

export interface MidiInputInfo {
  id: string
  name: string
}

const AUTO_ENABLE_KEY = 'piano-tutor.midi-enabled'

const supported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator

let status = $state<MidiStatus>(supported ? 'idle' : 'unsupported')
let errorMessage = $state('')
let inputs = $state<MidiInputInfo[]>([])
let selectedId = $state<string | null>(null)

let access: MIDIAccess | null = null

const listeners = new Set<NoteEventListener>()

export function onMidiEvent(fn: NoteEventListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function handleMessage(e: Event) {
  const msg = e as MIDIMessageEvent
  if ((msg.target as MIDIInput).id !== selectedId) return
  const ev = parseMidiMessage(msg.data, msg.timeStamp)
  if (ev) listeners.forEach((fn) => fn(ev))
}

function refreshInputs() {
  if (!access) return
  const list = [...access.inputs.values()]
  inputs = list.map((i) => ({ id: i.id, name: i.name || 'MIDI device' }))
  // One handler on every port; it filters by the selected id, so switching
  // devices is pure state with no re-wiring.
  for (const input of list) input.onmidimessage = handleMessage
  if (selectedId && !list.some((i) => i.id === selectedId)) selectedId = null
  if (!selectedId && list.length > 0) selectedId = list[0].id
}

async function enable(): Promise<void> {
  if (!supported || status === 'ready' || status === 'requesting') return
  status = 'requesting'
  errorMessage = ''
  try {
    access = await navigator.requestMIDIAccess()
    access.onstatechange = refreshInputs
    refreshInputs()
    status = 'ready'
    localStorage.setItem(AUTO_ENABLE_KEY, '1')
  } catch (err) {
    access = null
    if (err instanceof DOMException && err.name === 'SecurityError') {
      status = 'denied'
      errorMessage = 'MIDI access was denied. Allow it in your browser settings and try again.'
    } else {
      status = 'error'
      errorMessage = err instanceof Error ? err.message : String(err)
    }
  }
}

/** Re-request access silently if the user has used MIDI here before. */
async function autoEnable(): Promise<void> {
  if (supported && status === 'idle' && localStorage.getItem(AUTO_ENABLE_KEY)) await enable()
}

export const midi = {
  get supported() {
    return supported
  },
  get status() {
    return status
  },
  get errorMessage() {
    return errorMessage
  },
  get inputs() {
    return inputs
  },
  get selectedId() {
    return selectedId
  },
  set selectedId(id: string | null) {
    selectedId = id
  },
  /** True when a device is connected and selected — the hub prefers MIDI then. */
  get hasInput() {
    return status === 'ready' && selectedId !== null
  },
  enable,
  autoEnable,
}
