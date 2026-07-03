<script lang="ts">
  import { voice } from '../lib/voice/voice.svelte'

  const label = $derived.by(() => {
    switch (voice.status) {
      case 'downloading-model':
        return voice.modelProgress === null
          ? 'Downloading voice model…'
          : `Downloading voice model ${Math.round((voice.modelProgress ?? 0) * 100)}%`
      case 'loading':
        return 'Starting voice…'
      case 'listening':
        return '🎙 Voice on'
      case 'mic-denied':
        return 'Mic blocked'
      case 'error':
        return 'Voice error — retry'
      default:
        return '🎙 Voice'
    }
  })

  function toggle() {
    if (voice.status === 'listening') voice.disable()
    else void voice.enable()
  }
</script>

<button
  class="voice-toggle"
  class:on={voice.status === 'listening'}
  class:trouble={voice.status === 'mic-denied' || voice.status === 'error'}
  disabled={!voice.supported || voice.status === 'downloading-model' || voice.status === 'loading'}
  title={voice.supported
    ? 'Hands-free voice control — say "piano, help" for commands'
    : 'Voice control needs a browser with WebAssembly and microphone support'}
  onclick={toggle}
>
  {#if voice.status === 'listening'}<span class="dot"></span>{/if}
  {label}
</button>

<style>
  .voice-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
    border: 1px solid #e2e8f0;
    background: none;
    padding: 7px 12px;
    border-radius: 999px;
    cursor: pointer;
    font-size: 13px;
    color: #475569;
  }
  .voice-toggle:hover:not(:disabled) {
    background: #f1f5f9;
  }
  .voice-toggle:disabled {
    cursor: default;
    opacity: 0.7;
  }
  .voice-toggle.on {
    background: #eff6ff;
    border-color: #bfdbfe;
    color: #1d4ed8;
    font-weight: 600;
  }
  .voice-toggle.trouble {
    border-color: #fecaca;
    color: #b91c1c;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ef4444;
    animation: pulse 1.6s ease-in-out infinite;
  }
  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }
</style>
