import {
  Accidental,
  Annotation,
  AnnotationVerticalJustify,
  BarNote,
  Dot,
  Formatter,
  FretHandFinger,
  ModifierPosition,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  Voice,
  VoiceMode,
} from 'vexflow'
import { Note } from 'tonal'
import type { ChordInfo, Finger, Hand, ScaleInfo } from '../theory/types'
import type { ChordFingering } from '../data/chordFingerings'
import type { ScaleFingering } from '../data/scaleFingerings'

export interface ScoreEvent {
  /** VexFlow keys bottom-to-top, e.g. ['c/4', 'e/4', 'g/4']; ignored for rests */
  keys: string[]
  /** 'w' | 'h' | 'q' | '8' | '16' */
  duration: string
  /** Augmentation dots on this event */
  dots?: number
  /** Per-key fingering, bottom-to-top */
  fingerings?: (Finger | null)[]
  rest?: boolean
  /** Draw a barline after this event */
  endsBar?: boolean
}

export interface ScoreModel {
  clef: 'treble' | 'bass'
  keySignature: string
  /** e.g. '4/4'; omitted = no time signature drawn */
  timeSignature?: string
  events: ScoreEvent[]
  /** Where scale fingering numbers go; chords always render fingers left of noteheads */
  fingeringPosition?: 'above' | 'below' | 'left'
}

/** Two aligned staves (treble + bass). Events at the same index sound together. */
export interface GrandScoreModel {
  grand: true
  keySignature: string
  timeSignature?: string
  /** Same length as bass; pad with rests to keep alignment */
  treble: ScoreEvent[]
  bass: ScoreEvent[]
}

export function isGrandScore(model: ScoreModel | GrandScoreModel): model is GrandScoreModel {
  return 'grand' in model && model.grand === true
}

/** Map a beat length (quarter = 1) to a VexFlow duration + dots. */
export function durationFromBeats(beats: number): { duration: string; dots: number } {
  const table: [number, string, number][] = [
    [4, 'w', 0],
    [3, 'h', 1],
    [2, 'h', 0],
    [1.5, 'q', 1],
    [1, 'q', 0],
    [0.75, '8', 1],
    [0.5, '8', 0],
    [0.25, '16', 0],
  ]
  for (const [b, duration, dots] of table) {
    if (Math.abs(beats - b) < 1e-6) return { duration, dots }
  }
  return { duration: 'q', dots: 0 }
}

export type HighlightState = 'played' | 'correct' | 'wrong' | 'next'

const HIGHLIGHT_COLORS: Record<HighlightState, string> = {
  played: '#2563eb',
  correct: '#16a34a',
  wrong: '#dc2626',
  next: '#d97706',
}

export function noteNameToVexKey(name: string): string {
  const n = Note.get(name)
  if (n.empty || n.oct === undefined) throw new Error(`Bad note name: ${name}`)
  return `${n.letter.toLowerCase()}${n.acc}/${n.oct}`
}

export function midiToVexKey(midi: number): string {
  return noteNameToVexKey(Note.fromMidiSharps(midi))
}

const FLAT_KEYS = new Set([
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb',
  'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm',
])

/** Spell a midi note to suit the key signature (flats in flat keys). */
export function midiToVexKeyInKey(midi: number, keySignature: string): string {
  const name = FLAT_KEYS.has(keySignature) ? Note.fromMidi(midi) : Note.fromMidiSharps(midi)
  return noteNameToVexKey(name)
}

function buildNote(
  ev: ScoreEvent,
  clef: 'treble' | 'bass',
  fingerPos: 'above' | 'below' | 'left',
  highlight?: HighlightState,
): StaveNote {
  const restKey = clef === 'treble' ? 'b/4' : 'd/3'
  const note = new StaveNote({
    keys: ev.rest ? [restKey] : ev.keys,
    duration: ev.rest ? `${ev.duration}r` : ev.duration,
    clef,
  })
  if (ev.dots) {
    for (let d = 0; d < ev.dots; d++) Dot.buildAndAttach([note], { all: true })
  }
  if (ev.fingerings && !ev.rest) {
    ev.fingerings.forEach((f, keyIndex) => {
      if (f == null) return
      if (fingerPos === 'left' || ev.keys.length > 1) {
        note.addModifier(
          new FretHandFinger(String(f)).setPosition(ModifierPosition.LEFT),
          keyIndex,
        )
      } else {
        const ann = new Annotation(String(f)).setFont('system-ui', 11)
        ann.setVerticalJustification(
          fingerPos === 'below' ? AnnotationVerticalJustify.BOTTOM : AnnotationVerticalJustify.TOP,
        )
        note.addModifier(ann, keyIndex)
      }
    })
  }
  if (highlight && !ev.rest) {
    const color = HIGHLIGHT_COLORS[highlight]
    note.setStyle({ fillStyle: color, strokeStyle: color })
  }
  return note
}

