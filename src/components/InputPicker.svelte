<script lang="ts">
  import { mic } from '../lib/audio/mic.svelte'
  import { monoPitch } from '../lib/audio/monoPitch.svelte'
  import { polyPitch } from '../lib/audio/polyPitch.svelte'
  import { midi } from '../lib/input/midi.svelte'
  import { noteInput } from '../lib/input/noteInput.svelte'

  /** Mic detector to use when no MIDI keyboard is connected. */
  let { preferred = 'mono' }: { preferred?: 'mono' | 'poly' } = $props()

  const levelPct = $derived(Math.min(100, monoPitch.level * 800))
  const selectedName = $derived(midi.inputs.find((i) => i.id === midi.selectedId)?.name ?? '')

  // Silently restore MIDI access for returning MIDI users.
  $effect(() => {
    void midi.autoEnable()
  })

  function start() {
    void noteInput.start(preferred)
  }
</script>

<div class="input-row">
  {#if noteInput.listening}
    <button class="primary listening" onclick={() => noteInput.stop()}>■ Stop listening</button>
    {#if noteInput.activeSource === 'midi'}
      {#if midi.inputs.length > 1}
        <select bind:value={midi.selectedId}>
          {#each midi.inputs as input (input.id)}
            <option value={input.id}>{input.name}</option>
          {/each}
        </select>
      {:else}
        <span class="badge ready">🎹 {selectedName}</span>
      {/if}
    {:else}
      <div class="meter" title="Input level">
        <div class="meter-fill" style="width: {levelPct}%"></div>
      </div>
      {#if noteInput.activeSource === 'mic-poly'}
        {#if polyPitch.status === 'loading'}
          <span class="badge loading">loading chord model…</span>
        {:else if polyPitch.status === 'listening'}
          <span class="badge ready">chord detection on ({polyPitch.backend})</span>
        {:else if polyPitch.status === 'error'}
          <span class="input-error">chord model failed: {polyPitch.errorMessage}</span>
        {/if}
      {/if}
    {/if}
  {:else}
    <button class="primary" onclick={start}>
      {#if midi.hasInput}
        🎹 Start ({selectedName})
      {:else if mic.status === 'requesting'}
        Requesting microphone…
      {:else}
        🎤 Start listening
      {/if}
    </button>
    {#if midi.supported && !midi.hasInput && midi.status !== 'requesting'}
      <button class="ghost" onclick={() => void midi.enable()}>
        {midi.status === 'ready' ? 'No MIDI keyboard found — plug one in' : 'Connect MIDI keyboard'}
      </button>
    {/if}
  {/if}
  {#if mic.status === 'denied' || mic.status === 'error'}
    <span class="input-error">{mic.errorMessage}</span>
  {/if}
  {#if midi.status === 'denied' || midi.status === 'error'}
    <span class="input-error">{midi.errorMessage}</span>
  {/if}
</div>

<style>
  .input-row {
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
  .ghost {
    border: none;
    background: none;
    color: #1d4ed8;
    cursor: pointer;
    font-size: 13px;
  }
  select {
    padding: 6px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
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
  .input-error {
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
