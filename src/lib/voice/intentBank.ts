import type { Intent } from './intents'
import { extractSlots, normalizeTranscript } from './parser'

/**
 * Example-phrase bank for the embedding-based intent fallback. Each template
 * pairs paraphrases (embedded once at load) with a resolve() that re-reads
 * slots from the *actual* transcript, so "can we go at seventy" matches the
 * "can we go at ninety" example but resolves to bpm 70. resolve() returning
 * null (required slot missing) counts as a miss — the caller falls back to
 * "Sorry, I didn't catch that" rather than guessing.
 *
 * Authoring rules (enforced by src/tests/voiceIntentBank.test.ts):
 * - lowercase a–z words only; every word is auto-added to the Vosk grammar
 *   via bankGrammarWords(), so examples define their own vocabulary.
 * - examples should be phrasings the regex parser does NOT already catch —
 *   the fallback only ever sees {kind:'unknown'} transcripts.
 * - notably absent: show-scale / show-chord / open-lesson templates. Any
 *   transcript containing a detectable note root or lesson keyword is always
 *   consumed by the regex fast path first, so such templates are unreachable
 *   here (and rootless phrasings could never fill their required slots).
 */
export interface IntentTemplate {
  id: string
  examples: string[]
  resolve(text: string): Intent | null
}

const fixed = (id: string, examples: string[], intent: Intent): IntentTemplate => ({
  id,
  examples,
  resolve: () => intent,
})

export const INTENT_BANK: readonly IntentTemplate[] = [
  // --- navigation ---
  fixed('nav-home', [
    'take me back home',
    'lets go back to the main menu',
    'back to the start screen please',
  ], { kind: 'navigate', route: '/' }),
  fixed('nav-guide', [
    'where do i start',
    'where should i begin',
    'show me the learning path',
  ], { kind: 'navigate', route: '/guide' }),
  fixed('nav-scales', [
    'can you open up the scales for me',
    'i would like to look at some scales',
    'where are all the scales',
  ], { kind: 'navigate', route: '/scales' }),
  fixed('nav-chords', [
    'can you show me the chords page',
    'i want to see the chords',
    'where are all the chords',
  ], { kind: 'navigate', route: '/chords' }),
  fixed('nav-practice', [
    'i want to practice something now',
    'what should i practice today',
    'lets do some practicing',
  ], { kind: 'navigate', route: '/practice' }),
  fixed('nav-play', [
    'i just want to play around',
    'let me play whatever i like',
    'time for some free playing',
  ], { kind: 'navigate', route: '/play' }),
  fixed('nav-tuner', [
    'what note is this',
    'tell me what note i am playing',
    'can you name the note i play',
  ], { kind: 'navigate', route: '/tuner' }),

  // --- metronome / tempo ---
  {
    id: 'metronome-start',
    examples: [
      'give me a beat',
      'give me a beat at ninety',
      'i need a steady beat please',
      'count me in',
    ],
    resolve: (text) => ({ kind: 'metronome', action: 'start', bpm: extractSlots(text).bpm }),
  },
  fixed('metronome-stop', [
    'no more beat please',
    'that beat can stop now',
    'i do not need the beat any more',
  ], { kind: 'metronome', action: 'stop' }),
  {
    // Faster/slower live in ONE template: antonyms sit too close in embedding
    // space to survive a cross-group margin, so the direction is a required
    // slot read from the transcript instead.
    id: 'bpm-relative',
    examples: [
      'a little faster please',
      'pick up the pace a bit',
      'can we go a bit faster',
      'a little slower please',
      'bring it down a notch',
      'can we take it slower',
    ],
    resolve: (text) => {
      if (/faster|pick up|speed up/.test(text)) return { kind: 'set-bpm', delta: 10 }
      if (/slower|slow|down/.test(text)) return { kind: 'set-bpm', delta: -10 }
      return null
    },
  },
  {
    id: 'bpm-absolute',
    examples: [
      'can we go at ninety',
      'make it ninety please',
      'make it one hundred and twenty',
      'lets try ninety beats a minute',
    ],
    resolve: (text) => {
      const bpm = extractSlots(text).bpm
      return bpm === undefined ? null : { kind: 'set-bpm', bpm }
    },
  },

  // --- demo playback ---
  fixed('demo-play', [
    'let me hear it',
    'can you play that for me',
    'how does it sound',
  ], { kind: 'play-demo' }),
  {
    // Arpeggio/block are contrasting styles of the same request; like
    // bpm-relative, one template with the style read from the transcript.
    id: 'demo-style',
    examples: [
      'one note at a time please',
      'play them one after another',
      'let me hear the notes one at a time',
      'note by note please',
      'all the notes at once',
      'play them all together',
      'everything at the same time',
    ],
    resolve: (text) => {
      if (/at once|together|same time/.test(text))
        return { kind: 'play-demo', variant: 'block' }
      if (/at a time|after another|note by note|one by one/.test(text))
        return { kind: 'play-demo', variant: 'arpeggio' }
      return null
    },
  },

  // --- lesson flow ---
  fixed('lesson-next', [
    'lets move on',
    'i am ready for the next one',
    'keep going',
  ], { kind: 'lesson', action: 'next' }),
  fixed('lesson-previous', [
    'go back one step',
    'lets do the one before',
    'take me back a step',
  ], { kind: 'lesson', action: 'previous' }),
  fixed('lesson-restart', [
    'lets take it from the top',
    'one more time from the beginning',
    'one more time please',
    'can we do it over',
  ], { kind: 'lesson', action: 'restart' }),
  fixed('lesson-exit', [
    'i am done with this lesson',
    'lets stop the lesson here',
    'get me out of this lesson',
  ], { kind: 'lesson', action: 'exit' }),

  // --- free play ---
  fixed('freeplay-record', [
    'write down what i play',
    'write the notes down for me',
    'keep track of the notes i play',
    'remember what i am about to play',
  ], { kind: 'free-play', action: 'record' }),
  fixed('freeplay-clear', [
    'wipe the notes away',
    'give me a fresh page',
    'delete everything and start fresh',
  ], { kind: 'free-play', action: 'clear' }),

  // --- pitch-detection mic ---
  fixed('mic-start', [
    'tell me if i am playing this right',
    'am i playing it right',
    'check whether i play the right notes',
  ], { kind: 'mic', action: 'start' }),

  // --- global ---
  fixed('help', [
    'what am i able to say',
    'i do not know what to say',
    'what are my options here',
  ], { kind: 'help' }),
  fixed('stop-all', [
    'that is enough',
    'enough of that',
    'please be quiet now',
  ], { kind: 'stop-all' }),
  fixed('voice-off', [
    'i am done talking to you',
    'no more voice control please',
    'time for you to sleep now',
  ], { kind: 'voice-off' }),
]

/** Unique words across all examples — merged into the Vosk grammar. */
export function bankGrammarWords(): string[] {
  const words = new Set<string>()
  for (const template of INTENT_BANK) {
    for (const example of template.examples) {
      for (const w of normalizeTranscript(example).split(' ').filter(Boolean)) words.add(w)
    }
  }
  return [...words]
}
