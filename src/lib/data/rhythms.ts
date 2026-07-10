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
  level: 1 | 2 | 3 | 4 | 5
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

/** Same helper for 3/4 bars (three beats per bar). */
const bar3 = (barIndex: number, events: [number, number][]): RhythmEvent[] =>
  events.map(([b, d]) => ({ startBeat: barIndex * 3 + b, durationBeats: d }))

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
  {
    id: 'l1-quarters-rest',
    label: 'Quarters with a breath',
    level: 1,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 1], [1, 1], [2, 2]]), ...bar(1, [[0, 1], [1, 1], [2, 1], [3, 1]])],
    hint: 'Hold beat 3 through beat 4, then walk the second bar.',
  },
  {
    id: 'l1-halves-quarters',
    label: 'Quarters then halves',
    level: 1,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 1], [1, 1], [2, 1], [3, 1]]), ...bar(1, [[0, 2], [2, 2]])],
    hint: 'Four taps, then two long ones — keep the pulse identical.',
  },
  {
    id: 'l1-dotted-half',
    label: 'Dotted half then quarter',
    level: 1,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 3], [3, 1]]), ...bar(1, [[0, 3], [3, 1]])],
    hint: 'Hold for three clicks, tap again on the fourth.',
  },
  {
    id: 'l1-middle-hold',
    label: 'Hold in the middle',
    level: 1,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 1], [1, 2], [3, 1]]), ...bar(1, [[0, 1], [1, 2], [3, 1]])],
    hint: 'Tap, hold through beats 2 and 3, tap beat 4.',
  },
  {
    id: 'l1-rest-on-four',
    label: 'Rest on beat 4',
    level: 1,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 1], [1, 1], [2, 1]]), ...bar(1, [[0, 1], [1, 1], [2, 1]])],
    hint: 'Three taps, then a silent beat 4 — feel it without tapping.',
  },
  {
    id: 'l1-whole-then-quarters',
    label: 'One long, then walk',
    level: 1,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 4]]), ...bar(1, [[0, 1], [1, 1], [2, 1], [3, 1]])],
    hint: 'One tap held a whole bar, then steady quarters.',
  },
  {
    id: 'l1-halves-only',
    label: 'Two taps per bar',
    level: 1,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 2], [2, 2]]), ...bar(1, [[0, 2], [2, 2]])],
    hint: 'Beats 1 and 3 only — each held for two clicks.',
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
  {
    id: 'l2-eighth-pairs',
    label: 'Pairs of eighths',
    level: 2,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 0.5], [0.5, 0.5], [1, 1], [2, 0.5], [2.5, 0.5], [3, 1]]), ...bar(1, [[0, 0.5], [0.5, 0.5], [1, 1], [2, 2]])],
    hint: 'Two quick, one steady — "1-and, 2, 3-and, 4".',
  },
  {
    id: 'l2-rest-on-one',
    label: 'Rest on beat 1',
    level: 2,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[1, 1], [2, 1], [3, 1]]), ...bar(1, [[1, 1], [2, 1], [3, 1]])],
    hint: 'Nothing on the downbeat — count "1" silently and come in on 2.',
  },
  {
    id: 'l2-eighths-back-half',
    label: 'Eighths in the back half',
    level: 2,
    timeSignature: [4, 4],
    bars: 2,
    events: [
      ...bar(0, [[0, 1], [1, 1], [2, 0.5], [2.5, 0.5], [3, 0.5], [3.5, 0.5]]),
      ...bar(1, [[0, 1], [1, 1], [2, 2]]),
    ],
    hint: 'Steady start, then the taps double up on beats 3 and 4.',
  },
  {
    id: 'l2-rest-on-three',
    label: 'Rest on beat 3',
    level: 2,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 1], [1, 1], [3, 1]]), ...bar(1, [[0, 1], [1, 1], [3, 1]])],
    hint: 'Two taps, skip beat 3, catch beat 4.',
  },
  {
    id: 'l2-quarter-eighth-alternate',
    label: 'Quarters and pairs, alternating',
    level: 2,
    timeSignature: [4, 4],
    bars: 2,
    events: [
      ...bar(0, [[0, 1], [1, 0.5], [1.5, 0.5], [2, 1], [3, 1]]),
      ...bar(1, [[0, 0.5], [0.5, 0.5], [1, 1], [2, 1], [3, 1]]),
    ],
    hint: 'The eighth pair moves: beat 2 in bar 1, beat 1 in bar 2.',
  },
  {
    id: 'l2-two-rests',
    label: 'Rests on 2 and 4',
    level: 2,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 1], [2, 1]]), ...bar(1, [[0, 1], [2, 0.5], [2.5, 0.5], [3, 1]])],
    hint: 'Tap only 1 and 3 in bar 1 — bar 2 sneaks eighths onto beat 3.',
  },
  {
    id: 'l2-eighths-front',
    label: 'Eighths up front',
    level: 2,
    timeSignature: [4, 4],
    bars: 2,
    events: [
      ...bar(0, [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 1], [3, 1]]),
      ...bar(1, [[0, 0.5], [0.5, 0.5], [1, 1], [2, 1], [3, 1]]),
    ],
    hint: 'Quick taps first, then the bar relaxes into quarters.',
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
  {
    id: 'l3-dotted-eighth',
    label: 'Dotted eighth + sixteenth',
    level: 3,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 0.75], [0.75, 0.25], [1, 0.75], [1.75, 0.25], [2, 1], [3, 1]]), ...bar(1, [[0, 0.75], [0.75, 0.25], [1, 1], [2, 2]])],
    hint: 'A long-short limp — the short note snaps right before the next beat.',
  },
  {
    id: 'l3-anticipation',
    label: 'Anticipated downbeat',
    level: 3,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 1], [1, 1], [2, 1], [3.5, 0.5]]), ...bar(1, [[0, 1], [1, 1], [2, 2]])],
    hint: 'The last tap of bar 1 arrives half a beat early — lean into it.',
  },
  {
    id: 'l3-tresillo',
    label: 'Tresillo (3+3+2)',
    level: 3,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 1.5], [1.5, 1.5], [3, 1]]), ...bar(1, [[0, 1.5], [1.5, 1.5], [3, 1]])],
    hint: 'Long, long, short — the 3+3+2 that powers half of pop music.',
  },
  {
    id: 'l3-habanera',
    label: 'Habanera',
    level: 3,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 1.5], [1.5, 0.5], [2, 1], [3, 1]]), ...bar(1, [[0, 1.5], [1.5, 0.5], [2, 1], [3, 1]])],
    hint: 'Dotted quarter, eighth, then two even quarters — think "Carmen".',
  },
  {
    id: 'l3-offbeat-start',
    label: 'Late start',
    level: 3,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0.5, 1], [1.5, 1], [2.5, 1], [3.5, 0.5]]), ...bar(1, [[0, 1], [1, 1], [2, 2]])],
    hint: 'The whole first bar floats half a beat behind the clicks.',
  },
  {
    id: 'l3-dotted-then-sync',
    label: 'Dotted into a push',
    level: 3,
    timeSignature: [4, 4],
    bars: 2,
    events: [...bar(0, [[0, 1.5], [1.5, 0.5], [2, 0.5], [2.5, 1.5]]), ...bar(1, [[0, 1], [1, 1], [2, 2]])],
    hint: 'The dotted figure tips you into a tap that hangs between beats 3 and 4.',
  },
  {
    id: 'l3-scotch-snap',
    label: 'Scotch snap',
    level: 3,
    timeSignature: [4, 4],
    bars: 2,
    events: [
      ...bar(0, [[0, 0.25], [0.25, 0.75], [1, 1], [2, 0.25], [2.25, 0.75], [3, 1]]),
      ...bar(1, [[0, 1], [1, 0.25], [1.25, 0.75], [2, 2]]),
    ],
    hint: 'Short-LONG — the quick note comes first, snapping off the beat.',
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
  {
    id: 'l4-charleston-variation',
    label: 'Charleston, displaced',
    level: 4,
    timeSignature: [4, 4],
    bars: 2,
    swing: true,
    events: [...bar(0, [[0, 1.5], [1.5, 1], [3, 1]]), ...bar(1, [[0.5, 1], [1.5, 1.5], [3, 1]])],
    hint: 'Bar 1 is the Charleston plus beat 4; bar 2 starts off the beat.',
  },
  {
    id: 'l4-red-garland',
    label: 'Comp on the and of 2',
    level: 4,
    timeSignature: [4, 4],
    bars: 2,
    swing: true,
    events: [...bar(0, [[1.5, 1], [3.5, 0.5]]), ...bar(1, [[1.5, 1], [3.5, 0.5]])],
    hint: 'The classic trio comp — always between the beats, never on them.',
  },
  {
    id: 'l4-charleston-on-3',
    label: 'Charleston from beat 3',
    level: 4,
    timeSignature: [4, 4],
    bars: 2,
    swing: true,
    events: [...bar(0, [[0, 1], [2, 1.5], [3.5, 0.5]]), ...bar(1, [[2, 1.5], [3.5, 0.5]])],
    hint: 'The Charleston figure shifted to the back half of the bar.',
  },
  {
    id: 'l4-and-of-one',
    label: 'Off the and of 1',
    level: 4,
    timeSignature: [4, 4],
    bars: 2,
    swing: true,
    events: [...bar(0, [[0.5, 1], [2, 1], [3.5, 0.5]]), ...bar(1, [[0.5, 1], [2, 2]])],
    hint: 'Skip the downbeat and come in on the "and" of 1 — swung.',
  },
  {
    id: 'l4-push-into-two',
    label: 'Push into the bar',
    level: 4,
    timeSignature: [4, 4],
    bars: 2,
    swing: true,
    events: [...bar(0, [[0, 0.5], [1.5, 1], [3, 1]]), ...bar(1, [[0, 0.5], [1.5, 1.5], [3, 1]])],
    hint: 'A short jab on 1, then everything floats off the beat.',
  },
  {
    id: 'l4-call-response',
    label: 'Call and response',
    level: 4,
    timeSignature: [4, 4],
    bars: 2,
    swing: true,
    events: [
      ...bar(0, [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 2]]),
      ...bar(1, [[2, 0.5], [2.5, 0.5], [3, 0.5], [3.5, 0.5]]),
    ],
    hint: 'A swung run, a long hold — then the answer comes late in bar 2.',
  },
  {
    id: 'l4-anticipated-one',
    label: 'Anticipated downbeat',
    level: 4,
    timeSignature: [4, 4],
    bars: 2,
    swing: true,
    events: [...bar(0, [[1, 1], [2.5, 0.5], [3.5, 0.5]]), ...bar(1, [[0, 2], [2.5, 0.5], [3.5, 0.5]])],
    hint: 'The two late eighths of bar 1 pull you into a downbeat that finally lands.',
  },
  // Level 5 — sixteenths, and 3/4 time
  {
    id: 'l5-sixteenth-run',
    label: 'Sixteenth runs',
    level: 5,
    timeSignature: [4, 4],
    bars: 2,
    events: [
      ...bar(0, [[0, 0.25], [0.25, 0.25], [0.5, 0.25], [0.75, 0.25], [1, 1], [2, 0.25], [2.25, 0.25], [2.5, 0.25], [2.75, 0.25], [3, 1]]),
      ...bar(1, [[0, 1], [1, 1], [2, 2]]),
    ],
    hint: 'Four taps per click — "1-e-and-a" — then land on the beat.',
  },
  {
    id: 'l5-one-e-and',
    label: 'One-e-and',
    level: 5,
    timeSignature: [4, 4],
    bars: 2,
    events: [
      ...bar(0, [[0, 0.25], [0.25, 0.25], [0.5, 0.5], [1, 1], [2, 0.25], [2.25, 0.25], [2.5, 0.5], [3, 1]]),
      ...bar(1, [[0, 1], [1, 1], [2, 2]]),
    ],
    hint: 'Two sixteenths then an eighth — the front of the beat is busy.',
  },
  {
    id: 'l5-and-a',
    label: 'And-a into the beat',
    level: 5,
    timeSignature: [4, 4],
    bars: 2,
    events: [
      ...bar(0, [[0, 0.5], [0.5, 0.25], [0.75, 0.25], [1, 1], [2, 0.5], [2.5, 0.25], [2.75, 0.25], [3, 1]]),
      ...bar(1, [[0, 2], [2, 2]]),
    ],
    hint: 'Eighth then two sixteenths — the back of the beat is busy.',
  },
  {
    id: 'l5-waltz',
    label: 'Waltz bar',
    level: 5,
    timeSignature: [3, 4],
    bars: 2,
    events: [...bar3(0, [[0, 1], [1, 1], [2, 1]]), ...bar3(1, [[0, 2], [2, 1]])],
    hint: 'Three beats to a bar — ONE-two-three, then a held ONE-(two)-three.',
  },
  {
    id: 'l5-waltz-lift',
    label: 'Waltz with a lift',
    level: 5,
    timeSignature: [3, 4],
    bars: 2,
    events: [...bar3(0, [[0, 1], [2, 1]]), ...bar3(1, [[0, 1], [1, 1], [2, 1]])],
    hint: 'Beat 2 of the first bar is silent — the lift of the dance.',
  },
  {
    id: 'l5-minuet-dotted',
    label: 'Minuet dotted figure',
    level: 5,
    timeSignature: [3, 4],
    bars: 2,
    events: [...bar3(0, [[0, 1.5], [1.5, 0.5], [2, 1]]), ...bar3(1, [[0, 3]])],
    hint: 'Dotted quarter, eighth, quarter — then one tap held a whole bar.',
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
