import type { KaldiRecognizer, Model } from 'vosk-browser'
import { allLessons } from '../data/lessons'
import { navigate } from '../../router.svelte'
import { mic } from '../audio/mic.svelte'
import { startMonoDetection, stopMonoDetection } from '../audio/monoPitch.svelte'
import { startPolyDetection, stopPolyDetection } from '../audio/polyPitch.svelte'
import { setMetronomeBpm, startMetronome, stopMetronome } from '../audio/metronome'
import * as playback from '../audio/playback'
import { Resampler } from '../audio/resample'
import { assetUrl } from '../assetUrl'
import { createConvo } from './convo'
import { createDispatcher, type Dispatcher } from './dispatcher'
import {
  createFallbackResolver,
  createSequenceGate,
  type FallbackOutcome,
  type FallbackResolver,
} from './fallback'
import type { Intent, VoiceScopeSpec } from './intents'
import { logMiss } from './missLog'
import { loadModelArchive } from './modelLoader'
import { buildGrammar, parseTranscript } from './parser'
import { SCOPE_PHRASES, SPOKEN_HELP_EXAMPLES } from './phrases'
import { isStaleChunkError } from './staleChunk'
import { tts } from './tts'

/**
 * Voice-control singleton: streams the shared mic through the existing
 * capture worklet into a grammar-constrained Vosk recognizer (Kaldi WASM in
 * its own worker), parses final transcripts into Intents, and dispatches
 * them to the active command scopes.
 */

const VOSK_SAMPLE_RATE = 16000
const STORAGE_KEY = 'piano-tutor.voice-enabled'
const RELOAD_KEY = 'piano-tutor.voice-chunk-reload'
const captureProcessorUrl = assetUrl('worklets/capture-processor.js')

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

// Conversation layer: armed/correction windows, escalating reprompts, and
// "did you mean — right?" confirmations. Decisions live in the pure convo;
// this module only feeds it parsed intents and fallback outcomes.
const convo = createConvo({
  dispatch: (intent) => dispatcher.dispatch(intent),
  say: (text, opts) => tts.speak(text, opts),
  activePhrases: () => dispatcher.activePhrases(),
  logMiss,
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
  phrases: SCOPE_PHRASES['Anywhere'],
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
        return {
          say: `You can say things like: ${SPOKEN_HELP_EXAMPLES.join(', or ')}. For everything else, tap 'What can I say'.`,
        }
      case 'repeat':
        return { say: tts.lastSpoken || "I haven't said anything yet." }
      case 'go-back':
        history.back()
        return { say: '' }
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
// Embedding-based intent fallback (Tier 1)
// ---------------------------------------------------------------------------

let fallback: FallbackResolver | null = null
let fallbackLoad: Promise<void> | null = null
const fallbackGate = createSequenceGate()

/**
 * Preloads the embedding fallback in the background (~23 MB model + WASM,
 * browser-cached). Until it's ready, unknown intents keep the plain
 * "didn't catch that" behavior; failure just leaves the fallback off.
 */
function ensureFallback(): void {
  fallbackLoad ??= import('./embedder')
    .then(({ getEmbedder }) => getEmbedder())
    .then(async (embedder) => {
      const resolver = createFallbackResolver((texts) => embedder.embed(texts))
      await resolver.ready
      fallback = resolver
    })
    .catch((err) => {
      console.warn('[voice] intent fallback unavailable:', err)
    })
}

async function handleUnknown(text: string, seq: number): Promise<void> {
  let outcome: FallbackOutcome = null
  if (fallback) {
    try {
      outcome = await fallback.resolve(text)
    } catch (err) {
      console.warn('[voice] intent fallback failed:', err)
    }
  }
  if (!fallbackGate.isCurrent(seq)) return // superseded by a newer utterance
  lastFeedback = convo.onFallback(outcome, text)
}

// ---------------------------------------------------------------------------
// Recognition pipeline
// ---------------------------------------------------------------------------

/**
 * Loads the lazily-split vosk-browser chunk (~6 MB — it inlines its Kaldi
 * WASM worker and would otherwise bloat the main bundle for users who never
 * enable voice). The chunk is hash-named and excluded from the SW precache,
 * so when a GitHub Pages deploy replaces it while this client still runs the
 * previous app shell, the import 404s. Recover with a one-shot reload: nudge
 * the service worker to update, persist the enabled flag so voice resumes
 * automatically, and load the fresh shell whose vosk chunk exists.
 */
async function loadVoskModule(): Promise<typeof import('vosk-browser')> {
  try {
    const mod = await import('vosk-browser')
    clearReloadFlag()
    return mod
  } catch (err) {
    if (isStaleChunkError(err) && !reloadAttempted()) {
      markReloadAttempted()
      persist(true)
      await tryActivateUpdatedSW()
      location.reload()
      await new Promise<never>(() => {}) // page is unloading; never settle
    }
    throw err
  }
}

/** Best-effort: ask the SW registration to update and give the new worker a
 * moment to activate, so the reload serves the fresh app shell. */
async function tryActivateUpdatedSW(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (!reg) return
    await reg.update()
    const sw = reg.installing ?? reg.waiting
    if (!sw) return
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 3000)
      sw.addEventListener('statechange', () => {
        if (sw.state === 'activated' || sw.state === 'redundant') {
          clearTimeout(timer)
          resolve()
        }
      })
    })
  } catch {
    // reload anyway
  }
}

function reloadAttempted(): boolean {
  try {
    return sessionStorage.getItem(RELOAD_KEY) === '1'
  } catch {
    return false
  }
}

function markReloadAttempted(): void {
  try {
    sessionStorage.setItem(RELOAD_KEY, '1')
  } catch {
    // best-effort
  }
}

function clearReloadFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_KEY)
  } catch {
    // best-effort
  }
}

function handleFinal(text: string): void {
  const intent = parseTranscript(text, { armed: convo.isArmed() })
  if (!intent) return // no wake word — silently ignore
  lastHeard = text.replace(/\[unk\]/g, '').replace(/\s+/g, ' ').trim()
  // Every new utterance supersedes any in-flight fallback resolution.
  const seq = fallbackGate.next()
  if (intent.kind === 'wake') {
    lastFeedback = convo.onWake()
    return
  }
  if (intent.kind === 'unknown') {
    void handleUnknown(intent.text, seq)
    return
  }
  lastFeedback = convo.onIntent(intent)
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

async function enable(opts: { announce?: boolean } = {}): Promise<void> {
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
      const { createModel } = await loadVoskModule()
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
    const source = mic.output!

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
    ensureFallback()
    // Confirms the audio path end-to-end on user-initiated enables; the
    // auto-restore on page load stays silent.
    if (opts.announce) tts.speak('Voice is on.', { remember: false })
  } catch (err) {
    console.error('[voice] enable failed:', err)
    status = 'error'
    errorMessage = isStaleChunkError(err)
      ? 'Could not download the voice recognizer. Check your connection and reload the page.'
      : err instanceof Error
        ? err.message
        : String(err)
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
