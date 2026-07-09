import { describe, expect, it } from 'vitest'
import { GUIDE_STAGES, type GuideLink } from '../lib/data/guide'
import { RHYTHM_PATTERNS } from '../lib/data/rhythms'
import { guideItemStats, guideLinkMatcher } from '../lib/practice/guideProgress'
import { makeSightReading } from '../lib/sightread/generator'

const NOW = new Date('2026-07-09T18:00:00Z')

function rec(lessonId: string, daysAgo = 0): { lessonId: string; at: string } {
  const d = new Date(NOW)
  d.setDate(d.getDate() - daysAgo)
  return { lessonId, at: d.toISOString() }
}

describe('guideLinkMatcher', () => {
  it('matches lessons by their id', () => {
    const link: GuideLink = { kind: 'lesson', lessonId: 'scale-C-major', label: 'C major scale' }
    expect(guideLinkMatcher(link)).toEqual({ ids: ['scale-C-major'] })
  })

  it('matches songs by the song- prefixed record id (as SongPlayer writes it)', () => {
    const link: GuideLink = { kind: 'song', songId: 'ode-to-joy', label: 'Ode to Joy' }
    expect(guideLinkMatcher(link)).toEqual({ ids: ['song-ode-to-joy'] })
  })

  it('matches quizzes by mode only (level lives in segment prose)', () => {
    const link: GuideLink = { kind: 'quiz', mode: 'intervals', level: 2, label: 'Intervals' }
    expect(guideLinkMatcher(link)).toEqual({ ids: ['quiz-intervals'] })
  })

  it('returns null for reference-only links', () => {
    expect(guideLinkMatcher({ kind: 'scale', root: 'C', type: 'major', label: 'C major' })).toBeNull()
    expect(guideLinkMatcher({ kind: 'chord', root: 'C', quality: 'major', label: 'C' })).toBeNull()
    expect(guideLinkMatcher({ kind: 'route', route: '/circle', label: 'Circle' })).toBeNull()
  })
})

describe('record id formats pinned against the writers', () => {
  it('rhythm pattern ids all start with their level prefix', () => {
    // RhythmTrainer writes `rhythm-${pattern.id}`; the guide matcher relies on
    // every level-N pattern id starting `l${N}-`.
    for (const p of RHYTHM_PATTERNS) {
      expect(p.id.startsWith(`l${p.level}-`)).toBe(true)
    }
    const stats = guideItemStats(
      { kind: 'rhythm', level: 2, label: 'Eighths' },
      [rec(`rhythm-${RHYTHM_PATTERNS.find((p) => p.level === 2)!.id}`)],
      NOW,
    )
    expect(stats?.count).toBe(1)
  })

  it('sight-reading lesson ids match the sight matcher prefix', () => {
    const lesson = makeSightReading(3, 42)
    const stats = guideItemStats({ kind: 'sight', level: 3, label: 'Level 3' }, [rec(lesson.id)], NOW)
    expect(stats?.count).toBe(1)
    // …and a different level's lesson does not match.
    const other = guideItemStats({ kind: 'sight', level: 2, label: 'Level 2' }, [rec(lesson.id)], NOW)
    expect(other?.count).toBe(0)
  })
})

describe('guideItemStats', () => {
  const link: GuideLink = { kind: 'lesson', lessonId: 'hanon-1', label: 'Hanon' }

  it('counts matches and reports the most recent timestamp', () => {
    const stats = guideItemStats(link, [rec('hanon-1', 10), rec('hanon-1', 2), rec('other', 1)], NOW)
    expect(stats).toMatchObject({ count: 2, recent: true })
    expect(stats!.lastAt).toBe(rec('hanon-1', 2).at)
  })

  it('is not recent when the last practice is over seven days old', () => {
    expect(guideItemStats(link, [rec('hanon-1', 9)], NOW)).toMatchObject({ count: 1, recent: false })
  })

  it('returns zero stats when never practiced', () => {
    expect(guideItemStats(link, [rec('other')], NOW)).toEqual({ count: 0, lastAt: null, recent: false })
  })

  it('returns null for reference-only links', () => {
    expect(guideItemStats({ kind: 'route', route: '/circle', label: 'Circle' }, [], NOW)).toBeNull()
  })
})

describe('guide integrity', () => {
  it('every guide link is either matchable or an intentional reference link', () => {
    const referenceKinds = new Set(['scale', 'chord', 'route'])
    for (const stage of GUIDE_STAGES) {
      const links: GuideLink[] = [
        ...stage.technique,
        ...stage.repertoire,
        ...stage.ear,
        ...stage.rhythm,
        ...stage.sight,
        ...stage.theory.flatMap((t) => t.links),
      ]
      for (const link of links) {
        const matcher = guideLinkMatcher(link)
        if (matcher === null) {
          expect(referenceKinds.has(link.kind), `${stage.id}: ${link.label} (${link.kind})`).toBe(true)
        } else {
          expect((matcher.ids?.length ?? 0) + (matcher.prefixes?.length ?? 0)).toBeGreaterThan(0)
        }
      }
    }
  })
})
