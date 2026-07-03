import type { KaldiRecognizer, Model } from 'vosk-browser'
import { allLessons } from '../data/lessons'
import { navigate } from '../../router.svelte'
import { mic } from '../audio/mic.svelte'
import { startMonoDetection, stopMonoDetection } from '../audio/monoPitch.svelte'
import { startPolyDetection, stopPolyDetection } from '../audio/polyPitch.svelte'
import { setMetronomeBpm, startMetronome, stopMetronome } from '../audio/metronome'
import * as playback from '../audio/playback'
import { Resampler } from '../audio/resample'
import { createDispatcher, type Dispatcher } from './dispatcher'
import type { Intent, VoiceScopeSpec } from './intents'
import { loadModelArchive } from './modelLoader'
import { buildGrammar, parseTranscript } from './parser'
import { tts } from './tts'

/**
 * Voice-control singleton: streams the shared mic through the existing
 * capture worklet into a grammar-constrained Vosk recognizer (Kaldi WASM in
 * its own worker), parses final transcripts into Intents, and dispatches
 * them to the active command scopes.
 */

const VOSK_SAMPLE_RATE = 16000
const ARMED_WINDOW_MS = 8000
const STORAGE_KEY = 'piano-tutor.voice-enabled'
const captureProcessorUrl = '/worklets/capture-processor.js'

export type VoiceStatus =
  | 'off'
  | 'downloading-model'
  | 'loading'
  | 'listening'
  | 'mic-denied'
  | 'error'

let status = $state<VoiceStatus>('off')
let modelProgress = $state<number | null>(0)
let partial = $state('')
let lastHeard = $state('')
let lastFeedback = $state('')
let errorMessage = $state('')
let needsGesture = $state(false)

let model: Model | null = null
let recognizer: KaldiRecognizer | null = null
let workletNode: AudioWorkletNode | null = null
let resampler: Resampler | null = null
let workletModuleLoaded: AudioContext | null = null
let armedUntil = 0
let holdingMic = false

export const voiceSupported =
  typeof WebAssembly !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

const dispatcher: Dispatcher = createDispatcher({
  navigate,
  say: (text) => tts.speak(text),
})

/** Screens call this inside $effect to add commands while mounted. */
export function registerVoiceCommands(scope: VoiceScopeSpec): () => void {
  return dispatcher.register(scope)
}

export function voiceHelpTopics(): { scope: string; phrases: string[] }[] {
  return dispatcher.activePhrases()
}

const globalScope: VoiceScopeSpec = {
  name: 'Anywhere',
  phrases: [
    'open scales / chords / practice / free play / tuner',
    'go home',
    'start the metronome at ninety',
    'metronome off',
    'set tempo to one hundred',
    'slower / faster',
    'stop',
    'stop the mic',
    'help',
    'voice off',
  ],
  handle(intent: Intent) {
    switch (intent.kind) {
      case 'navigate':
        navigate(intent.route)
        return { say: '' }
      case 'metronome':
        if (intent.action === 'stop') {
          stopMetronome()
          return { say: '' }
        }
        void startMetronome(intent.bpm ?? 90)
        return { say: '' }
      case 'set-bpm':
        // Screens with their own tempo state shadow this; fallback drives the metronome.
        if (intent.bpm !== undefined) {
          setMetronomeBpm(intent.bpm)
          return { say: '' }
        }
        return null // relative change needs a screen that knows the current bpm
      case 'stop-all':
        stopMetronome()
        playback.stopAllPlayback()
        tts.cancel()
        return { say: '' }
      case 'mic':
        if (intent.action === 'stop') {
          stopPolyDetection()
          stopMonoDetection()
          return { say: 'Stopped listening to your playing.' }
        }
        return null // starting needs screen context (mono vs poly)
      case 'help':
        return { say: 'Try: open scales. Show me D major. Start the metronome. Or say stop.' }
      case 'voice-off':
        disable()
        return { say: 'Voice control off.' }
      default:
        return null
    }
  },
}

dispatcher.register(globalScope)

// ---------------------------------------------------------------------------
// Recognition pipeline
// ---------------------------------------------------------------------------

function handleFinal(text: string): void {
  const armed = Date.now() < armedUntil
  const intent = parseTranscript(text, { armed })
  if (!intent) return // no wake word — silently ignore
  armedUntil = 0
  lastHeard = text.replace(/\[unk\]/g, '').replace(/\s+/g, ' ').trim()
  if (intent.kind === 'wake') {
    armedUntil = Date.now() + ARMED_WINDOW_MS
    lastFeedback = 'Yes?'
    tts.speak('Yes?')
    return
  }
  const { feedback } = dispatcher.dispatch(intent)
  lastFeedback = feedback
}

let grammarActive = false

