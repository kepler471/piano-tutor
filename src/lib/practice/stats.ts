/**
 * Pure practice-history statistics (no DOM types — vitest-covered).
 * Consumed by the Home screen's streak/week summary.
 */

interface Dated {
  /** ISO timestamp */
  at: string
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Consecutive days with at least one record, counting back from today.
 * A streak that hasn't been extended today yet is counted from yesterday,
 * so it doesn't read as broken before the day's first practice.
 */
export function dayStreak(records: readonly Dated[], now: Date): number {
  const days = new Set(records.map((r) => new Date(r.at).toDateString()))
  const cursor = new Date(now)
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.has(cursor.toDateString())) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/** Records completed in the trailing seven days. */
export function weekSegments(records: readonly Dated[], now: Date): number {
  const cutoff = now.getTime() - 7 * DAY_MS
  return records.filter((r) => new Date(r.at).getTime() > cutoff).length
}
