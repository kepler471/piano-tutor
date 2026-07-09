/**
 * Ring buffer of transcripts the voice pipeline could not resolve, for tuning
 * the grammar and intent bank from real usage — reviewable in the Settings
 * screen (or devtools: localStorage['piano-tutor.voice-misses']).
 * Best-effort; storage failures are swallowed.
 */

const STORAGE_KEY = 'piano-tutor.voice-misses'
const MAX_ENTRIES = 50

export interface VoiceMiss {
  text: string
  ts: number
}

export function logMiss(text: string): void {
  try {
    const entries = readMisses()
    entries.push({ text, ts: Date.now() })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)))
  } catch {
    // best-effort
  }
}

/** Oldest first, as stored. */
export function readMisses(): VoiceMiss[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as VoiceMiss[]) : []
  } catch {
    return []
  }
}

export function clearMisses(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // best-effort
  }
}
