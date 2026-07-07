// @vitest-environment node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GUIDE_STAGES } from '../lib/data/guide'
import { renderGuideMarkdown } from '../lib/data/guideMarkdown'

const GUIDE_MD = fileURLToPath(new URL('../../docs/GUIDE.md', import.meta.url))

describe('docs/GUIDE.md', () => {
  it('matches the renderer output (regenerate with `npm run guide:md`)', () => {
    const committed = readFileSync(GUIDE_MD, 'utf8')
    expect(committed).toBe(renderGuideMarkdown())
  })

  it('renders every stage and resource', () => {
    const md = renderGuideMarkdown()
    for (const stage of GUIDE_STAGES) {
      expect(md).toContain(`## ${stage.title}`)
      for (const res of stage.resources) expect(md).toContain(res.url)
    }
  })
})
