import type { NoteSource } from '../audio/noteEvents'

/** Which input is actively feeding grading/display. */
export type ActiveSource = 'midi' | 'mic-mono' | 'mic-poly' | 'none'

/**
 * Pick the input source for a practice session. MIDI always wins when a
 * device is connected — instant and polyphonic-accurate — otherwise the
 * caller's preferred mic detector decides.
 */
export function chooseSource(midiAvailable: boolean, preferred: 'mono' | 'poly'): ActiveSource {
  if (midiAvailable) return 'midi'
  return preferred === 'poly' ? 'mic-poly' : 'mic-mono'
}

/**
 * Should an event from `source` reach hub subscribers while `active` is the
 * chosen source? Grading must hear exactly one detector: in mic-poly mode the
 * mono tracker still runs (level meter, pressed keys) but only poly events
 * count.
 */
export function shouldForward(source: NoteSource, active: ActiveSource): boolean {
  switch (active) {
    case 'midi':
      return source === 'midi'
    case 'mic-mono':
      return source === 'mono'
    case 'mic-poly':
      return source === 'poly'
    case 'none':
      return false
  }
}
