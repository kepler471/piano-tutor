import type { ChordQualityId, Hand, ScaleTypeId } from '../theory/types'

/**
 * Everything a voice utterance can mean, after wake-word stripping and
 * parsing. Kept pure (no DOM types) so the parser and dispatcher are
 * unit-testable in vitest.
 */
export type Intent =
  // global
  | { kind: 'wake' } // wake word alone — "Yes?" + armed window
  | {
      kind: 'navigate'
      route: '/' | '/guide' | '/scales' | '/chords' | '/practice' | '/ear' | '/rhythm' | '/songs' | '/play' | '/tuner'
    }
  | { kind: 'show-stage'; stage: number } // "show stage two" — guide (cross-screen capable)
  | { kind: 'metronome'; action: 'start' | 'stop'; bpm?: number }
  | { kind: 'set-bpm'; bpm?: number; delta?: number } // scope decides which bpm; delta for "slower"/"faster"
  | { kind: 'stop-all' } // "piano, stop"
  | { kind: 'help' }
  | { kind: 'voice-off' }
  | { kind: 'mic'; action: 'start' | 'stop' } // pitch-detection listening, not voice
  // scales (cross-screen capable); explicit = the word "scale" was spoken,
  // so screens that reinterpret bare roots (Chords) must let it fall through
  | { kind: 'show-scale'; root?: string; scaleType?: ScaleTypeId; hand?: Hand; explicit?: boolean }
  // chords (cross-screen capable)
  | { kind: 'show-chord'; root?: string; quality?: ChordQualityId; inversion?: number; hand?: Hand }
  | { kind: 'set-inversion'; inversion: 0 | 1 | 2 | 3 }
  | { kind: 'set-hand'; hand: Hand }
  | { kind: 'play-demo'; variant?: 'block' | 'arpeggio' }
  // practice (cross-screen capable)
  | { kind: 'open-lesson'; query: string }
  | { kind: 'lesson'; action: 'restart' | 'next' | 'previous' | 'exit' | 'new-melody' }
  // free play (cross-screen capable)
  | {
      kind: 'free-play'
      action: 'set-mode' | 'record' | 'stop-recording' | 'clear' | 'copy'
      mode?: 'melody' | 'chords'
      bpm?: number
    }
  // wake word heard but the rest didn't parse
  | { kind: 'unknown'; text: string }

/** Where an intent can be fulfilled if no active scope handles it. */
export const ROUTE_FOR_KIND: Partial<Record<Intent['kind'], string>> = {
  'show-stage': '/guide',
  'show-scale': '/scales',
  'show-chord': '/chords',
  'set-inversion': '/chords',
  'open-lesson': '/practice',
  'free-play': '/play',
}

/** Returned by a scope handler; null/undefined means "not handled, fall through". */
export type HandleOutcome = { say?: string } | null | undefined

export interface VoiceScopeSpec {
  /** Shown in the help HUD, e.g. 'Scales' */
  name: string
  /** Example phrases for the help HUD */
  phrases: string[]
  handle(intent: Intent): HandleOutcome
}
