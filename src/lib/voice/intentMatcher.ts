/**
 * Pure nearest-neighbor intent matching over sentence embeddings. No DOM or
 * model types here so vitest covers it directly; the embedder is injected
 * upstream (see fallback.ts).
 *
 * A query matches when its best-scoring bank vector clears DEFAULT_THRESHOLD
 * *and* beats the best vector of every other template by DEFAULT_MARGIN.
 * The margin is computed against other *groups* (templates), not the raw
 * runner-up, so several paraphrases of the same intent don't disqualify each
 * other. Both gates bias toward rejection: a wrong action is worse than
 * "Sorry, I didn't catch that."
 */

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new RangeError(`embedding dimension mismatch: ${a.length} vs ${b.length}`)
  }
  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  if (magA === 0 || magB === 0) return 0
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

export interface MatchOptions {
  /** Best score must reach this to match at all. */
  threshold: number
  /** Best score must beat the best score of every *other* group by this much. */
  margin: number
}

export interface MatchResult {
  /** Index into the bank of the winning vector. */
  index: number
  /** Group (template) id of the winner. */
  group: number
  score: number
  /** Gap to the best-scoring vector of any other group (Infinity if none). */
  margin: number
}

// Calibrated by src/tests/voiceEmbedding.integration.test.ts against the real
// model (positives ≥ 0.57, negatives ≤ 0.50, min cross-group gap 0.11);
// adjust there, not by hand.
export const DEFAULT_THRESHOLD = 0.55
export const DEFAULT_MARGIN = 0.06

export function matchIntent(
  query: Float32Array,
  bank: readonly Float32Array[],
  groups: readonly number[],
  opts: Partial<MatchOptions> = {},
): MatchResult | null {
  if (groups.length !== bank.length) {
    throw new RangeError(`groups length ${groups.length} does not match bank length ${bank.length}`)
  }
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD
  const margin = opts.margin ?? DEFAULT_MARGIN

  let best = -1
  let bestScore = -Infinity
  for (let i = 0; i < bank.length; i++) {
    const score = cosineSimilarity(query, bank[i])
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  }
  if (best < 0 || bestScore < threshold) return null

  let bestOther = -Infinity
  for (let i = 0; i < bank.length; i++) {
    if (groups[i] === groups[best]) continue
    const score = cosineSimilarity(query, bank[i])
    if (score > bestOther) bestOther = score
  }
  const gap = bestScore - bestOther // Infinity when no other group exists
  if (gap < margin) return null

  return { index: best, group: groups[best], score: bestScore, margin: gap }
}
