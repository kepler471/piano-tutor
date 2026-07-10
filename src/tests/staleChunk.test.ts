import { describe, expect, it } from 'vitest'
import { isStaleChunkError } from '../lib/voice/staleChunk'

describe('isStaleChunkError', () => {
  it('matches each browser wording for a failed dynamic import', () => {
    // Chrome
    expect(
      isStaleChunkError(
        new TypeError('Failed to fetch dynamically imported module: https://x/assets/vosk-Dloz6gaQ.js'),
      ),
    ).toBe(true)
    // Firefox
    expect(
      isStaleChunkError(
        new TypeError('error loading dynamically imported module: https://x/assets/vosk-Dloz6gaQ.js'),
      ),
    ).toBe(true)
    // Safari
    expect(isStaleChunkError(new TypeError('Importing a module script failed.'))).toBe(true)
  })

  it('rejects unrelated errors', () => {
    expect(isStaleChunkError(new TypeError('x is not a function'))).toBe(false)
    // Same message but not a TypeError — a wrapped/re-thrown error, not the import failure itself.
    expect(isStaleChunkError(new Error('error loading dynamically imported module: y'))).toBe(false)
    expect(isStaleChunkError('error loading dynamically imported module')).toBe(false)
    expect(isStaleChunkError(null)).toBe(false)
  })
})
