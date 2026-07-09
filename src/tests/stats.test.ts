import { describe, expect, it } from 'vitest'
import { dayStreak, weekSegments } from '../lib/practice/stats'

const NOW = new Date('2026-07-09T18:00:00Z')

function daysAgo(n: number, hour = 10): { at: string } {
  const d = new Date(NOW)
  d.setDate(d.getDate() - n)
  d.setHours(hour, 0, 0, 0)
  return { at: d.toISOString() }
}

describe('dayStreak', () => {
  it('is 0 with no records', () => {
    expect(dayStreak([], NOW)).toBe(0)
  })

  it('counts a single practice today', () => {
    expect(dayStreak([daysAgo(0)], NOW)).toBe(1)
  })

  it('counts consecutive days back from today', () => {
    expect(dayStreak([daysAgo(0), daysAgo(1), daysAgo(2)], NOW)).toBe(3)
  })

  it("keeps yesterday's streak alive before today's first practice", () => {
    expect(dayStreak([daysAgo(1), daysAgo(2)], NOW)).toBe(2)
  })

  it('breaks on a gap day', () => {
    expect(dayStreak([daysAgo(0), daysAgo(2), daysAgo(3)], NOW)).toBe(1)
  })

  it('is 0 when the last practice was two days ago', () => {
    expect(dayStreak([daysAgo(2), daysAgo(3)], NOW)).toBe(0)
  })

  it('counts multiple records on one day once', () => {
    expect(dayStreak([daysAgo(0, 9), daysAgo(0, 20), daysAgo(1)], NOW)).toBe(2)
  })
})

describe('weekSegments', () => {
  it('counts only records in the trailing seven days', () => {
    const records = [daysAgo(0), daysAgo(3), daysAgo(6), daysAgo(8), daysAgo(30)]
    expect(weekSegments(records, NOW)).toBe(3)
  })

  it('is 0 with no recent records', () => {
    expect(weekSegments([daysAgo(10)], NOW)).toBe(0)
  })
})
