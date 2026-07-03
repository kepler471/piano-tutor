import { describe, expect, it } from 'vitest'
import { createDispatcher } from '../lib/voice/dispatcher'
import type { Intent, VoiceScopeSpec } from '../lib/voice/intents'

function makeEnv(startAt = 0) {
  let t = startAt
  const navigations: string[] = []
  const spoken: string[] = []
  return {
    env: { navigate: (r: string) => navigations.push(r), say: (s: string) => spoken.push(s), now: () => t },
    navigations,
    spoken,
    advance: (ms: number) => (t += ms),
  }
}

const scale: Intent = { kind: 'show-scale', root: 'D', scaleType: 'major' }

function scope(name: string, handler: (i: Intent) => { say?: string } | null): VoiceScopeSpec {
  return { name, phrases: [`${name} phrase`], handle: handler }
}

describe('dispatcher', () => {
  it('resolves through the scope stack top-down', () => {
    const { env } = makeEnv()
    const d = createDispatcher(env)
    const order: string[] = []
    d.register(scope('Practice', () => (order.push('practice'), { say: 'practice' })))
    d.register(scope('LessonPlayer', () => (order.push('lesson'), { say: 'lesson' })))
    const res = d.dispatch({ kind: 'play-demo' })
    expect(res).toEqual({ handled: true, feedback: 'lesson' })
    expect(order).toEqual(['lesson']) // top scope shadows the one beneath
  })

  it('falls through scopes that decline', () => {
    const { env } = makeEnv()
    const d = createDispatcher(env)
    d.register(scope('Bottom', () => ({ say: 'bottom' })))
    d.register(scope('Top', () => null))
    expect(d.dispatch({ kind: 'play-demo' }).feedback).toBe('bottom')
  })

  it('disposer removes the scope', () => {
    const { env, spoken } = makeEnv()
    const d = createDispatcher(env)
    const dispose = d.register(scope('Scales', () => ({ say: 'scales handled' })))
    dispose()
    d.dispatch(scale)
    expect(spoken.some((s) => s.includes('scales handled'))).toBe(false)
  })

  it('unhandled routed intent → navigate + pending replay on register (exactly once)', () => {
    const { env, navigations, spoken } = makeEnv()
    const d = createDispatcher(env)
    const res = d.dispatch(scale)
    expect(res.handled).toBe(true)
    expect(navigations).toEqual(['/scales'])
    expect(spoken[0]).toContain('Opening Scales')

    let handled = 0
    const dispose = d.register(
      scope('Scales', (i) => (i.kind === 'show-scale' ? (handled++, { say: 'D major' }) : null)),
    )
    expect(handled).toBe(1)
    expect(spoken).toContain('D major')

    // Re-registering (e.g. remount) must not replay again.
    dispose()
    d.register(scope('Scales', (i) => (i.kind === 'show-scale' ? (handled++, { say: 'again' }) : null)))
    expect(handled).toBe(1)
  })

  it('pending intent expires after the TTL', () => {
    const { env, advance } = makeEnv()
    const d = createDispatcher(env)
    d.dispatch(scale)
    advance(11_000)
    let handled = 0
    d.register(scope('Scales', () => (handled++, { say: 'late' })))
    expect(handled).toBe(0)
  })

  it('a new dispatch clears any stale pending intent', () => {
    const { env } = makeEnv()
    const d = createDispatcher(env)
    d.dispatch(scale) // pending show-scale
    d.dispatch({ kind: 'unknown', text: 'x' }) // clears it
    let handled = 0
    d.register(scope('Scales', () => (handled++, { say: 'no' })))
    expect(handled).toBe(0)
  })

  it('unknown intent → polite fallback, not handled', () => {
    const { env, spoken } = makeEnv()
    const d = createDispatcher(env)
    const res = d.dispatch({ kind: 'unknown', text: 'purple monkey' })
    expect(res.handled).toBe(false)
    expect(spoken[0]).toContain("didn't catch")
  })

  it('unhandled unroutable intent → screen hint', () => {
    const { env } = makeEnv()
    const d = createDispatcher(env)
    const res = d.dispatch({ kind: 'lesson', action: 'next' })
    expect(res.handled).toBe(false)
    expect(res.feedback).toContain("this screen")
  })

  it('activePhrases lists scopes bottom-up', () => {
    const { env } = makeEnv()
    const d = createDispatcher(env)
    d.register(scope('Global', () => null))
    d.register(scope('Chords', () => null))
    expect(d.activePhrases().map((p) => p.scope)).toEqual(['Global', 'Chords'])
  })
})
