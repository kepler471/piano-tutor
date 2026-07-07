import { describe, expect, it } from 'vitest'
import { GUIDE_STAGES, METHOD_GUIDE_STAGE, guideHref, type GuideLink } from '../lib/data/guide'
import { allLessons } from '../lib/data/lessons'
import { RHYTHM_PATTERNS } from '../lib/data/rhythms'
import { SONG_CATALOG } from '../lib/data/songs/catalog'
import { QUIZ_LEVEL_COUNTS } from '../lib/quiz/modes'
import { parseRoute } from '../lib/routing'
import { getChord } from '../lib/theory/chords'
import { getScale } from '../lib/theory/scales'

/**
 * Integrity tests for the learning guide: every deep link must resolve to
 * real content, so guide authoring mistakes fail CI instead of producing
 * dead links in the app.
 */

const KNOWN_ROUTES = new Set([
  '/',
  '/guide',
  '/scales',
  '/chords',
  '/practice',
  '/ear',
  '/quizzes',
  '/rhythm',
  '/songs',
  '/play',
  '/tuner',
])

const allLinks: { stageId: string; link: GuideLink }[] = GUIDE_STAGES.flatMap((stage) => {
  const links = [
    ...stage.technique,
    ...stage.repertoire,
    ...stage.ear,
    ...stage.rhythm,
    ...stage.sight,
    ...stage.theory.flatMap((t) => t.links),
  ]
  return links.map((link) => ({ stageId: stage.id, link }))
})

describe('guide link integrity', () => {
  const lessonIds = new Set(allLessons().map((l) => l.id))
  const songIds = new Set(SONG_CATALOG.map((s) => s.id))

  it('has at least one link per stage section that should never be empty', () => {
    for (const stage of GUIDE_STAGES) {
      expect(stage.technique.length, `${stage.id} technique`).toBeGreaterThan(0)
      expect(stage.repertoire.length, `${stage.id} repertoire`).toBeGreaterThan(0)
      expect(stage.ear.length, `${stage.id} ear`).toBeGreaterThan(0)
    }
  })

  it('lesson links resolve to real lesson ids', () => {
    for (const { stageId, link } of allLinks) {
      if (link.kind !== 'lesson') continue
      expect(lessonIds.has(link.lessonId), `${stageId}: lesson ${link.lessonId}`).toBe(true)
    }
  })

  it('song links resolve to catalog ids', () => {
    for (const { stageId, link } of allLinks) {
      if (link.kind !== 'song') continue
      expect(songIds.has(link.songId), `${stageId}: song ${link.songId}`).toBe(true)
    }
  })

  it('quiz links stay within each mode level range', () => {
    for (const { stageId, link } of allLinks) {
      if (link.kind !== 'quiz') continue
      const max = QUIZ_LEVEL_COUNTS[link.mode]
      expect(max, `${stageId}: quiz mode ${link.mode}`).toBeDefined()
      expect(link.level, `${stageId}: ${link.mode} level`).toBeGreaterThanOrEqual(1)
      expect(link.level, `${stageId}: ${link.mode} level`).toBeLessThanOrEqual(max)
    }
  })

  it('rhythm links point at levels that have patterns', () => {
    for (const { stageId, link } of allLinks) {
      if (link.kind !== 'rhythm') continue
      const patterns = RHYTHM_PATTERNS.filter((p) => p.level === link.level)
      expect(patterns.length, `${stageId}: rhythm level ${link.level}`).toBeGreaterThan(0)
    }
  })

  it('scale and chord links resolve in the theory library', () => {
    for (const { stageId, link } of allLinks) {
      if (link.kind === 'scale') {
        expect(() => getScale(link.root, link.type), `${stageId}: scale ${link.root} ${link.type}`).not.toThrow()
      }
      if (link.kind === 'chord') {
        expect(
          () => getChord(link.root, link.quality, 0),
          `${stageId}: chord ${link.root} ${link.quality}`,
        ).not.toThrow()
      }
    }
  })

  it('route links target known routes', () => {
    for (const { stageId, link } of allLinks) {
      if (link.kind !== 'route') continue
      expect(KNOWN_ROUTES.has(link.route), `${stageId}: route ${link.route}`).toBe(true)
    }
  })

  it('every href parses back to a known route', () => {
    for (const { stageId, link } of allLinks) {
      const href = guideHref(link)
      expect(href.startsWith('#/'), `${stageId}: ${href}`).toBe(true)
      const { path } = parseRoute(href)
      expect(KNOWN_ROUTES.has(path), `${stageId}: ${href} → ${path}`).toBe(true)
    }
  })

  it('every href carries from=guide so target screens can offer a way back', () => {
    for (const { stageId, link } of allLinks) {
      const { params } = parseRoute(guideHref(link))
      expect(params.from, `${stageId}: ${guideHref(link)}`).toBe('guide')
    }
  })
})

describe('method → guide-stage chips', () => {
  const stageIds = new Set(GUIDE_STAGES.map((s) => s.id))

  it('every mapped stage id exists', () => {
    for (const [method, stageId] of Object.entries(METHOD_GUIDE_STAGE)) {
      expect(stageIds.has(stageId), `${method} → ${stageId}`).toBe(true)
    }
  })

  it('every lesson method (plus sight-reading) has a mapping', () => {
    const methods = new Set([...allLessons().map((l) => l.method), 'Sight-reading'])
    for (const method of methods) {
      expect(METHOD_GUIDE_STAGE[method], `method '${method}' missing from METHOD_GUIDE_STAGE`).toBeDefined()
    }
  })
})

describe('guide stage content', () => {
  it('has unique stage ids and non-empty prose', () => {
    const ids = GUIDE_STAGES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const stage of GUIDE_STAGES) {
      expect(stage.title.length).toBeGreaterThan(0)
      expect(stage.gradeEquivalent.length).toBeGreaterThan(0)
      expect(stage.overview.length).toBeGreaterThan(40)
      expect(stage.goals.length).toBeGreaterThan(0)
      expect(stage.weeklyPlan.items.length).toBeGreaterThan(0)
      expect(stage.weeklyPlan.totalMinutes).toBeGreaterThan(0)
      expect(stage.moveOnWhen.length).toBeGreaterThan(0)
      expect(stage.theory.length).toBeGreaterThan(0)
      for (const section of stage.theory) {
        expect(section.body.length, `${stage.id}: ${section.title}`).toBeGreaterThan(80)
      }
    }
  })

  it('links have human-readable labels', () => {
    for (const { stageId, link } of allLinks) {
      expect(link.label.length, `${stageId}: ${JSON.stringify(link)}`).toBeGreaterThan(3)
    }
  })

  it('every stage points to external resources over https', () => {
    for (const stage of GUIDE_STAGES) {
      expect(stage.resources.length, stage.id).toBeGreaterThan(2)
      for (const res of stage.resources) {
        expect(res.url.startsWith('https://'), `${stage.id}: ${res.title}`).toBe(true)
        expect(res.note.length, `${stage.id}: ${res.title}`).toBeGreaterThan(20)
      }
    }
  })

  it('stage ids follow the stage-N pattern the voice show-stage command relies on', () => {
    GUIDE_STAGES.forEach((stage, i) => {
      expect(stage.id).toBe(`stage-${i + 1}`)
    })
  })
})
