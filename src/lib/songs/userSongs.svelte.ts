import type { Song } from '../data/songs/types'

/** User-imported songs, persisted to localStorage (size-capped). */
const STORAGE_KEY = 'piano-tutor.user-songs.v1'
const MAX_SONGS = 24

function load(): Song[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

let songs = $state<Song[]>(load())

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs))
  } catch {
    // quota exceeded — drop the oldest and retry once
    songs = songs.slice(0, Math.max(1, songs.length - 1))
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(songs))
    } catch {
      // give up quietly; imports still work for the session
    }
  }
}

export function addUserSong(song: Song): void {
  songs = [song, ...songs.filter((s) => s.id !== song.id)].slice(0, MAX_SONGS)
  persist()
}

export function removeUserSong(id: string): void {
  songs = songs.filter((s) => s.id !== id)
  persist()
}

export const userSongs = {
  get all() {
    return songs
  },
}
