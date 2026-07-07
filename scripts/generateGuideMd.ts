/**
 * Regenerates docs/GUIDE.md from src/lib/data/guide.ts:
 *
 *   npm run guide:md
 *
 * The staleness test (src/tests/guideMarkdown.test.ts) fails until the
 * committed file matches the renderer, so run this after any guide change.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderGuideMarkdown } from '../src/lib/data/guideMarkdown'

const out = fileURLToPath(new URL('../docs/GUIDE.md', import.meta.url))
writeFileSync(out, renderGuideMarkdown())
console.log(`wrote ${out}`)
