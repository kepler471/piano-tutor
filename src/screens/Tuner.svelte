<script lang="ts">
  import { Note } from 'tonal'
  import MicButton from '../components/MicButton.svelte'
  import PianoKeyboard from '../components/PianoKeyboard.svelte'
  import { monoPitch, startMonoDetection, stopMonoDetection } from '../lib/audio/monoPitch.svelte'
  import { registerVoiceCommands } from '../lib/voice/voice.svelte'

  $effect(() =>
    registerVoiceCommands({
      name: 'Note Detector',
      phrases: ['start listening', 'stop listening'],
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
</style>
