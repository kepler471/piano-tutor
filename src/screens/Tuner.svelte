<script lang="ts">
  import { Note } from 'tonal'
  import MicButton from '../components/MicButton.svelte'
  import PianoKeyboard from '../components/PianoKeyboard.svelte'
  import { monoPitch, startMonoDetection, stopMonoDetection } from '../lib/audio/monoPitch.svelte'
  import { calibratedA4 } from '../lib/audio/noteEvents'
  import { A4_DEFAULT, settings } from '../lib/settings.svelte'
  import { SCOPE_PHRASES } from '../lib/voice/phrases'
  import { registerVoiceCommands } from '../lib/voice/voice.svelte'

  // --- A4 calibration: hold the A above middle C (MIDI 69); we average the
  // cents offset for ~1.5 s and move the tuning reference so it reads 0.
  const SAMPLE_MS = 50
  const SAMPLES_NEEDED = 30

  let calibrating = $state(false)
  let calSamples = $state(0)
  let calMessage = $state('')
  let calTimer = 0
  let samples: number[] = []

  function stopCalibration() {
    clearInterval(calTimer)
    calibrating = false
    calSamples = 0
    samples = []
  }

  async function applyA4(value: number) {
    settings.setA4(value)
    // The tracker reads a4 at start — restart detection to apply.
    if (monoPitch.running) {
      stopMonoDetection()
      await startMonoDetection()
    }
  }

  async function startCalibration() {
    calMessage = ''
    if (!monoPitch.running) await startMonoDetection()
    if (!monoPitch.running) return // mic denied/errored — MicButton shows why
    calibrating = true
    samples = []
    calSamples = 0
    calTimer = window.setInterval(async () => {
      if (monoPitch.midi === 69) {
        samples.push(monoPitch.cents)
        calSamples = samples.length
        if (samples.length >= SAMPLES_NEEDED) {
          const avg = samples.reduce((a, b) => a + b, 0) / samples.length
          const next = calibratedA4(settings.a4, avg)
          stopCalibration()
          await applyA4(next)
          calMessage = `Tuning reference set to A4 = ${settings.a4.toFixed(1)} Hz.`
        }
      }
    }, SAMPLE_MS)
  }

  $effect(() => () => clearInterval(calTimer)) // teardown on navigate away

  async function resetA4() {
    stopCalibration()
    await applyA4(A4_DEFAULT)
    calMessage = `Tuning reference reset to A4 = 440 Hz.`
  }

  $effect(() =>
    registerVoiceCommands({
      name: 'Note Detector',
      phrases: SCOPE_PHRASES['Note Detector'],
      handle(intent) {
        if (intent.kind !== 'mic') return null
        if (intent.action === 'start') {
          void startMonoDetection()
          return { say: 'Listening — play a note.' }
        }
        stopMonoDetection()
        return { say: 'Stopped.' }
      },
    }),
  )

  const noteName = $derived(monoPitch.midi !== null ? Note.fromMidi(monoPitch.midi) : '—')
  const cents = $derived(Math.round(monoPitch.cents))
  const inTune = $derived(Math.abs(cents) <= 8)
  const pressed = $derived(monoPitch.midi !== null ? new Set([monoPitch.midi]) : new Set<number>())
</script>

<section>
  <h1>Note Detector</h1>
  <p class="hint">
    Play a single note on your piano — the app shows what it hears. This screen detects one note at
    a time and doubles as a tuner.
  </p>

  <div class="card">
    <MicButton />

    <div class="display">
      <div class="note" class:in-tune={monoPitch.midi !== null && inTune}>{noteName}</div>
      <div class="cents-scale">
        <div class="cents-track">
          <div class="cents-center"></div>
          {#if monoPitch.midi !== null}
            <div class="cents-needle" style="left: calc(50% + {Math.max(-50, Math.min(50, cents))}%)"></div>
          {/if}
        </div>
        <div class="cents-labels"><span>-50¢</span><span>0</span><span>+50¢</span></div>
      </div>
      <p class="hint">
        {#if monoPitch.midi !== null}
          {monoPitch.freq?.toFixed(1)} Hz · {cents > 0 ? '+' : ''}{cents} cents ·
          {inTune ? 'in tune' : cents > 0 ? 'sharp' : 'flat'}
        {:else if monoPitch.running}
          Listening… play a note.
        {:else}
          Press “Start listening” and play a note.
        {/if}
      </p>
    </div>

    <div class="calibration">
      <span class="cal-ref">Tuning reference: A4 = {settings.a4.toFixed(1)} Hz</span>
      {#if calibrating}
        <span class="cal-live">Hold the A above middle C… {Math.round((calSamples / SAMPLES_NEEDED) * 100)}%</span>
        <button class="ghost" onclick={stopCalibration}>Cancel</button>
      {:else}
        <button class="ghost" onclick={startCalibration}>Calibrate — hold the A above middle C</button>
        {#if settings.a4 !== A4_DEFAULT}
          <button class="ghost" onclick={resetA4}>Reset to 440</button>
        {/if}
      {/if}
      {#if calMessage}
        <span class="cal-done">{calMessage}</span>
      {/if}
    </div>
    <p class="hint">
      Instruments tuned away from concert pitch read every note a few cents off — calibrating moves
      the reference so “in tune” means in tune with <em>your</em> instrument. Chord detection always
      analyzes at A=440.
    </p>

    <PianoKeyboard from={36} to={96} {pressed} />
  </div>
</section>

<style>
  .display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
  }
  .note {
    font-size: 72px;
    font-weight: 700;
    line-height: 1;
    min-height: 76px;
    color: #0f172a;
  }
  .note.in-tune {
    color: #16a34a;
  }
  .cents-scale {
    width: min(420px, 100%);
  }
  .cents-track {
    position: relative;
    height: 14px;
    background: #f1f5f9;
    border-radius: 7px;
    overflow: hidden;
  }
  .cents-center {
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #94a3b8;
  }
  .cents-needle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 4px;
    margin-left: -2px;
    background: #1d4ed8;
    border-radius: 2px;
  }
  .cents-labels {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #94a3b8;
    margin-top: 4px;
  }
  .calibration {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    font-size: 13px;
    color: #475569;
  }
  .cal-ref {
    font-weight: 600;
  }
  .cal-live {
    color: #1d4ed8;
    font-weight: 600;
  }
  .cal-done {
    color: #16a34a;
  }
  .ghost {
    border: none;
    background: none;
    color: #1d4ed8;
    cursor: pointer;
    font-size: 13px;
  }
</style>
