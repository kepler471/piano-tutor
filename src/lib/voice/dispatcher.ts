import { ROUTE_FOR_KIND, type Intent, type VoiceScopeSpec } from './intents'

/**
 * Routes parsed intents to command scopes. Screens register a scope while
 * mounted; resolution walks the stack top-down (most recently registered
 * first), so a nested LessonPlayer shadows the Practice screen beneath it.
 * Intents no scope handles but that belong to a known screen trigger a
 * navigate + pending-intent replay: the intent is stashed and re-dispatched
 * when the target screen registers its scope on mount.
 *
 * Pure (env is injected) so vitest covers it without a browser.
 */

export interface DispatchEnv {
  navigate(route: string): void
  say(text: string): void
  /** Injectable clock for tests; defaults to Date.now. */
  now?: () => number
}

const PENDING_TTL_MS = 10_000

const SCREEN_NAME_FOR_ROUTE: Record<string, string> = {
  '/guide': 'the Guide',
  '/scales': 'Scales',
  '/chords': 'Chords',
  '/practice': 'Practice',
  '/play': 'Free Play',
  '/tuner': 'Note Detector',
}

export interface Dispatcher {
  /** Pushes a scope onto the stack; returns a disposer. Replays a pending intent if this scope handles it. */
  register(scope: VoiceScopeSpec): () => void
  dispatch(intent: Intent): { handled: boolean; feedback: string }
  /** All example phrases, global scope first, for the help HUD. */
  activePhrases(): { scope: string; phrases: string[] }[]
}

export function createDispatcher(env: DispatchEnv): Dispatcher {
  const now = env.now ?? Date.now
  const stack: VoiceScopeSpec[] = []
  let pending: { intent: Intent; expiresAt: number } | null = null

  function tryScopes(intent: Intent): { say?: string } | null {
    for (let i = stack.length - 1; i >= 0; i--) {
      const outcome = stack[i].handle(intent)
      if (outcome) return outcome
    }
    return null
  }

  function register(scope: VoiceScopeSpec): () => void {
    stack.push(scope)
    if (pending && now() < pending.expiresAt) {
      const outcome = scope.handle(pending.intent)
      if (outcome) {
        pending = null
        if (outcome.say) env.say(outcome.say)
      }
    } else {
      pending = null
    }
    return () => {
      const i = stack.indexOf(scope)
      if (i >= 0) stack.splice(i, 1)
    }
  }

  function dispatch(intent: Intent): { handled: boolean; feedback: string } {
    pending = null
    const outcome = tryScopes(intent)
    if (outcome) {
      if (outcome.say) env.say(outcome.say)
      return { handled: true, feedback: outcome.say ?? '' }
    }

    if (intent.kind === 'unknown') {
      const feedback = "Sorry, I didn't catch that. Say help for commands."
      env.say(feedback)
      return { handled: false, feedback }
    }

    const route = ROUTE_FOR_KIND[intent.kind]
    if (route) {
      pending = { intent, expiresAt: now() + PENDING_TTL_MS }
      env.navigate(route)
      const feedback = `Opening ${SCREEN_NAME_FOR_ROUTE[route] ?? route}.`
      env.say(feedback)
      return { handled: true, feedback }
    }

    const feedback = "I can't do that on this screen."
    env.say(feedback)
    return { handled: false, feedback }
  }

  function activePhrases(): { scope: string; phrases: string[] }[] {
    return stack.map((s) => ({ scope: s.name, phrases: s.phrases }))
  }

  return { register, dispatch, activePhrases }
}
