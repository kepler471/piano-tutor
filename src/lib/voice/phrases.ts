/**
 * Central registry of the example phrases each voice scope advertises (in the
 * help HUD and in spoken reprompts). Lives outside the Svelte components so
 * tests can enforce the mimicry invariant: users parrot what we advertise, so
 * every advertised variant must parse to a real intent and every word must be
 * decodable by the Vosk grammar (src/tests/voicePhrases.test.ts).
 */
export const SCOPE_PHRASES: Record<string, string[]> = {
  'Anywhere': [
    'open scales / chords / practice / free play / tuner',
    'go home',
    'start the metronome at ninety',
    'metronome off',
    'set tempo to one hundred',
    'slower / faster',
    'stop',
    'stop the mic',
    'repeat',
    'go back',
    'help',
    'voice off',
  ],
  'Scales': ['show me d major', 'e flat harmonic minor', 'left hand', 'play it'],
  'Chords': ['show me d minor seventh', 'first inversion', 'block / arpeggio', 'check my chord'],
  'Practice': ['practice five finger', 'finger exercise', 'sight reading', 'new melody', 'back to lessons'],
  'Lesson': ['demo', 'restart', 'next part', 'metronome on at eighty', 'slower / faster', 'start listening'],
  'Free Play': ['melody mode / chord mode', 'start listening', 'record at one hundred', 'stop recording', 'clear', 'copy the notes'],
  'Guide': ['show stage two', 'open stage four'],
  'Chord Path': ['show unit two', 'open unit five'],
  'Circle': ['show me e flat', 'b major', 'go back'],
  'Quizzes': ['hear it again', 'next'],
  'Note Detector': ['start listening', 'stop listening'],
}

/** 'slower / faster' → ['slower', 'faster']; single phrases pass through. */
export function expandPhrase(phrase: string): string[] {
  return phrase
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean)
}

/**
 * The examples the help command speaks aloud. Hard cap of two: three or more
 * "sounds like a menu" (ACIxD); the full list stays visual in the HUD.
 */
export const SPOKEN_HELP_EXAMPLES = ['show me D major', 'open practice']
