import {
  Accidental,
  Annotation,
  AnnotationVerticalJustify,
  BarNote,
  Formatter,
  FretHandFinger,
  ModifierPosition,
  Renderer,
  Stave,
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
  /** 'w' | 'h' | 'q' | '8' */
  duration: string
  /** Per-key fingering, bottom-to-top */
  fingerings?: (Finger | null)[]
  rest?: boolean
  /** Draw a barline after this event */
  endsBar?: boolean
}

export interface ScoreModel {
  clef: 'treble' | 'bass'
  keySignature: string
  events: ScoreEvent[]
  /** Where scale fingering numbers go; chords always render fingers left of noteheads */
  fingeringPosition?: 'above' | 'below' | 'left'
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
  stave.setContext(ctx).draw()

  const fingerPos = model.fingeringPosition ?? 'above'
  const notes = model.events.map((ev, i) => {
    const restKey = model.clef === 'treble' ? 'b/4' : 'd/3'
    const note = new StaveNote({
      keys: ev.rest ? [restKey] : ev.keys,
      duration: ev.rest ? `${ev.duration}r` : ev.duration,
      clef: model.clef,
    })
    if (ev.fingerings) {
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
    const hl = highlights?.get(i)
    if (hl) {
      const color = HIGHLIGHT_COLORS[hl]
      note.setStyle({ fillStyle: color, strokeStyle: color })
    }
    return note
  })

  const voice = new Voice({ numBeats: 4, beatValue: 4 })
  voice.setMode(VoiceMode.SOFT)
  const tickables = model.events.flatMap((ev, i) =>
    ev.endsBar && i < model.events.length - 1 ? [notes[i], new BarNote()] : [notes[i]],
  )
  voice.addTickables(tickables)
  Accidental.applyAccidentals([voice], model.keySignature)
  new Formatter().joinVoices([voice]).format([voice], width - 130)
  voice.draw(ctx, stave)
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

/** Lesson segment: each step is one or more midis with fingering, as quarter notes. */
export function scoreFromSteps(
  steps: { midis: number[]; fingers: (Finger | null)[] }[],
  keySignature: string,
  clef: 'treble' | 'bass',
): ScoreModel {
  return {
    clef,
    keySignature,
    fingeringPosition: clef === 'treble' ? 'above' : 'below',
    events: steps.map((s) => {
      const order = s.midis.map((m, i) => ({ m, f: s.fingers[i] })).sort((a, b) => a.m - b.m)
      return {
        keys: order.map((x) => midiToVexKeyInKey(x.m, keySignature)),
        duration: 'q',
        fingerings: order.map((x) => x.f),
      }
    }),
  }
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
