import { clusterOnsets, type Onset } from './cluster'

/**
 * Tier B transcription: metronome-locked recording quantized to an 8th-note
 * grid. Onsets snap to the nearest grid slot; each note lasts until the next
 * occupied slot (capped at a half note); gaps become rests; bars follow the
 * time signature.
 */
export interface QuantizedEvent {
  /** Empty array = rest */
  midis: number[]
  /** VexFlow duration: '8' | 'q' | 'h' (+'r' suffix handled by midis=[]) */
  duration: '8' | 'q' | 'h'
  /** true = this event is followed by a barline */
  endsBar?: boolean
}

const STEP_DURATIONS: [number, '8' | 'q' | 'h'][] = [
  [4, 'h'],
  [2, 'q'],
  [1, '8'],
]

export function quantizeToGrid(
  onsets: Onset[],
  bpm: number,
  beatsPerBar = 4,
  clusterWindowSec = 0.08,
): QuantizedEvent[] {
  if (!onsets.length) return []
  const stepSec = 60 / bpm / 2 // 8th-note grid
  const stepsPerBar = beatsPerBar * 2

  // Snap clusters to grid slots (first onset defines nothing — times are
  // already relative to the recording start).
  const slots = new Map<number, number[]>()
  for (const c of clusterOnsets(onsets, clusterWindowSec)) {
    const slot = Math.max(0, Math.round(c.t / stepSec))
    const existing = slots.get(slot)
    slots.set(slot, existing ? [...new Set([...existing, ...c.midis])].sort((a, b) => a - b) : c.midis)
  }

  const occupied = [...slots.keys()].sort((a, b) => a - b)
  const lastSlot = occupied[occupied.length - 1]
  const totalSlots = Math.ceil((lastSlot + 2) / stepsPerBar) * stepsPerBar

  const out: QuantizedEvent[] = []
  let slot = 0
  while (slot < totalSlots) {
    // room: until the next occupied slot, without crossing the barline
    const next = occupied.find((s) => s > slot) ?? totalSlots
    const barEnd = (Math.floor(slot / stepsPerBar) + 1) * stepsPerBar
    const room = Math.min(next, barEnd) - slot
    const [steps, duration] = STEP_DURATIONS.find(([s]) => s <= room)!
    out.push({
      midis: slots.get(slot) ?? [],
      duration,
      endsBar: slot + steps === barEnd,
    })
    slot += steps
  }
  return out
}
