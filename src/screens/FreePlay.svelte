<script lang="ts">
  import { Chord, Note } from 'tonal'
  import MicButton from '../components/MicButton.svelte'
  import PianoKeyboard from '../components/PianoKeyboard.svelte'
  import SheetMusic from '../components/SheetMusic.svelte'
  import { mic } from '../lib/audio/mic.svelte'
  import { startMetronome, stopMetronome } from '../lib/audio/metronome'
  import { monoPitch, onNoteEvent, startMonoDetection, stopMonoDetection } from '../lib/audio/monoPitch.svelte'
  import { onPolyEvent, polyPitch, startPolyDetection, stopPolyDetection } from '../lib/audio/polyPitch.svelte'
  import { scoreFromSequence } from '../lib/notation/vexScore'
  import { clusterOnsets, type Onset } from '../lib/transcribe/cluster'
  import { quantizeToGrid, type QuantizedEvent } from '../lib/transcribe/quantize'
  import { SCOPE_PHRASES } from '../lib/voice/phrases'
  import { registerVoiceCommands } from '../lib/voice/voice.svelte'

  let mode = $state<'melody' | 'chords'>('melody')
  let onsets = $state<Onset[]>([])

  // Metronome-locked recording (quantized transcription)
  let recState = $state<'idle' | 'countin' | 'recording'>('idle')
  let recBpm = $state(80)
  let recOnsets = $state<Onset[]>([])
  let recorded = $state<QuantizedEvent[] | null>(null)
  let recStart = 0

  $effect(() => {
    const handle = (ev: { kind: 'on' | 'off'; midi: number; t: number }) => {
      if (ev.kind !== 'on') return
      onsets = [...onsets, { midi: ev.midi, t: ev.t }]
      if (recState === 'recording' && ev.t >= recStart) {
        recOnsets = [...recOnsets, { midi: ev.midi, t: ev.t - recStart }]
      }
    }
    return mode === 'melody' ? onNoteEvent(handle) : onPolyEvent(handle)
  })

  async function startRecording() {
    recorded = null
    recOnsets = []
    recState = 'countin'
    await startMetronome(recBpm)
    // one bar of count-in
    await new Promise((r) => setTimeout(r, 4 * (60000 / recBpm)))
    recStart = mic.audioContext?.currentTime ?? 0
    recState = 'recording'
  }

  function stopRecording() {
    stopMetronome()
    recState = 'idle'
    recorded = quantizeToGrid(recOnsets, recBpm, 4, mode === 'chords' ? 0.15 : 0.08)
  }

  const recordedScore = $derived(
    recorded && recorded.length
      ? scoreFromSequence(recorded.map((e) => ({ midis: e.midis, duration: e.duration, endsBar: e.endsBar })))
      : null,
  )

  // If the user switches to chord mode while already listening, spin up the model.
  $effect(() => {
    if (mode === 'chords' && mic.status === 'running') void startPolyDetection()
  })

  // Chord-model onsets of one strum land within ~100ms; use a wider window than mono.
  const clustered = $derived(clusterOnsets(onsets, mode === 'chords' ? 0.15 : 0.08))
  const visible = $derived(clustered.slice(-16))
  const score = $derived(scoreFromSequence(visible.map((c) => ({ midis: c.midis }))))

  const pressed = $derived(
    new Set([
      ...(monoPitch.midi !== null ? [monoPitch.midi] : []),
      ...(mode === 'chords' ? polyPitch.activeNotes : []),
    ]),
  )

  function describe(midis: number[]): string {
    const names = midis.map((m) => Note.fromMidi(m))
    if (midis.length >= 3) {
      const chords = Chord.detect(names)
      if (chords.length) return `${names.join('+')} (${chords[0]})`
    }
    return names.join('+')
  }

  const noteNamesText = $derived(clustered.map((c) => describe(c.midis)).join('  '))

  async function copyNotes() {
    await navigator.clipboard.writeText(noteNamesText)
  }

  $effect(() =>
    registerVoiceCommands({
      name: 'Free Play',
      phrases: SCOPE_PHRASES['Free Play'],
      handle(intent) {
        if (intent.kind === 'free-play') {
          switch (intent.action) {
            case 'set-mode':
              if (intent.mode) mode = intent.mode
              return { say: mode === 'chords' ? 'Chord mode.' : 'Melody mode.' }
            case 'record':
              if (recState !== 'idle') return { say: 'Already recording.' }
              if (mic.status !== 'running') return { say: "First say 'start listening', then 'record'." }
              if (intent.bpm !== undefined) recBpm = Math.max(40, Math.min(160, intent.bpm))
              void startRecording()
              return { say: `Recording at ${recBpm} — one bar of count-in.` }
            case 'stop-recording':
              if (recState === 'idle') return { say: 'Not recording.' }
              stopRecording()
              return { say: 'Done.' }
            case 'clear':
              onsets = []
              return { say: 'Cleared.' }
            case 'copy':
              if (!clustered.length) return { say: 'Nothing to copy yet.' }
              void copyNotes()
              return { say: 'Copied.' }
          }
        }
        if (intent.kind === 'set-bpm' && recState === 'idle' && intent.bpm !== undefined) {
          recBpm = Math.max(40, Math.min(160, intent.bpm))
          return { say: `${recBpm}.` }
        }
        if (intent.kind === 'mic' && intent.action === 'start') {
          void startMonoDetection().then(() => {
            if (mode === 'chords' && mic.status === 'running') return startPolyDetection()
          })
          return { say: 'Listening.' }
        }
        if (intent.kind === 'mic' && intent.action === 'stop') {
          if (mode === 'chords') stopPolyDetection()
          stopMonoDetection()
          return { say: 'Stopped.' }
        }
        return null
      },
    }),
  )