/**
 * Prefers a grammar-constrained recognizer (piano notes and chatter decode as
 * [unk] and are dropped), but the vosk-browser 0.0.8 WASM build rejects the
 * grammar constructor at runtime ("Not supported" / ENOTSUP), so on that
 * error we fall back to open-vocabulary decoding — the wake-word prefix still
 * filters stray transcripts.
 */
function spawnRecognizer(useGrammar: boolean): void {
  if (!model) return
  recognizer?.remove()
  grammarActive = useGrammar
  recognizer = useGrammar
    ? new model.KaldiRecognizer(VOSK_SAMPLE_RATE, JSON.stringify(buildGrammar(allLessons())))
    : new model.KaldiRecognizer(VOSK_SAMPLE_RATE)
  attachRecognizer(recognizer)
}

function attachRecognizer(rec: KaldiRecognizer): void {
  rec.on('result', (message) => {
    if (message.event !== 'result') return
    const text = message.result.text
    partial = ''
    if (text) handleFinal(text)
  })
  rec.on('partialresult', (message) => {
    if (message.event !== 'partialresult') return
    partial = message.result.partial.replace(/\[unk\]/g, '').replace(/\s+/g, ' ').trim()
  })
  rec.on('error', (message) => {
    if (message.event !== 'error') return
    if (grammarActive) {
      console.warn(`[voice] grammar recognizer failed (${message.error}); using open vocabulary`)
      spawnRecognizer(false)
      return
    }
    status = 'error'
    errorMessage = message.error
  })
}

async function enable(): Promise<void> {
  if (!voiceSupported) {
    status = 'error'
    errorMessage = 'This browser does not support voice control.'
    return
  }
  if (status !== 'off' && status !== 'error' && status !== 'mic-denied') return
  errorMessage = ''
  try {
    if (!model) {
      status = 'downloading-model'
      modelProgress = 0
      const url = await loadModelArchive((p) => (modelProgress = p))
      status = 'loading'
      // Dynamic import: vosk-browser inlines its Kaldi WASM worker (~6 MB)
      // and would otherwise bloat the main bundle for users who never enable voice.
      const { createModel } = await import('vosk-browser')
      model = await createModel(url)
    } else {
      status = 'loading'
    }

    await mic.acquire()
    holdingMic = true
    if (mic.status !== 'running') {
      holdingMic = false
      mic.release()
      status = mic.status === 'denied' ? 'mic-denied' : 'error'
      errorMessage = mic.errorMessage
      return
    }
    const ctx = mic.audioContext!
    const source = mic.source!

    spawnRecognizer(true)

    if (workletModuleLoaded !== ctx) {
      await ctx.audioWorklet.addModule(captureProcessorUrl)
      workletModuleLoaded = ctx
    }
    resampler = new Resampler(ctx.sampleRate, VOSK_SAMPLE_RATE)
    workletNode = new AudioWorkletNode(ctx, 'capture-processor')
    workletNode.port.onmessage = (e: MessageEvent) => {
      // Never feed the recognizer our own audio (demos, TTS confirmations).
      if (!recognizer || playback.isPlaying || tts.speaking) return
      const samples = resampler!.push(e.data as Float32Array)
      if (samples.length === 0) return
      try {
        recognizer.acceptWaveformFloat(samples, VOSK_SAMPLE_RATE)
      } catch (err) {
        status = 'error'
        errorMessage = err instanceof Error ? err.message : String(err)
      }
    }
    source.connect(workletNode)

    // Until the user has interacted with the page the context may be
    // suspended, which means silent chunks — surface a hint in the HUD.
    needsGesture = ctx.state === 'suspended'
    status = 'listening'
    persist(true)
  } catch (err) {
    console.error('[voice] enable failed:', err)
    status = 'error'
    errorMessage = err instanceof Error ? err.message : String(err)
    if (holdingMic) {
      holdingMic = false
      mic.release()
    }
  }
}

function disable(): void {
  recognizer?.remove()
  recognizer = null
  workletNode?.disconnect()
  workletNode = null
  resampler = null
  partial = ''
  if (holdingMic) {
    holdingMic = false
    mic.release()
  }
  // Keep the model in memory for instant re-enable.
  status = 'off'
  persist(false)
}

function persist(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(STORAGE_KEY, '1')
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // best-effort
  }
}

function wasEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

// Resume a suspended AudioContext on the first user gesture (autoplay policy).
if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    () => {
      void mic.audioContext?.resume().then(() => (needsGesture = false))
      needsGesture = false
    },
    { once: false },
  )
  if (voiceSupported && wasEnabled()) void enable()
}

export const voice = {
  get status() {
    return status
  },
  get modelProgress() {
    return modelProgress
  },
  get partial() {
    return partial
  },
  get lastHeard() {
    return lastHeard
  },
  get lastFeedback() {
    return lastFeedback
  },
  get errorMessage() {
    return errorMessage
  },
  get needsGesture() {
    return needsGesture
  },
  get supported() {
    return voiceSupported
  },
  enable,
  disable,
}
