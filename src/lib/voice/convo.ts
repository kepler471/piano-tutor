import { describeIntent } from './describe'
import type { FallbackOutcome } from './fallback'
import type { Intent } from './intents'
import { expandPhrase } from './phrases'

/**
 * Pure conversation state machine sitting between the parser and the
 * dispatcher: owns the armed window (commands without the wake word), the
 * escalating no-match reprompts, the post-command correction window ("no,
 * d minor"), and the "did you mean — right?" confirmation for uncertain
 * fallback matches. Env is injected (dispatcher.ts pattern) so vitest covers
 * every transition without a browser.
 *
 * Windows are timestamps checked lazily on the next utterance — no timers —
 * so an expired confirmation simply drops silently.
 *
 * False-positive exposure from the piano itself is small: notes decode as
 * [unk] under the grammar and the recognizer is deaf during playback/TTS, so
 * a window only risks a misheard *speech-like* utterance; a stray bare "no"
 * costs one "My mistake."
 */

export interface ConvoEnv {
  dispatch(intent: Intent): { handled: boolean; feedback: string }
  /** remember:false marks meta-prompts that "repeat" must not replay. */
  say(text: string, opts?: { remember?: boolean }): void
  /** Advertised phrases per active scope, global first (dispatcher order). */
  activePhrases(): { scope: string; phrases: string[] }[]
  /** Injectable clock for tests; defaults to Date.now. */
  now?: () => number
  /** Optional hook recording unrecognized transcripts for grammar tuning. */
  logMiss?(text: string): void
}

export const ARMED_WINDOW_MS = 8000
export const CORRECTION_WINDOW_MS = 5000
export const CONFIRM_WINDOW_MS = 8000
/** After this many consecutive misses the convo gives up until re-woken. */
const MAX_MISSES = 3

/**
 * Escalating no-match reprompts (ACIxD "stepping stones and safety nets"):
 * rapid reprompt first, then context examples, then hand over to the visual
 * list — the multimodal equivalent of an IVR's touchtone fallback.
 */
export function repromptFor(
  misses: number,
  topics: { scope: string; phrases: string[] }[],
): string {
  if (misses <= 1) return 'Sorry?'
  if (misses === 2) {
    // Two examples from the active screen's scope (last registered), falling
    // back to the global scope.
    const source = [...topics].reverse().find((t) => t.phrases.length > 0)
    const examples = (source?.phrases ?? []).flatMap(expandPhrase).slice(0, 2)
    if (examples.length > 0) return `You can say: ${examples.join(', or ')}.`
  }
  return "Tap 'What can I say' for the full list."
}

export interface Convo {
  /** True while armed or confirming — commands then need no wake word. */
  isArmed(): boolean
  isConfirming(): boolean
  /** Bare wake word: "Yes?" + armed window. Returns the HUD feedback. */
  onWake(): string
  /** Any parsed non-wake, non-unknown intent. Returns the HUD feedback. */
  onIntent(intent: Intent): string
  /** Outcome of the embedding fallback for an unknown utterance. */
  onFallback(outcome: FallbackOutcome, text: string): string
}

export function createConvo(env: ConvoEnv): Convo {
  const now = env.now ?? Date.now
  let mode: 'idle' | 'armed' | 'confirming' = 'idle'
  let until = 0
  let suggestion: Intent | null = null
  let misses = 0

  function expire(): void {
    if (mode !== 'idle' && now() > until) reset()
  }

  function reset(): void {
    mode = 'idle'
    until = 0
    suggestion = null
  }

  function arm(ms: number): void {
    mode = 'armed'
    until = now() + ms
    suggestion = null
  }

  /** Speaks a conversation meta-prompt ("repeat" must not replay these). */
  function meta(text: string): string {
    env.say(text, { remember: false })
    return text
  }

  function dispatchIntent(intent: Intent): string {
    suggestion = null
    const result = env.dispatch(intent)
    if (result.handled) {
      misses = 0
      // Correction window: "no, d minor" may follow without the wake word.
      arm(CORRECTION_WINDOW_MS)
    } else {
      // A real intent the current screen can't handle ("I can't do that on
      // this screen.") — recognition worked, so it is not a miss.
      reset()
    }
    return result.feedback
  }

  function miss(text?: string): string {
    misses++
    if (text) env.logMiss?.(text)
    if (misses >= MAX_MISSES) {
      // Final tier: hand over to the visual list and stop reprompting until
      // the user wakes the app again.
      const feedback = meta(repromptFor(misses, env.activePhrases()))
      reset()
      misses = 0
      return feedback
    }
    // Stay armed: a reprompt is a question, the retry needs no wake word.
    arm(ARMED_WINDOW_MS)
    return meta(repromptFor(misses, env.activePhrases()))
  }

  return {
    isArmed() {
      expire()
      return mode !== 'idle'
    },

    isConfirming() {
      expire()
      return mode === 'confirming'
    },

    onWake() {
      arm(ARMED_WINDOW_MS)
      return meta('Yes?')
    },

    onIntent(intent: Intent): string {
      expire()
      if (intent.kind === 'affirm') {
        if (mode === 'confirming' && suggestion) return dispatchIntent(suggestion)
        // A stray "yes" with nothing pending — treat like a no-match.
        return miss()
      }
      if (intent.kind === 'deny') {
        if (intent.correction) return dispatchIntent(intent.correction)
        if (mode !== 'idle') {
          // Disconfirmation is not a no-match (misses untouched); stay armed
          // so the restated command needs no wake word.
          arm(ARMED_WINDOW_MS)
          return meta('My mistake.')
        }
        return '' // stray "no" out of any window — ignore silently
      }
      return dispatchIntent(intent)
    },

    onFallback(outcome: FallbackOutcome, text: string): string {
      expire()
      if (outcome?.kind === 'match') return dispatchIntent(outcome.intent)
      if (outcome?.kind === 'suggest') {
        const paraphrase = describeIntent(outcome.intent)
        if (paraphrase) {
          mode = 'confirming'
          until = now() + CONFIRM_WINDOW_MS
          suggestion = outcome.intent
          return meta(`${paraphrase.charAt(0).toUpperCase()}${paraphrase.slice(1)} — right?`)
        }
      }
      return miss(text)
    },
  }
}
