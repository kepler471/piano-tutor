import type { GuideLink } from '../data/guide'
import type { PracticeRecord } from './history.svelte'

/**
 * Derive per-guide-link practice indicators from the history log. The guide
 * data itself stays progress-blind (see guide.ts); this module knows which
 * `lessonId` format each link's target screen writes into history:
 *
 * - lessons:   the lesson id itself           (LessonPlayer)
 * - songs:     `song-${songId}`               (SongPlayer)
 * - quizzes:   `quiz-${mode}`                 (Quizzes — level lives in
 *              `segment` prose, so quiz links match on mode only)
 * - rhythm:    `rhythm-${patternId}` where pattern ids start `l${level}-`
 * - sight:     `sight-reading-L${level}-${seed}`  (sightread/generator)
 *
 * These formats are pinned by src/tests/guideProgress.test.ts.
 */

export interface GuideLinkMatcher {
  ids?: string[]
  prefixes?: string[]
}

/** How to find a link's practice records — null for reference-only links. */
export function guideLinkMatcher(link: GuideLink): GuideLinkMatcher | null {
  switch (link.kind) {
    case 'lesson':
      return { ids: [link.lessonId] }
    case 'song':
      return { ids: [`song-${link.songId}`] }
    case 'quiz':
      return { ids: [`quiz-${link.mode}`] }
    case 'rhythm':
      return { prefixes: [`rhythm-l${link.level}-`] }
    case 'sight':
      return { prefixes: [`sight-reading-L${link.level}-`] }
    // Browsing scales/chords or following a route isn't a completable run.
    case 'scale':
    case 'chord':
    case 'route':
      return null
  }
}

const RECENT_DAYS = 7

export interface GuideItemStats {
  count: number
  /** ISO timestamp of the most recent matching record. */
  lastAt: string | null
  /** Practiced within the last seven days. */
  recent: boolean
}

export function guideItemStats(
  link: GuideLink,
  records: readonly Pick<PracticeRecord, 'lessonId' | 'at'>[],
  now: Date,
): GuideItemStats | null {
  const matcher = guideLinkMatcher(link)
  if (!matcher) return null
  const matches = records.filter(
    (r) => matcher.ids?.includes(r.lessonId) || matcher.prefixes?.some((p) => r.lessonId.startsWith(p)),
  )
  if (matches.length === 0) return { count: 0, lastAt: null, recent: false }
  // ISO timestamps order lexicographically.
  const lastAt = matches.reduce((a, b) => (a.at > b.at ? a : b)).at
  const recent = now.getTime() - new Date(lastAt).getTime() < RECENT_DAYS * 24 * 60 * 60 * 1000
  return { count: matches.length, lastAt, recent }
}
