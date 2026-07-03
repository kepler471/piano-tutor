import * as Tone from 'tone'
import { Note } from 'tonal'

const SALAMANDER_BASE = 'https://tonejs.github.io/audio/salamander/'

// Every third semitone is enough for Tone.Sampler to interpolate a full piano.
const SAMPLE_URLS: Record<string, string> = {}
for (const oct of [1, 2, 3, 4, 5, 6, 7]) {
  for (const pc of ['A', 'C', 'Ds', 'Fs']) {
    SAMPLE_URLS[`${pc.replace('s', '#')}${oct}`] = `${pc}${oct}.mp3`
  }
}
SAMPLE_URLS['A0'] = 'A0.mp3'
SAMPLE_URLS['C8'] = 'C8.mp3'

let sampler: Tone.Sampler | null = null
let loadPromise: Promise<void> | null = null

/** True while a demo is sounding — detection should ignore the mic during this. */
export let isPlaying = false

export function pianoReady(): boolean {
  return sampler !== null && sampler.loaded
}

/** Must be called from a user gesture (Safari AudioContext policy). */
export async function ensurePiano(): Promise<void> {
  await Tone.start()
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      sampler = new Tone.Sampler({
        urls: SAMPLE_URLS,
        baseUrl: SALAMANDER_BASE,
        release: 1,
        onload: () => resolve(),
        onerror: (err) => reject(err),
      }).toDestination()
    })
  }
  await loadPromise
}

function midiToName(midi: number): string {
  return Note.fromMidi(midi)
}

let gateHolds = 0

/**
 * Marks app audio (demo playback, spoken feedback) as sounding so the pitch
 * detectors ignore the mic. Returns a release function; the flag drops 300 ms
 * after the last hold releases so detection does not pick up the release tail.
 * `isPlaying` is a read-only live binding for importers — this is the only
 * way for other modules to raise it.
 */
export function acquireAudioGate(): () => void {
  gateHolds++
  isPlaying = true
  let released = false
  return () => {
    if (released) return
    released = true
    gateHolds--
    setTimeout(() => {
      if (gateHolds === 0) isPlaying = false
    }, 300)
  }
}

/** Best-effort immediate silence: releases all sounding sampler notes. */
export function stopAllPlayback(): void {
  sampler?.releaseAll()
}

async function withPlayingFlag(durationSec: number): Promise<void> {
  const release = acquireAudioGate()
  await new Promise((r) => setTimeout(r, durationSec * 1000))
  release()
}

export async function playNote(midi: number, duration = 0.6): Promise<void> {
  await ensurePiano()
  sampler!.triggerAttackRelease(midiToName(midi), duration)
  void withPlayingFlag(duration)
}

export async function playChord(
  midis: number[],
  opts: { arpeggiate?: boolean; duration?: number } = {},
): Promise<void> {
  await ensurePiano()
  const duration = opts.duration ?? 1.6
  const now = Tone.now()
  if (opts.arpeggiate) {
    midis.forEach((m, i) => {
      sampler!.triggerAttackRelease(midiToName(m), duration, now + i * 0.28)
    })
    await withPlayingFlag(duration + midis.length * 0.28)
  } else {
    sampler!.triggerAttackRelease(midis.map(midiToName), duration, now)
    await withPlayingFlag(duration)
  }
}

/** Plays note groups evenly at the given tempo (eighth notes) — for hands-together demos. */
export async function playChordSequence(groups: number[][], bpm = 92): Promise<void> {
  await ensurePiano()
  const step = 60 / bpm / 2
  const now = Tone.now()
  groups.forEach((midis, i) => {
    if (midis.length === 0) return
    sampler!.triggerAttackRelease(midis.map(midiToName), step * 0.95, now + i * step)
  })
  await withPlayingFlag(groups.length * step)
}

export interface PlayableNote {
  midi: number
  /** Absolute onset in beats */
  startBeat: number
  durationBeats: number
}

/**
 * Demo playback for songs: schedules every note at its beat time. With
 * swing, off-beat eighths land at 2/3 of the beat.
 */
export async function playSong(notes: PlayableNote[], bpm: number, swing = false): Promise<void> {
  await ensurePiano()
  const beatSec = 60 / bpm
  const swung = (beat: number) => {
    if (!swing) return beat
    const frac = beat - Math.floor(beat)
    return Math.abs(frac - 0.5) < 1e-6 ? Math.floor(beat) + 2 / 3 : beat
  }
  const now = Tone.now() + 0.05
  let endSec = 0
  for (const n of notes) {
    const start = swung(n.startBeat) * beatSec
    const dur = Math.max(0.1, n.durationBeats * beatSec * 0.95)
    sampler!.triggerAttackRelease(midiToName(n.midi), dur, now + start)
    endSec = Math.max(endSec, start + dur)
  }
  await withPlayingFlag(endSec + 0.05)
}

/** Plays notes evenly at the given tempo; resolves when the last note has ended. */
export async function playSequence(midis: number[], bpm = 92): Promise<void> {
  await ensurePiano()
  const step = 60 / bpm / 2 // eighth notes
  const now = Tone.now()
  midis.forEach((m, i) => {
    sampler!.triggerAttackRelease(midiToName(m), step * 0.95, now + i * step)
  })
  await withPlayingFlag(midis.length * step)
}
