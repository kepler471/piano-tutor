/**
 * Per-activity level/streak progression, persisted to localStorage.
 * "Three clean runs in a row → level up" — used by sight-reading and
 * anything else with graded levels.
 */
export interface ActivityProgress {
  level: number
  /** Consecutive clean runs at the current level */
  streak: number
}

const STORAGE_KEY = 'piano-tutor.progress'
export const STREAK_TO_LEVEL_UP = 3

function load(): Record<string, ActivityProgress> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

let store = $state<Record<string, ActivityProgress>>(load())

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // best-effort
  }
}

export function getProgress(activity: string): ActivityProgress {
  return store[activity] ?? { level: 1, streak: 0 }
}

/** Manual level change resets the streak. */
export function setLevel(activity: string, level: number): void {
  store = { ...store, [activity]: { level, streak: 0 } }
  persist()
}

/**
 * Record a finished run. A clean run extends the streak; three in a row
 * bump the level (capped at maxLevel). Any mistake resets the streak.
 */
export function recordRun(
  activity: string,
  clean: boolean,
  maxLevel: number,
): { leveledUp: boolean; progress: ActivityProgress } {
  const cur = getProgress(activity)
  let next: ActivityProgress
  let leveledUp = false
  if (!clean) {
    next = { ...cur, streak: 0 }
  } else if (cur.streak + 1 >= STREAK_TO_LEVEL_UP && cur.level < maxLevel) {
    next = { level: cur.level + 1, streak: 0 }
    leveledUp = true
  } else {
    next = { ...cur, streak: Math.min(cur.streak + 1, STREAK_TO_LEVEL_UP) }
  }
  store = { ...store, [activity]: next }
  persist()
  return { leveledUp, progress: next }
}
