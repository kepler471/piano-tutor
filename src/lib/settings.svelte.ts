/**
 * App-wide user settings, persisted to localStorage as one JSON object.
 * Shared reactive singleton (getter-object convention, see mic.svelte.ts).
 *
 * a4 — tuning reference for mono detection and the tuner (435–445 Hz).
 *      Poly (Basic Pitch) is trained at 440 and cannot be recalibrated; within
 *      this ±20-cent range its semitone binning is unaffected.
 * fusion — in chord mode, grade instant mono onsets and dedup the matching
 *      poly notes (see input/fusion.ts) instead of waiting only on poly.
 * defaultHand — initial hand in the scale/chord libraries.
 */
export const A4_MIN = 435
export const A4_MAX = 445
export const A4_DEFAULT = 440

export function clampA4(value: number): number {
  if (!Number.isFinite(value)) return A4_DEFAULT
  return Math.min(A4_MAX, Math.max(A4_MIN, Math.round(value * 10) / 10))
}

interface Settings {
  a4: number
  fusion: boolean
  defaultHand: 'R' | 'L'
}

const DEFAULTS: Settings = { a4: A4_DEFAULT, fusion: true, defaultHand: 'R' }
const STORAGE_KEY = 'piano-tutor.settings'

function load(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return {
      a4: clampA4(typeof raw.a4 === 'number' ? raw.a4 : A4_DEFAULT),
      fusion: typeof raw.fusion === 'boolean' ? raw.fusion : DEFAULTS.fusion,
      defaultHand: raw.defaultHand === 'L' ? 'L' : 'R',
    }
  } catch {
    return { ...DEFAULTS }
  }
}

let store = $state<Settings>(load())

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // best-effort
  }
}

export const settings = {
  get a4() {
    return store.a4
  },
  get fusion() {
    return store.fusion
  },
  get defaultHand() {
    return store.defaultHand
  },
  setA4(value: number): void {
    store = { ...store, a4: clampA4(value) }
    persist()
  },
  setFusion(on: boolean): void {
    store = { ...store, fusion: on }
    persist()
  },
  setDefaultHand(hand: 'R' | 'L'): void {
    store = { ...store, defaultHand: hand }
    persist()
  },
}
