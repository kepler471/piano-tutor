/**
 * Ring buffer of transcripts the voice pipeline could not resolve, for tuning
 * the grammar and intent bank from real usage (read it in devtools:
 * localStorage['piano-tutor.voice-misses']). Best-effort; storage failures
 * are swallowed.
 */

const STORAGE_KEY = 'piano-tutor.voice-misses'
const MAX_ENTRIES = 50

export function logMiss(text: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const entries: { text: string; ts: number }[] = raw ? JSON.parse(raw) : []
    entries.push({ text, ts: Date.now() })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)))
  } catch {
    // best-effort
  }
}
