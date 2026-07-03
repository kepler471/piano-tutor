export interface PracticeRecord {
  lessonId: string
  title: string
  segment: string
  mistakes: number
  steps: number
  /** ISO timestamp */
  at: string
}

const STORAGE_KEY = 'piano-tutor.practice-history'
const MAX_RECORDS = 200

function load(): PracticeRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

let records = $state<PracticeRecord[]>(load())

export function addRecord(rec: Omit<PracticeRecord, 'at'>): void {
  records = [{ ...rec, at: new Date().toISOString() }, ...records].slice(0, MAX_RECORDS)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // storage full or unavailable — history is best-effort
  }
}

export const practiceHistory = {
  get records() {
    return records
  },
  get today() {
    const today = new Date().toDateString()
    return records.filter((r) => new Date(r.at).toDateString() === today)
  },
}
