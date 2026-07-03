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

async function withPlayingFlag(durationSec: number): Promise<void> {
  isPlaying = true
  // extra 300ms tail so mic detection does not pick up the release
  await new Promise((r) => setTimeout(r, durationSec * 1000 + 300))
  isPlaying = false
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
