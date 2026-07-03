<script lang="ts">
  import { mic } from '../lib/audio/mic.svelte'
  import { monoPitch, startMonoDetection, stopMonoDetection } from '../lib/audio/monoPitch.svelte'
  import { polyPitch, startPolyDetection, stopPolyDetection } from '../lib/audio/polyPitch.svelte'

  /** When true, also runs the polyphonic (chord) engine alongside the fast mono one. */
  let { poly = false }: { poly?: boolean } = $props()

  const listening = $derived(monoPitch.running && mic.status === 'running')
  const levelPct = $derived(Math.min(100, monoPitch.level * 800))

  async function start() {
    await startMonoDetection()
    if (poly && mic.status === 'running') await startPolyDetection()
  }

  function stop() {
    if (poly) stopPolyDetection()
    stopMonoDetection()
  }
</script>

<div class="mic-row">
  {#if listening}
    <button class="primary listening" onclick={stop}>■ Stop listening</button>
    <div class="meter" title="Input level">
      <div class="meter-fill" style="width: {levelPct}%"></div>
    </div>
    {#if poly}
      {#if polyPitch.status === 'loading'}
        <span class="badge loading">loading chord model…</span>
      {:else if polyPitch.status === 'listening'}
        <span class="badge ready">chord detection on ({polyPitch.backend})</span>
      {:else if polyPitch.status === 'error'}
        <span class="mic-error">chord model failed: {polyPitch.errorMessage}</span>
      {/if}
    {/if}
  {:else}
    <button class="primary" onclick={start}>
      {mic.status === 'requesting' ? 'Requesting microphone…' : '🎤 Start listening'}
    </button>
  {/if}
  {#if mic.status === 'denied' || mic.status === 'error'}
    <span class="mic-error">{mic.errorMessage}</span>
  {/if}
</div>

<style>
  .mic-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  button.listening {
    background: #b91c1c;
  }
  button.listening:hover {
    background: #991b1b;
  }
  .meter {
    width: 140px;
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
  }
  .meter-fill {
    height: 100%;
    background: #22c55e;
    transition: width 0.08s linear;
  }
  .mic-error {
    color: #b91c1c;
    font-size: 13px;
  }
  .badge {
    font-size: 12px;
    padding: 3px 10px;
    border-radius: 999px;
  }
  .badge.loading {
    background: #fef3c7;
    color: #92400e;
  }
  .badge.ready {
    background: #dcfce7;
    color: #166534;
  }
</style>
