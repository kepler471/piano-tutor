import { INTENT_BANK, type IntentTemplate } from './intentBank'
import { matchIntent, type MatchOptions } from './intentMatcher'
import type { Intent } from './intents'

/**
 * Ties the intent bank to an embedding function: embeds every example once
 * (lazily, on first use), then resolves queries via nearest-neighbor match +
 * the winning template's slot resolution. Pure — the embedder is injected —
 * so vitest covers the whole decision path with deterministic vectors.
 */

export type EmbedFn = (texts: string[]) => Promise<Float32Array[]>

export interface FallbackResolver {
  /** Resolves once the bank is embedded; rejects if embedding the bank failed. */
  ready: Promise<void>
  /** null = no confident match (caller keeps the original unknown intent). */
  resolve(text: string): Promise<Intent | null>
}

export function createFallbackResolver(
  embed: EmbedFn,
  bank: readonly IntentTemplate[] = INTENT_BANK,
  opts: Partial<MatchOptions> = {},
): FallbackResolver {
  const templates: IntentTemplate[] = []
  const groups: number[] = []
  const examples: string[] = []
  bank.forEach((template, groupIndex) => {
    templates.push(template)
    for (const example of template.examples) {
      groups.push(groupIndex)
      examples.push(example)
    }
  })

  let bankVectors: Float32Array[] | null = null
  let embedding: Promise<void> | null = null
  const ensureBank = (): Promise<void> =>
    (embedding ??= embed(examples).then((vectors) => {
      bankVectors = vectors
    }))

  return {
    get ready() {
      return ensureBank()
    },
    async resolve(text: string): Promise<Intent | null> {
      await ensureBank()
      const [query] = await embed([text])
      const match = matchIntent(query, bankVectors!, groups, opts)
      if (!match) return null
      return templates[match.group].resolve(text)
    },
  }
}

/**
 * Monotonic sequence guard for async fallback resolution: each new utterance
 * takes a fresh number, and results from superseded utterances are dropped so
 * a slow embed can never dispatch behind a newer command.
 */
export function createSequenceGate(): { next(): number; isCurrent(seq: number): boolean } {
  let current = 0
  return {
    next: () => ++current,
    isCurrent: (seq) => seq === current,
  }
}
