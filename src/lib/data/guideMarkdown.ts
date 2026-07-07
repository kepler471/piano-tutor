import { GUIDE_STAGES, guideHref, type GuideLink, type GuideStage } from './guide'

/**
 * Renders the learning guide as markdown for docs/GUIDE.md — the readable/
 * printable twin of the in-app Guide screen. guide.ts is the single source
 * of truth; src/tests/guideMarkdown.test.ts fails if the committed file
 * drifts from this renderer's output (regenerate with `npm run guide:md`).
 */

const linkLine = (link: GuideLink): string => `- ${link.label} — \`${guideHref(link)}\``

function stageMarkdown(stage: GuideStage): string {
  const parts: string[] = []
  parts.push(`## ${stage.title}`)
  parts.push(`*${stage.gradeEquivalent}*`)
  parts.push(stage.overview)

  parts.push(`### You're working towards`)
  parts.push(stage.goals.map((g) => `- ${g}`).join('\n'))

  const groups: [string, GuideLink[]][] = [
    ['Technique', stage.technique],
    ['Pieces', stage.repertoire],
    ['Ear', stage.ear],
    ['Rhythm', stage.rhythm],
    ['Sight-reading', stage.sight],
  ]
  parts.push('### Practice material')
  parts.push(
    'The `#/...` paths are in-app links — open the app and paste one after its URL, or find the same item from the screen it names.',
  )
  for (const [label, links] of groups) {
    if (links.length === 0) continue
    parts.push(`**${label}**`)
    parts.push(links.map(linkLine).join('\n'))
  }

  for (const section of stage.theory) {
    parts.push(`### ${section.title}`)
    parts.push(section.body)
    if (section.links.length) parts.push(section.links.map(linkLine).join('\n'))
  }

  parts.push(`### A week at this stage (~${stage.weeklyPlan.totalMinutes} min/day)`)
  parts.push(stage.weeklyPlan.items.map((i) => `- ${i}`).join('\n'))

  parts.push('### Beyond the app')
  parts.push(stage.resources.map((r) => `- [${r.title}](${r.url}) — ${r.note}`).join('\n'))

  parts.push('### Move on when…')
  parts.push(stage.moveOnWhen.map((m) => `- ${m}`).join('\n'))

  return parts.join('\n\n')
}

export function renderGuideMarkdown(stages: readonly GuideStage[] = GUIDE_STAGES): string {
  const header = [
    '<!-- Generated from src/lib/data/guide.ts by `npm run guide:md` — do not edit by hand. -->',
    '',
    '# Piano Tutor — Learning Guide',
    '',
    'A path from your first notes to early intermediate playing (~ABRSM Grade 4), using',
    'everything in the app and pointing to the outside learning worth adding along the way.',
    'Nothing is tracked and nothing unlocks: read a stage, practice from it, and move on when',
    'it feels secure. Twenty focused minutes a day outruns a two-hour Sunday.',
    '',
  ].join('\n')
  return header + '\n' + stages.map(stageMarkdown).join('\n\n---\n\n') + '\n'
}
