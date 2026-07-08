<script lang="ts">
  import { voice, voiceHelpTopics } from '../lib/voice/voice.svelte'

  let showHelp = $state(false)
</script>

{#if voice.status !== 'off'}
  <div class="voice-hud">
    {#if voice.status === 'mic-denied' || voice.status === 'error'}
      <div class="row error">
        <span>{voice.errorMessage || 'Voice control failed.'}</span>
        <button class="link" onclick={() => void voice.enable({ announce: true })}>Retry</button>
      </div>
    {:else if voice.status === 'downloading-model'}
      <div class="row muted">
        Downloading voice model…
        {#if voice.modelProgress !== null}
          <progress value={voice.modelProgress} max="1"></progress>
        {/if}
      </div>
    {:else if voice.status === 'loading'}
      <div class="row muted">Starting voice control…</div>
    {:else}
      {#if voice.needsGesture}
        <div class="row warn">Tap anywhere once to activate the microphone.</div>
      {/if}
      {#if voice.partial}
        <div class="row live">“{voice.partial}…”</div>
      {:else if voice.lastHeard}
        <div class="row">
          <span class="muted">Heard:</span> “{voice.lastHeard}”
          {#if voice.lastFeedback}<span class="muted">→ {voice.lastFeedback}</span>{/if}
        </div>
      {:else}
        <div class="row muted">Say “piano, help” or “piano, show me D major”.</div>
      {/if}
    {/if}
    <button class="link" onclick={() => (showHelp = !showHelp)}>
      {showHelp ? 'Hide commands' : 'What can I say?'}
    </button>
    {#if showHelp}
      <div class="help">
        {#each voiceHelpTopics() as topic (topic.scope)}
          <div class="help-scope">
            <h4>{topic.scope}</h4>
            <ul>
              {#each topic.phrases as phrase (phrase)}
                <li>“piano, {phrase}”</li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .voice-hud {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 20;
    max-width: 340px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
    padding: 10px 14px;
    font-size: 13px;
    color: #334155;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 4px;
  }
  .muted {
    color: #94a3b8;
  }
  .live {
    color: #1d4ed8;
    font-style: italic;
  }
  .warn {
    color: #92400e;
    background: #fef3c7;
    border-radius: 6px;
    padding: 4px 8px;
  }
  .error {
    color: #b91c1c;
  }
  .link {
    border: none;
    background: none;
    padding: 0;
    color: #1d4ed8;
    cursor: pointer;
    font-size: 12px;
  }
  .help {
    max-height: 300px;
    overflow-y: auto;
    margin-top: 8px;
    border-top: 1px solid #f1f5f9;
    padding-top: 8px;
  }
  .help-scope h4 {
    margin: 6px 0 2px;
    font-size: 12px;
    color: #64748b;
  }
  .help-scope ul {
    margin: 0;
    padding-left: 18px;
  }
  .help-scope li {
    margin: 2px 0;
  }
  progress {
    width: 120px;
  }
</style>
