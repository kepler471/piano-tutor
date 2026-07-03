/**
 * Leveled rhythm patterns for the rhythm trainer. Events are onsets on a
 * beat grid (quarter = 1); rests are implied by the gaps and reconstructed
 * for notation by patternToNotation().
 */
export interface RhythmEvent {
  startBeat: number
  durationBeats: number
}

export interface RhythmPattern {
  id: string
  label: string
  level: 1 | 2 | 3 | 4
  /** e.g. [4, 4] */
  timeSignature: [number, number]
  bars: number
  /** Swing feel: off-beat eighths are played (and graded) late, at 2/3 beat */
  swing?: boolean
  events: RhythmEvent[]
  hint?: string
}

const bar = (barIndex: number, events: [number, number][]): RhythmEvent[] =>
  events.map(([b, d]) => ({ startBeat: barIndex * 4 + b, durationBeats: d }))

export const RHYTHM_PATTERNS: RhythmPattern[] = [
  // Level 1 — quarters and halves
  {
    id: 'l1-quarters',
    label: 'Steady quarters',
    level: 1,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 1], [1, 1], [2, 1], [3, 1]]), ...bar(1, [[0, 1], [1, 1], [2, 1], [3, 1]])],
    hint: 'Tap right with the click — every beat, no more, no less.',
  },
  {
    id: 'l1-half-quarters',
    label: 'Half then quarters',
    level: 1,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 2], [2, 1], [3, 1]]), ...bar(1, [[0, 2], [2, 1], [3, 1]])],
    hint: 'Hold the half note for two full clicks before the quarters.',
  },
  {
    id: 'l1-whole-halves',
    label: 'Whole and halves',
    level: 1,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 4]]), ...bar(1, [[0, 2], [2, 2]])],
    hint: 'One tap per bar, then two — count 1-2-3-4 out loud.',
  },
  // Level 2 — eighths and rests
  {
    id: 'l2-eighths',
    label: 'Even eighths',
    level: 2,
    timeSignature: [4, 4],
    bars: 2,
    events: [
      ...bar(0, [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 0.5], [2.5, 0.5], [3, 0.5], [3.5, 0.5]]),
      ...bar(1, [[0, 1], [1, 1], [2, 1], [3, 1]]),
    ],
    hint: 'Two even taps per click, then settle back to quarters.',
  },
  {
    id: 'l2-rest-on-two',
    label: 'Rest on beat 2',
    level: 2,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 1], [2, 1], [3, 1]]), ...bar(1, [[0, 1], [2, 1], [3, 1]])],
    hint: 'Silence is part of the rhythm — feel beat 2 without tapping it.',
  },
  {
    id: 'l2-offbeat-eighths',
    label: 'Eighths after the beat',
    level: 2,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 1], [1, 0.5], [1.5, 0.5], [2, 1], [3, 0.5], [3.5, 0.5]]), ...bar(1, [[0, 1], [1, 0.5], [1.5, 0.5], [2, 2]])],
    hint: 'Say "1, 2-and, 3, 4-and" while you tap.',
  },
  // Level 3 — dotted rhythms and syncopation
  {
    id: 'l3-dotted-quarter',
    label: 'Dotted quarter + eighth',
    level: 3,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 1.5], [1.5, 0.5], [2, 1.5], [3.5, 0.5]]), ...bar(1, [[0, 1.5], [1.5, 0.5], [2, 2]])],
    hint: 'The second tap lands on the "and" of 2 — late, not on the beat.',
  },
  {
    id: 'l3-syncopation',
    label: 'Syncopated push',
    level: 3,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 0.5], [0.5, 1], [1.5, 1], [2.5, 1], [3.5, 0.5]]), ...bar(1, [[0, 2], [2, 2]])],
    hint: 'After the first eighth, every tap floats between the clicks.',
  },
  {
    id: 'l3-half-bar-syncopation',
    label: 'Tied over the middle',
    level: 3,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 1], [1.5, 1.5], [3, 1]]), ...bar(1, [[0, 1], [1.5, 1.5], [3, 1]])],
    hint: 'The middle tap comes on the "and" of 2 and hangs across beat 3.',
  },
  // Level 4 — swing and jazz comping
  {
    id: 'l4-swing-eighths',
    label: 'Swing eighths',
    level: 4,
    timeSignature: [4, 4],
    bars: 2,
    swing: true,
    events: [
      ...bar(0, [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 0.5], [2.5, 0.5], [3, 0.5], [3.5, 0.5]]),
      ...bar(1, [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 1], [3, 1]]),
    ],
    hint: 'Long-short, long-short — the off-beats land two-thirds through the beat.',
  },
  {
    id: 'l4-charleston',
    label: 'Charleston',
    level: 4,
    timeSignature: [4, 4],
    bars: 2,
    swing: true,
    events: [...bar(0, [[0, 1.5], [1.5, 1]]), ...bar(1, [[0, 1.5], [1.5, 1]])],
    hint: 'The classic jazz figure: beat 1, then the "and" of 2 — swung.',
  },
  {
    id: 'l4-comp-2-and-4',
    label: 'Comp on 2 and 4',
    level: 4,
    timeSignature: [4, 4],
    bars: 2,
    swing: true,
    events: [...bar(0, [[1, 1], [3, 1]]), ...bar(1, [[1, 1], [3, 0.5], [3.5, 0.5]])],
    hint: 'Where the drummer’s hi-hat lives — nothing on 1 and 3.',
  },
]

