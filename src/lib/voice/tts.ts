import { acquireAudioGate } from '../audio/playback'

/**
 * Spoken feedback via speechSynthesis. While speaking, the playback audio
 * gate is held so the pitch detectors ignore the speaker output (same
 * mechanism as demo playback); the voice recognizer separately drops chunks
 * while `speaking` is true so it never hears itself.
 *
 * Feedback strings must never contain the wake word ("piano") or they could
 * re-trigger recognition through the speakers.
 */

let speaking = false
let releaseGate: (() => void) | null = null

function done(): void {
  speaking = false
  releaseGate?.()
  releaseGate = null
}

export function speak(text: string): void {
  if (typeof speechSynthesis === 'undefined') return
  speechSynthesis.cancel()
  done()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 1.1
  utterance.onstart = () => {
    speaking = true
    releaseGate = acquireAudioGate()
  }
  utterance.onend = done
  utterance.onerror = done
  speechSynthesis.speak(utterance)
}

export function cancel(): void {
  if (typeof speechSynthesis === 'undefined') return
  speechSynthesis.cancel()
  done()
}

export const tts = {
  get speaking() {
    return speaking
  },
  speak,
  cancel,
}
