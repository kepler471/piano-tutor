/**
 * Per-song practice preferences (currently just the chosen practice tempo),
 * persisted to localStorage so a slowed-down piece stays slowed down.
 */
export interface SongPref {
  bpm: number
}

const STORAGE_KEY = 'piano-tutor.song-prefs'

function load(): Record<string, SongPref> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

let store = $state<Record<string, SongPref>>(load())

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // best-effort
  }
}

export const songPrefs = {
  get(songId: string): SongPref | undefined {
    return store[songId]
  },
  setBpm(songId: string, bpm: number): void {
    if (store[songId]?.bpm === bpm) return
    store = { ...store, [songId]: { ...store[songId], bpm } }
    persist()
  },
}
