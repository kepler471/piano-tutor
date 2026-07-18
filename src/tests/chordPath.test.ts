import { describe, expect, it } from 'vitest'
import { CHORD_UNITS, METHOD_CHORD_UNIT, chordPathHref } from '../lib/data/chordPath'
import type { GuideLink } from '../lib/data/guide'
import { allLessons } from '../lib/data/lessons'
import { SONG_CATALOG } from '../lib/data/songs/catalog'
import { guideLinkMatcher } from '../lib/practice/guideProgress'
import { QUIZ_LEVEL_COUNTS } from '../lib/quiz/modes'
import { parseRoute } from '../lib/routing'
import { getChord } from '../lib/theory/chords'
import { getScale } from '../lib/theory/scales'

/**
 * Integrity tests for the chord path, mirroring guide.test.ts: every deep
 * link must resolve to real content, and everything under Practice / Check
 * must be completable (badge-able), so authoring mistakes fail CI.
 */

const KNOWN_ROUTES = new Set([
  '/',
  '/guide',
  '/chord-path',
  '/scales',
  '/chords',
  '/circle',
  '/practice',
  '/ear',
  '/quizzes',
  '/rhythm',
  '/songs',
  '/play',
  '/tuner',
])

const allLinks: { unitId: string; link: GuideLink }[] = CHORD_UNITS.flatMap((unit) => {
  const links = [...unit.practice, ...unit.check, ...unit.theory.flatMap((t) => t.links)]
  return links.map((link) => ({ unitId: unit.id, link }))
})

describe('chord path link integrity', () => {
  const lessonIds = new Set(allLessons().map((l) => l.id))
  const songIds = new Set(SONG_CATALOG.map((s) => s.id))

  it('lesson links resolve to real lesson ids', () => {
    for (const { unitId, link } of allLinks) {
      if (link.kind !== 'lesson') continue
      expect(lessonIds.has(link.lessonId), `${unitId}: lesson ${link.lessonId}`).toBe(true)
    }
  })

  it('song links resolve to catalog ids', () => {
    for (const { unitId, link } of allLinks) {
      if (link.kind !== 'song') continue
      expect(songIds.has(link.songId), `${unitId}: song ${link.songId}`).toBe(true)
    }
  })

  it('quiz links stay within each mode level range', () => {
    for (const { unitId, link } of allLinks) {
      if (link.kind !== 'quiz') continue
      const max = QUIZ_LEVEL_COUNTS[link.mode]
      expect(max, `${unitId}: quiz mode ${link.mode}`).toBeDefined()
      expect(link.level, `${unitId}: ${link.mode} level`).toBeGreaterThanOrEqual(1)
      expect(link.level, `${unitId}: ${link.mode} level`).toBeLessThanOrEqual(max)
    }
  })

  it('scale and chord links resolve in the theory library', () => {
    for (const { unitId, link } of allLinks) {
      if (link.kind === 'scale') {
        expect(() => getScale(link.root, link.type), `${unitId}: scale ${link.root} ${link.type}`).not.toThrow()
      }
      if (link.kind === 'chord') {
        expect(() => getChord(link.root, link.quality, 0), `${unitId}: chord ${link.root} ${link.quality}`).not.toThrow()
      }
    }
  })

  it('route links target known routes (query strings allowed)', () => {
    for (const { unitId, link } of allLinks) {
      if (link.kind !== 'route') continue
      const path = link.route.split('?')[0]
      expect(KNOWN_ROUTES.has(path), `${unitId}: route ${link.route}`).toBe(true)
    }
  })

  it('every href parses back to a known route and carries from=chord-path', () => {
    for (const { unitId, link } of allLinks) {
      const href = chordPathHref(link)
      expect(href.startsWith('#/'), `${unitId}: ${href}`).toBe(true)
      const { path, params } = parseRoute(href)
      expect(KNOWN_ROUTES.has(path), `${unitId}: ${href} → ${path}`).toBe(true)
      expect(params.from, `${unitId}: ${href}`).toBe('chord-path')
    }
  })

  it('every practice and check link is completable (earns a ✓ from history)', () => {
    for (const unit of CHORD_UNITS) {
      for (const link of [...unit.practice, ...unit.check]) {
        expect(guideLinkMatcher(link), `${unit.id}: '${link.label}' is not badge-able — move browse links into theory`).not.toBeNull()
      }
    }
  })
})

describe('method → chord-unit chips', () => {
  const unitIds = new Set(CHORD_UNITS.map((u) => u.id))

  it('every mapped unit id exists', () => {
    for (const [method, unitId] of Object.entries(METHOD_CHORD_UNIT)) {
      expect(unitIds.has(unitId), `${method} → ${unitId}`).toBe(true)
    }
  })

  it('every mapped method exists in the lesson registry', () => {
    const methods = new Set(allLessons().map((l) => l.method))
    for (const method of Object.keys(METHOD_CHORD_UNIT)) {
      expect(methods.has(method), `METHOD_CHORD_UNIT maps unknown method '${method}'`).toBe(true)
    }
  })

  it('every chord-path lesson method is mapped to a unit', () => {
    const chordMethods = ['Triad drills', 'Inversions', 'Diatonic chords', 'Cadence types', 'Progressions', 'Seventh chords', 'Accompaniment']
    for (const method of chordMethods) {
      expect(METHOD_CHORD_UNIT[method], `method '${method}' missing from METHOD_CHORD_UNIT`).toBeDefined()
    }
  })
})

describe('chord path unit content', () => {
  it('unit ids follow the unit-N pattern the voice show-unit command relies on', () => {
    CHORD_UNITS.forEach((unit, i) => {
      expect(unit.id).toBe(`unit-${i + 1}`)
    })
  })

  it('has unique unit ids and non-empty prose', () => {
    const ids = CHORD_UNITS.map((u) => u.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const unit of CHORD_UNITS) {
      expect(unit.title.length).toBeGreaterThan(0)
      expect(unit.tagline.length).toBeGreaterThan(0)
      expect(unit.overview.length).toBeGreaterThan(40)
      expect(unit.practice.length, `${unit.id} practice`).toBeGreaterThan(0)
      expect(unit.check.length, `${unit.id} check`).toBeGreaterThan(0)
      expect(unit.moveOnWhen.length, `${unit.id} moveOnWhen`).toBeGreaterThan(0)
      expect(unit.theory.length, `${unit.id} theory`).toBeGreaterThan(0)
      for (const section of unit.theory) {
        expect(section.body.length, `${unit.id}: ${section.title}`).toBeGreaterThan(80)
      }
    }
  })

  it('links have human-readable labels', () => {
    for (const { unitId, link } of allLinks) {
      expect(link.label.length, `${unitId}: ${JSON.stringify(link)}`).toBeGreaterThan(3)
    }
  })

  it('every unit points to external resources over https', () => {
    for (const unit of CHORD_UNITS) {
      expect(unit.resources.length, unit.id).toBeGreaterThan(0)
      for (const res of unit.resources) {
        expect(res.url.startsWith('https://'), `${unit.id}: ${res.title}`).toBe(true)
        expect(res.note.length, `${unit.id}: ${res.title}`).toBeGreaterThan(20)
      }
    }
  })
})
