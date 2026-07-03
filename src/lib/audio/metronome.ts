import * as Tone from 'tone'

/**
 * Metronome click via Tone.Transport. Deliberately does NOT set the
 * playback.isPlaying flag — detection keeps running while it ticks; the click
 * is too short and inharmonic to register as a note.
 */
let synth: Tone.Synth | null = null
let eventId: number | null = null

export async function startMetronome(bpm: number): Promise<void> {
  await Tone.start()
  if (!synth) {
    synth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.02 },
    }).toDestination()
    synth.volume.value = -14
  }
  const transport = Tone.getTransport()
  transport.bpm.value = bpm
  if (eventId === null) {
    eventId = transport.scheduleRepeat((time) => {
      synth!.triggerAttackRelease('C6', '64n', time)
    }, '4n')
  }
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
