import { describe, expect, it } from 'vitest'
import {
  ARMED_WINDOW_MS,
  CONFIRM_WINDOW_MS,
  CORRECTION_WINDOW_MS,
  createConvo,
  repromptFor,
} from '../lib/voice/convo'
import type { Intent } from '../lib/voice/intents'

/** Fake env in the style of voiceDispatcher.test.ts, with an injected clock. */
function makeEnv(opts: { handled?: (intent: Intent) => boolean } = {}) {
  let t = 0
  const spoken: { text: string; remember: boolean }[] = []
  const dispatched: Intent[] = []
  const misses: string[] = []
  const topics = [
    { scope: 'Anywhere', phrases: ['help', 'stop'] },
    { scope: 'Scales', phrases: ['show me d major', 'left hand / right hand'] },
  ]
  const env = {
    dispatch: (intent: Intent) => {
      dispatched.push(intent)
      const handled = opts.handled ? opts.handled(intent) : true
      return { handled, feedback: handled ? 'done' : '' }
    },
    say: (text: string, o?: { remember?: boolean }) =>
      spoken.push({ text, remember: o?.remember !== false }),
    activePhrases: () => topics,
    now: () => t,
    logMiss: (text: string) => misses.push(text),
  }
  return { env, spoken, dispatched, misses, topics, advance: (ms: number) => (t += ms) }
}

const DEMO: Intent = { kind: 'play-demo' }
const SLOWER: Intent = { kind: 'set-bpm', delta: -10 }

describe('repromptFor (escalating no-match reprompts)', () => {
  const topics = [
    { scope: 'Anywhere', phrases: ['help'] },
    { scope: 'Scales', phrases: ['show me d major', 'left hand / right hand'] },
  ]

  it('first miss → rapid reprompt', () => {
    expect(repromptFor(1, topics)).toBe('Sorry?')
  })

  it('second miss → two examples from the ACTIVE (top) scope', () => {
    const msg = repromptFor(2, topics)
    expect(msg).toBe('You can say: show me d major, or left hand.')
  })

  it('second miss falls back to the global scope when the top has no phrases', () => {
    const msg = repromptFor(2, [
      { scope: 'Anywhere', phrases: ['help'] },
      { scope: 'Empty', phrases: [] },
    ])
    expect(msg).toContain('help')
  })

  it('third miss → hand over to the visual list', () => {
    expect(repromptFor(3, topics)).toContain('What can I say')
  })

  it('never contains the wake word', () => {
    for (const misses of [1, 2, 3, 4]) {
      expect(repromptFor(misses, topics).toLowerCase()).not.toContain('piano')
    }
  })
})

describe('wake and the armed window', () => {
  it('wake says "Yes?" (not remembered) and arms', () => {
    const { env, spoken } = makeEnv()
    const convo = createConvo(env)
    expect(convo.isArmed()).toBe(false)
    expect(convo.onWake()).toBe('Yes?')
    expect(spoken).toEqual([{ text: 'Yes?', remember: false }])
    expect(convo.isArmed()).toBe(true)
  })

  it('armed window expires', () => {
    const { env, advance } = makeEnv()
    const convo = createConvo(env)
    convo.onWake()
    advance(ARMED_WINDOW_MS + 1)
    expect(convo.isArmed()).toBe(false)
  })
})

describe('dispatch outcomes', () => {
  it('a handled intent resets misses and opens the correction window', () => {
    const { env, advance } = makeEnv()
    const convo = createConvo(env)
    expect(convo.onIntent(DEMO)).toBe('done')
    expect(convo.isArmed()).toBe(true) // correction window
    advance(CORRECTION_WINDOW_MS + 1)
    expect(convo.isArmed()).toBe(false)
  })

  it('an unhandled real intent does not count as a miss and closes the window', () => {
    const { env, spoken } = makeEnv({ handled: () => false })
    const convo = createConvo(env)
    convo.onIntent(DEMO)
    expect(convo.isArmed()).toBe(false)
    // No convo meta-prompt: the dispatcher already spoke its screen hint.
    expect(spoken).toEqual([])
  })
})

