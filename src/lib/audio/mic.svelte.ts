export type MicStatus = 'idle' | 'requesting' | 'running' | 'denied' | 'error'

let status = $state<MicStatus>('idle')
let errorMessage = $state('')

let audioContext: AudioContext | null = null
let stream: MediaStream | null = null
let analyser: AnalyserNode | null = null
let source: MediaStreamAudioSourceNode | null = null

async function start(): Promise<void> {
  if (status === 'running' || status === 'requesting') return
  status = 'requesting'
  errorMessage = ''
  try {
    // Voice processing destroys piano transients and low notes — turn it all off.
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
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    source.connect(analyser)
    status = 'running'
  } catch (err) {
    stop()
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
  stream?.getTracks().forEach((t) => t.stop())
  void audioContext?.close()
  stream = null
  audioContext = null
  analyser = null
  source = null
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
  get source() {
    return source
  },
  get audioContext() {
    return audioContext
  },
  get sampleRate() {
    return audioContext?.sampleRate ?? 44100
  },
  start,
  stop,
}
