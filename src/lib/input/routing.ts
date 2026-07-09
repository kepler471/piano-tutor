import type { NoteSource } from '../audio/noteEvents'

/** Which input is actively feeding grading/display. */
export type ActiveSource = 'midi' | 'mic-mono' | 'mic-poly' | 'mic-fused' | 'none'

/**
 * Pick the input source for a practice session. MIDI always wins when a
 * device is connected — instant and polyphonic-accurate — otherwise the
 * caller's preferred mic detector decides. Chord practice defaults to
 * 'mic-fused' (instant mono onsets + poly for the rest of the chord, deduped
 * by MonoPolyFuser); the fusion setting toggles back to poly-only.
 */
export function chooseSource(
  midiAvailable: boolean,
  preferred: 'mono' | 'poly',
  fusionEnabled = true,
): ActiveSource {
  if (midiAvailable) return 'midi'
  if (preferred === 'poly') return fusionEnabled ? 'mic-fused' : 'mic-poly'
  return 'mic-mono'
}

/**
 * Should an event from `source` reach hub subscribers while `active` is the
 * chosen source? Grading must hear one detector — except 'mic-fused', where
 * both mic detectors forward and the fuser dedups. In mic-poly mode the mono
 * tracker still runs (level meter, pressed keys) but only poly events count.
 */
export function shouldForward(source: NoteSource, active: ActiveSource): boolean {
  switch (active) {
    case 'midi':
      return source === 'midi'
    case 'mic-mono':
      return source === 'mono'
    case 'mic-poly':
      return source === 'poly'
    case 'mic-fused':
      return source === 'mono' || source === 'poly'
    case 'none':
      return false
  }
}

/** The mic source `preferred` should be running (for detector restarts). */
export function expectedMicSource(preferred: 'mono' | 'poly', fusionEnabled: boolean): ActiveSource {
  return chooseSource(false, preferred, fusionEnabled)
}
