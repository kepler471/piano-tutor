import { describe, expect, it } from 'vitest'
import { createFallbackResolver, createSequenceGate, type EmbedFn } from '../lib/voice/fallback'
import type { IntentTemplate } from '../lib/voice/intentBank'

/**
 * Deterministic fake embedder: each known phrase gets a one-hot vector, so
 * similarity is exact and the resolver's decision path is fully controlled
 * (mirrors the fake-env pattern of voiceDispatcher.test.ts).
 */
const DIM = 4
const VECTORS: Record<string, number[]> = {
  'alpha one': [1, 0, 0, 0],
  'alpha two': [0, 1, 0, 0],
  'beta one': [0, 0, 1, 0],
  'gamma one': [0, 0, 0, 1],
  // queries
  'sounds like alpha': [1, 0, 0, 0],
  'sounds like gamma': [0, 0, 0, 1],
  'off topic entirely': [0, 0, 0, 0],
  'somewhere in between': [1, 0, 1, 0],
}

function makeEmbed(): EmbedFn & { calls: string[][] } {
  const calls: string[][] = []
  const embed = async (texts: string[]) => {
    calls.push(texts)
    return texts.map((t) => {
      const vec = VECTORS[t]
      if (!vec) throw new Error(`no fake vector for "${t}"`)
      return new Float32Array(vec)
    })
  }
  embed.calls = calls
  return embed
}

const BANK: IntentTemplate[] = [
  { id: 'a', examples: ['alpha one', 'alpha two'], resolve: () => ({ kind: 'help' }) },
  { id: 'b', examples: ['beta one'], resolve: () => ({ kind: 'stop-all' }) },
  { id: 'c', examples: ['gamma one'], resolve: () => null }, // required slot always missing
]

const OPTS = { threshold: 0.6, margin: 0.06 }

describe('createFallbackResolver', () => {
  it('resolves a confident match to the winning template intent', async () => {
    const resolver = createFallbackResolver(makeEmbed(), BANK, OPTS)
    expect(await resolver.resolve('sounds like alpha')).toEqual({ kind: 'help' })
  })

  it('below-threshold query → null', async () => {
    const resolver = createFallbackResolver(makeEmbed(), BANK, OPTS)
    expect(await resolver.resolve('off topic entirely')).toBeNull()
  })

  it('cross-template ambiguity → null', async () => {
    // Equidistant between templates a and b (cos ≈ 0.707 to each).
    const resolver = createFallbackResolver(makeEmbed(), BANK, OPTS)
    expect(await resolver.resolve('somewhere in between')).toBeNull()
  })

  it('similarity hit whose resolve() returns null → overall null', async () => {
    const resolver = createFallbackResolver(makeEmbed(), BANK, OPTS)
    expect(await resolver.resolve('sounds like gamma')).toBeNull()
  })

  it('embeds the bank exactly once across many resolves', async () => {
    const embed = makeEmbed()
    const resolver = createFallbackResolver(embed, BANK, OPTS)
    await resolver.resolve('sounds like alpha')
    await resolver.resolve('sounds like gamma')
    await resolver.resolve('off topic entirely')
    // 1 bank call (all 4 examples) + 3 single-query calls.
    expect(embed.calls.length).toBe(4)
    expect(embed.calls[0]).toEqual(['alpha one', 'alpha two', 'beta one', 'gamma one'])
    for (const call of embed.calls.slice(1)) expect(call.length).toBe(1)
  })

  it('resolve before awaiting ready still works', async () => {
    const resolver = createFallbackResolver(makeEmbed(), BANK, OPTS)
    // No await of resolver.ready first — resolve must self-initialize.
    const result = await resolver.resolve('sounds like alpha')
    expect(result).toEqual({ kind: 'help' })
  })

  it('ready resolves after the bank embeds', async () => {
    const embed = makeEmbed()
    const resolver = createFallbackResolver(embed, BANK, OPTS)
    await resolver.ready
    expect(embed.calls.length).toBe(1)
  })

  it('embed failure propagates to the caller', async () => {
    const failing: EmbedFn = async () => {
      throw new Error('worker died')
    }
    const resolver = createFallbackResolver(failing, BANK, OPTS)
    await expect(resolver.resolve('sounds like alpha')).rejects.toThrow('worker died')
  })
})

describe('createSequenceGate', () => {
  it('only the newest sequence number is current', () => {
    const gate = createSequenceGate()
    const first = gate.next()
    expect(gate.isCurrent(first)).toBe(true)
    const second = gate.next()
    expect(gate.isCurrent(first)).toBe(false)
    expect(gate.isCurrent(second)).toBe(true)
  })
})