export interface NotationEvent {
  durationBeats: number
  rest: boolean
  endsBar?: boolean
}

/** Greedy split of a beat span into notatable chunks (no dotted rests). */
function splitBeats(beats: number, allowDots: boolean): number[] {
  const chunks = allowDots ? [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25] : [4, 2, 1, 0.5, 0.25]
  const out: number[] = []
  let left = beats
  while (left > 1e-6) {
    const c = chunks.find((c) => c <= left + 1e-6)
    if (!c) break
    out.push(c)
    left -= c
  }
  return out
}

/**
 * Expand a pattern into notation events (notes + explicit rests), split at
 * barlines. Returns the events plus, for each pattern event, its index in
 * the notation array — so grading results can highlight the right note.
 */
export function patternToNotation(pattern: RhythmPattern): { events: NotationEvent[]; noteIndices: number[] } {
  const beatsPerBar = (pattern.timeSignature[0] * 4) / pattern.timeSignature[1]
  const total = pattern.bars * beatsPerBar
  const events: NotationEvent[] = []
  const noteIndices: number[] = []

  const pushRests = (from: number, to: number) => {
    // Rests never cross barlines; split the span at each boundary.
    let cursor = from
    while (cursor < to - 1e-6) {
      const barEnd = (Math.floor(cursor / beatsPerBar) + 1) * beatsPerBar
      const chunkEnd = Math.min(to, barEnd)
      for (const d of splitBeats(chunkEnd - cursor, false)) {
        events.push({ durationBeats: d, rest: true, endsBar: Math.abs(cursor + d - barEnd) < 1e-6 })
        cursor += d
      }
      if (Math.abs(cursor - chunkEnd) > 1e-6) cursor = chunkEnd // safety against non-notatable spans
    }
  }

  let cursor = 0
  for (const ev of pattern.events) {
    if (ev.startBeat > cursor + 1e-6) pushRests(cursor, ev.startBeat)
    const end = ev.startBeat + ev.durationBeats
    const barEnd = (Math.floor(ev.startBeat / beatsPerBar) + 1) * beatsPerBar
    // Clip notes at the barline (display only — ties are overkill for taps).
    const shown = Math.min(end, barEnd) - ev.startBeat
    noteIndices.push(events.length)
    events.push({ durationBeats: shown, rest: false, endsBar: Math.abs(ev.startBeat + shown - barEnd) < 1e-6 })
    if (end > barEnd + 1e-6) pushRests(barEnd, end)
    cursor = end
  }
  if (cursor < total - 1e-6) pushRests(cursor, total)
  return { events, noteIndices }
}
