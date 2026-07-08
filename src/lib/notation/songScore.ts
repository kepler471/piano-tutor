import { beatsPerMeasure, type Song, type SongNote } from '../data/songs/types'
import { songSlices, type SongStepOptions } from '../practice/songSteps'
import { durationFromBeats, midiToVexKeyInKey, type GrandScoreModel, type ScoreEvent } from './vexScore'

/**
 * Song → multi-system grand-staff notation. Each stave keeps its own true
 * rhythm (VexFlow aligns the voices by tick); every note event remembers
 * which matcher step it belongs to so the cursor can highlight it.
 */
export interface SongSystem {
  model: GrandScoreModel
  /** Per treble event: owning step index, or null for rests */
  trebleSteps: (number | null)[]
  bassSteps: (number | null)[]
  fromMeasure: number
  toMeasure: number
}

const REPRESENTABLE = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25]
const REST_CHUNKS = [4, 2, 1, 0.5, 0.25]
const EPS = 1e-6

function restEvents(span: number): ScoreEvent[] {
  const out: ScoreEvent[] = []
  let left = span
  while (left > EPS) {
    const c = REST_CHUNKS.find((c) => c <= left + EPS)
    if (!c) break
    const { duration, dots } = durationFromBeats(c)
    out.push({ keys: [], duration, dots, rest: true })
    left -= c
  }
  return out
}

/** Largest single notatable value ≤ the true duration (ties are v2). */
function displayDuration(beats: number): number {
  return REPRESENTABLE.find((c) => c <= beats + EPS) ?? 0.25
}

export function songSystems(
  song: Song,
  opts: SongStepOptions & { measuresPerSystem?: number; showFingering?: boolean },
): SongSystem[] {
  const bpm = beatsPerMeasure(song)
  const perSystem = opts.measuresPerSystem ?? 4
  const from = opts.fromMeasure ?? 0
  const to = Math.min(opts.toMeasure ?? song.measures.length - 1, song.measures.length - 1)

  // Map quantized absolute beat → step index (must mirror songSlices exactly).
  const slices = songSlices(song, opts)
  const stepIndexByBeat = new Map(slices.map((s, i) => [Math.round(s.startBeat * 64), i]))

  const systems: SongSystem[] = []
  for (let sysFrom = from; sysFrom <= to; sysFrom += perSystem) {
    const sysTo = Math.min(sysFrom + perSystem - 1, to)
    const staves: { events: ScoreEvent[]; steps: (number | null)[] }[] = []
    for (const hand of ['R', 'L'] as const) {
      const events: ScoreEvent[] = []
      const steps: (number | null)[] = []
      const push = (ev: ScoreEvent, step: number | null) => {
        events.push(ev)
        steps.push(step)
      }
      for (let m = sysFrom; m <= sysTo; m++) {
        const startCount = events.length
        const notes = (opts.hands === 'both' || opts.hands === hand
          ? song.measures[m].notes.filter((n) => n.hand === hand)
          : []
        ).slice()
        // Group same-hand simultaneous notes into chords.
        const groups = new Map<number, SongNote[]>()
        for (const n of notes) {
          const key = Math.round(n.startBeat * 64)
          if (!groups.has(key)) groups.set(key, [])
          groups.get(key)!.push(n)
        }
        const onsets = [...groups.entries()]
          .map(([key, ns]) => ({ startBeat: key / 64, notes: ns.sort((a, b) => a.midi - b.midi) }))
          .sort((a, b) => a.startBeat - b.startBeat)

        let cursor = 0
        onsets.forEach((group, gi) => {
          if (group.startBeat > cursor + EPS) {
            for (const r of restEvents(group.startBeat - cursor)) push(r, null)
          }
          const nextStart = gi + 1 < onsets.length ? onsets[gi + 1].startBeat : bpm
          const trueDur = Math.max(...group.notes.map((n) => n.durationBeats))
          const clipped = Math.min(trueDur, nextStart - group.startBeat, bpm - group.startBeat)
          const shown = displayDuration(clipped)
          const { duration, dots } = durationFromBeats(shown)
          const absBeat = (m - from) * bpm + group.startBeat
          push(
            {
              keys: group.notes.map((n) => midiToVexKeyInKey(n.midi, song.keySignature)),
              duration,
              dots,
              fingerings:
                opts.showFingering === false ? undefined : group.notes.map((n) => n.finger ?? null),
            },
            stepIndexByBeat.get(Math.round(absBeat * 64)) ?? null,
          )
          cursor = group.startBeat + clipped
          // Pad out any gap the display clip created before the next onset.
          const padTo = Math.min(nextStart, bpm)
          if (shown < clipped - EPS) cursor = group.startBeat + shown
          if (padTo > cursor + EPS) {
            for (const r of restEvents(padTo - cursor)) push(r, null)
            cursor = padTo
          }
        })
        if (cursor < bpm - EPS) {
          for (const r of restEvents(bpm - cursor)) push(r, null)
        }
        if (events.length === startCount) {
          // Completely empty measure on this stave: a whole-measure rest.
          for (const r of restEvents(bpm)) push(r, null)
        }
        if (events.length > 0) events[events.length - 1].endsBar = true
      }
      staves.push({ events, steps })
    }
    systems.push({
      model: {
        grand: true,
        keySignature: song.keySignature,
        timeSignature: sysFrom === from ? `${song.timeSignature[0]}/${song.timeSignature[1]}` : undefined,
        treble: staves[0].events,
        bass: staves[1].events,
      },
      trebleSteps: staves[0].steps,
      bassSteps: staves[1].steps,
      fromMeasure: sysFrom,
      toMeasure: sysTo,
    })
  }
  return systems
}
