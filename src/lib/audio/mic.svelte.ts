export type MicStatus = 'idle' | 'requesting' | 'running' | 'denied' | 'error'

let status = $state<MicStatus>('idle')
let errorMessage = $state('')

let audioContext: AudioContext | null = null
let stream: MediaStream | null = null
let analyser: AnalyserNode | null = null
let source: MediaStreamAudioSourceNode | null = null
let highpass: BiquadFilterNode | null = null

/**
 * Long-lived consumers (e.g. voice control) hold the mic open via
 * acquire()/release() so short-lived consumers calling stop() (e.g.
 * stopMonoDetection) cannot tear the stream out from under them.
 */
let holds = 0

async function acquire(): Promise<void> {
  holds++
  await start()
}

function release(): void {
  holds = Math.max(0, holds - 1)
  if (holds === 0) stop()
}

async function start(): Promise<void> {
  if (status === 'running' || status === 'requesting') return
  status = 'requesting'
  errorMessage = ''
  try {
    // Voice processing destroys piano transients and low notes — turn it all
    // off and do our own minimal cleanup (the high-pass below) instead.
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })
    audioContext = new AudioContext()
    await audioContext.resume()
    source = audioContext.createMediaStreamSource(stream)
    // 20 Hz high-pass kills DC offset and infrasonic rumble (HVAC, footsteps,
    // desk bumps) that inflates RMS and destabilizes the pitch gates. Only
    // ~-1 dB at A0 (27.5 Hz), so the lowest piano note is safe. All consumers
    // (analyser, poly worklet, voice worklet) tap the filtered output.
    highpass = audioContext.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = 20
    highpass.Q.value = 0.7071
    source.connect(highpass)
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    highpass.connect(analyser)
    status = 'running'
  } catch (err) {
    teardown()
    if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
      status = 'denied'
      errorMessage = 'Microphone access was denied. Allow it in your browser settings and try again.'
    } else {
      status = 'error'
      errorMessage = err instanceof Error ? err.message : String(err)
    }
  }
}

function stop(): void {
  if (holds > 0) return
  teardown()
}

function teardown(): void {
  stream?.getTracks().forEach((t) => t.stop())
  void audioContext?.close()
  stream = null
  audioContext = null
  analyser = null
  source = null
  highpass = null
  if (status === 'running' || status === 'requesting') status = 'idle'
}

export const mic = {
  get status() {
    return status
  },
  get errorMessage() {
    return errorMessage
  },
  get analyser() {
    return analyser
  },
  /** Cleaned-up mic signal (post high-pass) — tap this, never the raw source. */
  get output(): AudioNode | null {
    return highpass
  },
  get audioContext() {
    return audioContext
  },
  get sampleRate() {
    return audioContext?.sampleRate ?? 44100
  },
  start,
  stop,
  acquire,
  release,
}