/** Interleave BarNotes after events flagged endsBar (except the last). */
function withBarNotes(events: ScoreEvent[], notes: StaveNote[]): (StaveNote | BarNote)[] {
  return events.flatMap((ev, i) =>
    ev.endsBar && i < events.length - 1 ? [notes[i], new BarNote()] : [notes[i]],
  )
}

/** Renders the model into the container (replacing prior content). */
export function renderScore(
  container: HTMLElement,
  model: ScoreModel,
  highlights?: Map<number, HighlightState>,
  minWidth = 320,
): void {
  container.innerHTML = ''
  const width = Math.max(minWidth, 110 + model.events.length * 46)
  const height = 190

  const renderer = new Renderer(container as HTMLDivElement, Renderer.Backends.SVG)
  renderer.resize(width, height)
  const ctx = renderer.getContext()

  const stave = new Stave(10, 40, width - 20)
  stave.addClef(model.clef).addKeySignature(model.keySignature)
  if (model.timeSignature) stave.addTimeSignature(model.timeSignature)
  stave.setContext(ctx).draw()

  const fingerPos = model.fingeringPosition ?? 'above'
  const notes = model.events.map((ev, i) => buildNote(ev, model.clef, fingerPos, highlights?.get(i)))

  const voice = new Voice({ numBeats: 4, beatValue: 4 })
  voice.setMode(VoiceMode.SOFT)
  voice.addTickables(withBarNotes(model.events, notes))
  Accidental.applyAccidentals([voice], model.keySignature)
  new Formatter().joinVoices([voice]).format([voice], width - 130)
  voice.draw(ctx, stave)
}

/**
 * Renders a grand staff (treble over bass, brace-connected). Events at equal
 * indices are formatted to align vertically; highlight indices color the
 * event on both staves.
 */
export function renderGrandScore(
  container: HTMLElement,
  model: GrandScoreModel,
  highlights?: Map<number, HighlightState>,
  minWidth = 320,
  /** Songs: independent bass-stave highlights (indices differ from treble) */
  bassHighlights?: Map<number, HighlightState>,
): void {
  container.innerHTML = ''
  const count = Math.max(model.treble.length, model.bass.length)
  const width = Math.max(minWidth, 110 + count * 46)
  const height = 320

  const renderer = new Renderer(container as HTMLDivElement, Renderer.Backends.SVG)
  renderer.resize(width, height)
  const ctx = renderer.getContext()

  const treble = new Stave(10, 30, width - 20)
  treble.addClef('treble').addKeySignature(model.keySignature)
  const bass = new Stave(10, 150, width - 20)
  bass.addClef('bass').addKeySignature(model.keySignature)
  if (model.timeSignature) {
    treble.addTimeSignature(model.timeSignature)
    bass.addTimeSignature(model.timeSignature)
  }
  // Align note start positions across the two staves.
  const startX = Math.max(treble.getNoteStartX(), bass.getNoteStartX())
  treble.setNoteStartX(startX)
  bass.setNoteStartX(startX)
  treble.setContext(ctx).draw()
  bass.setContext(ctx).draw()

  new StaveConnector(treble, bass).setType('brace').setContext(ctx).draw()
  new StaveConnector(treble, bass).setType('singleLeft').setContext(ctx).draw()
  new StaveConnector(treble, bass).setType('singleRight').setContext(ctx).draw()

  const trebleNotes = model.treble.map((ev, i) => buildNote(ev, 'treble', 'above', highlights?.get(i)))
  const bassNotes = model.bass.map((ev, i) => buildNote(ev, 'bass', 'below', (bassHighlights ?? highlights)?.get(i)))

  const trebleVoice = new Voice({ numBeats: 4, beatValue: 4 })
  trebleVoice.setMode(VoiceMode.SOFT)
  trebleVoice.addTickables(withBarNotes(model.treble, trebleNotes))
  const bassVoice = new Voice({ numBeats: 4, beatValue: 4 })
  bassVoice.setMode(VoiceMode.SOFT)
  bassVoice.addTickables(withBarNotes(model.bass, bassNotes))

  Accidental.applyAccidentals([trebleVoice], model.keySignature)
  Accidental.applyAccidentals([bassVoice], model.keySignature)
  new Formatter().joinVoices([trebleVoice]).joinVoices([bassVoice]).format([trebleVoice, bassVoice], width - 130)
  trebleVoice.draw(ctx, treble)
  bassVoice.draw(ctx, bass)
}