</script>

<section>
  <h1>Free Play</h1>
  <p class="hint">
    Play anything — pressed keys light up below and what you play is written to the staff.
    Melody mode reacts instantly but hears one note at a time; chord mode hears everything but
    runs about a second behind.
  </p>

  <div class="card">
    <div class="card-head">
      <div class="control-group">
        <span class="control-label">Mode</span>
        <button class:active={mode === 'melody'} onclick={() => (mode = 'melody')}>
          Melody (instant)
        </button>
        <button class:active={mode === 'chords'} onclick={() => (mode = 'chords')}>
          Chords
        </button>
      </div>
      <MicButton poly={mode === 'chords'} />
    </div>
    <PianoKeyboard from={36} to={96} {pressed} />
  </div>

  <div class="card" style="margin-top: 16px">
    <div class="card-head">
      <h2>What you played {clustered.length ? `(${clustered.length} events)` : ''}</h2>
      <div>
        <button class="primary" onclick={copyNotes} disabled={!clustered.length}>Copy notes</button>
        <button class="primary danger" onclick={() => (onsets = [])} disabled={!clustered.length}>
          Clear
        </button>
      </div>
    </div>
    {#if clustered.length}
      {#if clustered.length > 16}
        <p class="hint">Showing the last 16 of {clustered.length} events.</p>
      {/if}
      <SheetMusic {score} />
      <p class="hint notes-text">{noteNamesText}</p>
    {:else}
      <p class="hint">Notes will appear here as you play.</p>
    {/if}
  </div>

  <div class="card" style="margin-top: 16px">
    <div class="card-head">
      <h2>Record with metronome</h2>
      <div class="control-group">
        <label class="hint" for="rec-bpm">BPM</label>
        <input
          id="rec-bpm"
          class="bpm"
          type="number"
          min="40"
          max="160"
          bind:value={recBpm}
          disabled={recState !== 'idle'}
        />
        {#if recState === 'idle'}
          <button class="primary" onclick={startRecording} disabled={mic.status !== 'running'}>
            ● Record
          </button>
        {:else}
          <button class="primary danger" onclick={stopRecording}>
            ■ Stop {recState === 'countin' ? '(count-in…)' : ''}
          </button>
        {/if}
      </div>
    </div>
    <p class="hint">
      {#if mic.status !== 'running'}
        Start listening first, then record: you get one bar of count-in clicks, then play in time.
        Your notes are written with proper rhythm — quarter and eighth notes, rests and barlines.
      {:else if recState === 'countin'}
        Count-in… start playing on the next downbeat.
      {:else if recState === 'recording'}
        Recording — play in time with the click. {recOnsets.length} notes so far.
      {:else}
        One bar of count-in, then play in time with the click.
      {/if}
    </p>
    {#if recordedScore}
      <SheetMusic score={recordedScore} />
    {:else if recorded}
      <p class="hint">Nothing was recorded — try again and play after the count-in.</p>
    {/if}
  </div>
</section>

<style>
  button.danger {
    background: #b91c1c;
  }
  button.danger:hover:not(:disabled) {
    background: #991b1b;
  }
  .notes-text {
    word-break: break-word;
  }
  .bpm {
    width: 64px;
    padding: 4px 6px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
  }
</style>
