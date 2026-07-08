import { describe, expect, it } from 'vitest'
import {
  cosineSimilarity,
  DEFAULT_MARGIN,
  DEFAULT_THRESHOLD,
  matchIntent,
  matchIntentBanded,
  SUGGEST_THRESHOLD,
} from '../lib/voice/intentMatcher'

const v = (...xs: number[]) => new Float32Array(xs)

describe('cosineSimilarity', () => {
  it('identical / orthogonal / opposite unit vectors', () => {
    expect(cosineSimilarity(v(1, 0, 0), v(1, 0, 0))).toBeCloseTo(1, 6)
    expect(cosineSimilarity(v(1, 0, 0), v(0, 1, 0))).toBeCloseTo(0, 6)
    expect(cosineSimilarity(v(1, 0, 0), v(-1, 0, 0))).toBeCloseTo(-1, 6)
  })

  it('handles unnormalized vectors', () => {
    // dot = 24, |a| = |b| = 5 → 24/25
    expect(cosineSimilarity(v(3, 4), v(4, 3))).toBeCloseTo(24 / 25, 6)
  })

  it('throws on dimension mismatch', () => {
    expect(() => cosineSimilarity(v(1, 0), v(1, 0, 0))).toThrow(RangeError)
  })

  it('zero vector scores 0, not NaN', () => {
    expect(cosineSimilarity(v(0, 0), v(1, 1))).toBe(0)
    expect(cosineSimilarity(v(0, 0), v(0, 0))).toBe(0)
  })
})

describe('matchIntent', () => {
  // Two templates: group 0 has two examples, group 1 has one.
  const bank = [v(1, 0, 0), v(0, 1, 0), v(0, 0, 1)]
  const groups = [0, 0, 1]

  it('exact hit on an example wins its group', () => {
    const m = matchIntent(v(1, 0, 0), bank, groups)
    expect(m).toMatchObject({ index: 0, group: 0 })
    expect(m!.score).toBeCloseTo(1, 6)
  })

  it('empty bank → null', () => {
    expect(matchIntent(v(1, 0, 0), [], [])).toBeNull()
  })

  it('best score below threshold → null', () => {
    // cos = 1/√3 ≈ 0.577 against every bank vector
    const q = v(1, 1, 1)
    expect(cosineSimilarity(q, bank[0])).toBeCloseTo(1 / Math.sqrt(3), 6)
    expect(matchIntent(q, bank, groups, { threshold: 0.6, margin: 0 })).toBeNull()
  })

  it('runner-up within margin but in the SAME group still matches', () => {
    // Equidistant from both group-0 examples; far from group 1.
    const q = v(1, 1, 0)
    const m = matchIntent(q, bank, groups, { threshold: 0.6, margin: 0.1 })
    expect(m).not.toBeNull()
    expect(m!.group).toBe(0)
    expect(m!.margin).toBeCloseTo(Math.SQRT1_2, 6) // gap to group 1 (score 0)
  })

  it('best other-group vector within margin → null (ambiguous)', () => {
    // Nearly equidistant between group 0 and group 1.
    const q = v(1, 0, 0.98)
    expect(matchIntent(q, bank, groups, { threshold: 0.5, margin: 0.06 })).toBeNull()
  })

  it('single-group bank has infinite margin', () => {
    const m = matchIntent(v(1, 0, 0), [v(1, 0, 0)], [0], { threshold: 0.6, margin: 0.5 })
    expect(m).not.toBeNull()
    expect(m!.margin).toBe(Infinity)
  })

  it('zero query vector → null', () => {
    expect(matchIntent(v(0, 0, 0), bank, groups)).toBeNull()
  })

  it('throws when groups do not line up with the bank', () => {
    expect(() => matchIntent(v(1, 0, 0), bank, [0, 0])).toThrow(RangeError)
  })

  it('default gates are biased toward rejection', () => {
    expect(DEFAULT_THRESHOLD).toBeGreaterThanOrEqual(0.5)
    expect(DEFAULT_MARGIN).toBeGreaterThan(0)
    expect(SUGGEST_THRESHOLD).toBeLessThan(DEFAULT_THRESHOLD)
  })
})

describe('matchIntentBanded', () => {
  const bank = [v(1, 0, 0), v(0, 1, 0), v(0, 0, 1)]
  const groups = [0, 0, 1]
  const opts = { threshold: 0.6, margin: 0.06, suggestThreshold: 0.45 }

  it('strict-gate winner → accept', () => {
    expect(matchIntentBanded(v(1, 0, 0), bank, groups, opts)).toMatchObject({
      kind: 'accept',
      group: 0,
    })
  })

  it('above suggest floor but below threshold → suggest', () => {
    // cos ≈ 0.577 to each vector: fails threshold 0.6, clears 0.45.
    expect(matchIntentBanded(v(1, 1, 1), bank, groups, opts)).toMatchObject({ kind: 'suggest' })
  })

  it('clears threshold but fails the cross-group margin → suggest', () => {
    // Nearly equidistant between group 0 (≈0.714) and group 1 (≈0.700).
    const m = matchIntentBanded(v(1, 0, 0.98), bank, groups, { ...opts, threshold: 0.5 })
    expect(m).toMatchObject({ kind: 'suggest' })
    expect(m!.margin).toBeLessThan(0.06)
  })

  it('below the suggest floor → null', () => {
    expect(matchIntentBanded(v(0, 0, 0), bank, groups, opts)).toBeNull()
    // Weak similarity everywhere (≈0.33 with one strong axis missing).
    expect(matchIntentBanded(v(1, 3, 3), bank, groups, { ...opts, suggestThreshold: 0.8 })).toBeNull()
  })

  it('matchIntent is the accepts-only view of the banded match', () => {
    const q = v(1, 1, 1) // suggest band
    expect(matchIntentBanded(q, bank, groups, opts)).not.toBeNull()
    expect(matchIntent(q, bank, groups, opts)).toBeNull()
  })
})