/** One octave up and down, with fingering. LH is rendered an octave lower in bass clef. */
export function scoreFromScale(scale: ScaleInfo, hand: Hand, fingering: ScaleFingering): ScoreModel {
  const names =
    hand === 'R' ? scale.noteNames : scale.noteNames.map((n) => Note.transpose(n, '-8P'))
  const fingers = hand === 'R' ? fingering.rh : fingering.lh
  const upDownNames = [...names, ...names.slice(0, -1).reverse()]
  const upDownFingers = [...fingers, ...fingers.slice(0, -1).reverse()]
  return {
    clef: hand === 'R' ? 'treble' : 'bass',
    keySignature: scale.keySignature,
    fingeringPosition: hand === 'R' ? 'above' : 'below',
    events: upDownNames.map((name, i) => ({
      keys: [noteNameToVexKey(name)],
      duration: i === upDownNames.length - 1 ? 'q' : '8',
      fingerings: [upDownFingers[i]],
    })),
  }
}

export function scoreFromChord(chord: ChordInfo, hand: Hand, fingering: ChordFingering): ScoreModel {
  const names =
    hand === 'R' ? chord.noteNames : chord.noteNames.map((n) => Note.transpose(n, '-8P'))
  const fingers = hand === 'R' ? fingering.rh : fingering.lh
  return {
    clef: hand === 'R' ? 'treble' : 'bass',
    keySignature: 'C',
    fingeringPosition: 'left',
    events: [
      {
        keys: names.map(noteNameToVexKey),
        duration: 'w',
        fingerings: fingers,
      },
    ],
  }
}

interface StepLike {
  midis: number[]
  fingers: (Finger | null)[]
  hands?: (Hand | null)[]
  durationBeats?: number
}

function stepEvent(midis: number[], fingers: (Finger | null)[], keySignature: string, beats: number): ScoreEvent {
  const { duration, dots } = durationFromBeats(beats)
  if (midis.length === 0) return { keys: [], duration, dots, rest: true }
  const order = midis.map((m, i) => ({ m, f: fingers[i] })).sort((a, b) => a.m - b.m)
  return {
    keys: order.map((x) => midiToVexKeyInKey(x.m, keySignature)),
    duration,
    dots,
    fingerings: order.map((x) => x.f),
  }
}

/** Lesson segment: each step is one or more midis with fingering. */
export function scoreFromSteps(
  steps: StepLike[],
  keySignature: string,
  clef: 'treble' | 'bass' | 'grand',
): ScoreModel | GrandScoreModel {
  if (clef !== 'grand') {
    return {
      clef,
      keySignature,
      fingeringPosition: clef === 'treble' ? 'above' : 'below',
      events: steps.map((s) => stepEvent(s.midis, s.fingers, keySignature, s.durationBeats ?? 1)),
    }
  }
  // Route each midi to a stave: explicit hand wins, else split at middle C.
  const treble: ScoreEvent[] = []
  const bass: ScoreEvent[] = []
  for (const s of steps) {
    const t: { m: number; f: Finger | null }[] = []
    const b: { m: number; f: Finger | null }[] = []
    s.midis.forEach((m, i) => {
      const hand = s.hands?.[i] ?? (m >= 60 ? 'R' : 'L')
      ;(hand === 'L' ? b : t).push({ m, f: s.fingers[i] ?? null })
    })
    const beats = s.durationBeats ?? 1
    treble.push(stepEvent(t.map((x) => x.m), t.map((x) => x.f), keySignature, beats))
    bass.push(stepEvent(b.map((x) => x.m), b.map((x) => x.f), keySignature, beats))
  }
  return { grand: true, keySignature, treble, bass }
}

/** Transcription output: each event is one or more midis sounding together (empty = rest). */
export function scoreFromSequence(
  events: { midis: number[]; duration?: string; endsBar?: boolean }[],
): ScoreModel {
  const allMidis = events.flatMap((e) => e.midis)
  const avg = allMidis.length ? allMidis.reduce((a, b) => a + b, 0) / allMidis.length : 60
  return {
    clef: avg >= 57 ? 'treble' : 'bass',
    keySignature: 'C',
    events: events.map((e) => ({
      keys: [...e.midis].sort((a, b) => a - b).map(midiToVexKey),
      duration: e.duration ?? 'q',
      rest: e.midis.length === 0,
      endsBar: e.endsBar,
    })),
  }
}