describe('escalating misses', () => {
  it('escalates Sorry? → examples → visual list, then goes quiet until re-woken', () => {
    const { env, spoken, misses } = makeEnv()
    const convo = createConvo(env)
    expect(convo.onFallback(null, 'purple monkey')).toBe('Sorry?')
    expect(convo.isArmed()).toBe(true) // a reprompt is a question
    expect(convo.onFallback(null, 'purple monkey')).toContain('You can say')
    expect(convo.onFallback(null, 'purple monkey')).toContain('What can I say')
    expect(convo.isArmed()).toBe(false) // gave up — wake word required again
    expect(misses).toEqual(['purple monkey', 'purple monkey', 'purple monkey'])
    expect(spoken.every((s) => !s.remember)).toBe(true) // "repeat" never replays reprompts
  })

  it('a successful dispatch resets the escalation', () => {
    const { env } = makeEnv()
    const convo = createConvo(env)
    convo.onFallback(null, 'x')
    convo.onIntent(DEMO)
    expect(convo.onFallback(null, 'y')).toBe('Sorry?') // back to tier 1
  })
})

describe('one-step correction ("no, …")', () => {
  it('deny with a correction dispatches the correction', () => {
    const { env, dispatched } = makeEnv()
    const convo = createConvo(env)
    convo.onIntent(DEMO)
    convo.onIntent({ kind: 'deny', correction: SLOWER })
    expect(dispatched).toEqual([DEMO, SLOWER])
  })

  it('bare "no" inside a window → "My mistake." and stays armed, misses untouched', () => {
    const { env, spoken } = makeEnv()
    const convo = createConvo(env)
    convo.onIntent(DEMO)
    expect(convo.onIntent({ kind: 'deny' })).toBe('My mistake.')
    expect(spoken.at(-1)).toEqual({ text: 'My mistake.', remember: false })
    expect(convo.isArmed()).toBe(true)
    // Disconfirmation is not a no-match: the next miss is still tier 1.
    expect(convo.onFallback(null, 'x')).toBe('Sorry?')
  })

  it('bare "no" out of any window is ignored silently', () => {
    const { env, spoken } = makeEnv()
    const convo = createConvo(env)
    expect(convo.onIntent({ kind: 'deny' })).toBe('')
    expect(spoken).toEqual([])
  })
})

describe('did-you-mean confirmation', () => {
  const suggestion: Intent = { kind: 'metronome', action: 'start', bpm: 90 }

  it('suggest → "…— right?" prompt and confirming state', () => {
    const { env, spoken } = makeEnv()
    const convo = createConvo(env)
    const feedback = convo.onFallback({ kind: 'suggest', intent: suggestion }, 'give me clicks')
    expect(feedback).toBe('Start the metronome at 90 — right?')
    expect(spoken.at(-1)!.remember).toBe(false)
    expect(convo.isConfirming()).toBe(true)
  })

  it('"yes" dispatches the suggestion and opens the correction window', () => {
    const { env, dispatched } = makeEnv()
    const convo = createConvo(env)
    convo.onFallback({ kind: 'suggest', intent: suggestion }, 'give me clicks')
    expect(convo.onIntent({ kind: 'affirm' })).toBe('done')
    expect(dispatched).toEqual([suggestion])
    expect(convo.isConfirming()).toBe(false)
    expect(convo.isArmed()).toBe(true)
  })

  it('"no" declines with "My mistake.", not a no-match message', () => {
    const { env, dispatched } = makeEnv()
    const convo = createConvo(env)
    convo.onFallback({ kind: 'suggest', intent: suggestion }, 'give me clicks')
    expect(convo.onIntent({ kind: 'deny' })).toBe('My mistake.')
    expect(dispatched).toEqual([])
    expect(convo.onFallback(null, 'x')).toBe('Sorry?') // misses untouched by the decline
  })

  it('an unanswered confirmation expires silently', () => {
    const { env, dispatched, advance } = makeEnv()
    const convo = createConvo(env)
    convo.onFallback({ kind: 'suggest', intent: suggestion }, 'give me clicks')
    advance(CONFIRM_WINDOW_MS + 1)
    expect(convo.isConfirming()).toBe(false)
    convo.onIntent({ kind: 'affirm' }) // late yes is just a stray yes
    expect(dispatched).toEqual([])
  })

  it('a different full command overrides the pending suggestion', () => {
    const { env, dispatched } = makeEnv()
    const convo = createConvo(env)
    convo.onFallback({ kind: 'suggest', intent: suggestion }, 'give me clicks')
    convo.onIntent(DEMO)
    expect(dispatched).toEqual([DEMO])
    expect(convo.isConfirming()).toBe(false)
  })

  it('match outcome dispatches without confirmation', () => {
    const { env, dispatched } = makeEnv()
    const convo = createConvo(env)
    convo.onFallback({ kind: 'match', intent: suggestion }, 'give me clicks')
    expect(dispatched).toEqual([suggestion])
  })

  it('stray "yes" with nothing pending is a miss', () => {
    const { env } = makeEnv()
    const convo = createConvo(env)
    expect(convo.onIntent({ kind: 'affirm' })).toBe('Sorry?')
  })
})
