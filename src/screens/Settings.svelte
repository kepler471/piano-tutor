<script lang="ts">
  import { A4_DEFAULT, A4_MAX, A4_MIN, settings } from '../lib/settings.svelte'
  import { clearMisses, readMisses, type VoiceMiss } from '../lib/voice/missLog'
  import { navigate } from '../router.svelte'

  let misses = $state<VoiceMiss[]>(readMisses().reverse()) // newest first

  function onClearMisses() {
    clearMisses()
    misses = []
  }

  // Offline/storage status (best-effort, prod-only for the service worker).
  let swActive = $state<boolean | null>(null)
  let voskCached = $state<boolean | null>(null)
  $effect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.getRegistration().then((r) => (swActive = !!r?.active))
    } else {
      swActive = false
    }
    if ('caches' in window) {
      void caches.has('piano-tutor.vosk-model').then((h) => (voskCached = h))
    }
  })

  function fmtWhen(ts: number): string {
    return new Date(ts).toLocaleString()
  }
</script>

<section>
  <h1>Settings</h1>

  <div class="card">
    <h2>Tuning</h2>
    <label class="row">
      Tuning reference A4
      <input
        type="number"
        min={A4_MIN}
        max={A4_MAX}
        step="0.5"
        value={settings.a4}
        onchange={(e) => {
          settings.setA4(Number(e.currentTarget.value))
          e.currentTarget.value = String(settings.a4)
        }}
      />
      Hz
      {#if settings.a4 !== A4_DEFAULT}
        <button class="ghost" onclick={() => settings.setA4(A4_DEFAULT)}>Reset to 440</button>
      {/if}
    </label>
    <p class="hint">
      If your instrument is tuned away from concert pitch, single-note detection reads every note a
      few cents off. Set the reference here, or
      <button class="link" onclick={() => navigate('/tuner')}>auto-calibrate on the Note Detector →</button>
      Takes effect the next time listening starts. Chord detection always analyzes at A=440 — within
      the 435–445 range that doesn't affect which notes it hears.
    </p>
  </div>

  <div class="card">
    <h2>Detection</h2>
    <label class="row">
      <input type="checkbox" checked={settings.fusion} onchange={(e) => settings.setFusion(e.currentTarget.checked)} />
      Instant melody feedback during mic chord practice
    </label>
    <p class="hint">
      Chord practice on the mic normally waits for the chord analyzer (about a second behind). With
      this on, the fast single-note detector grades the most prominent note instantly and the
      analyzer fills in the rest of the chord. Turn it off if you see spurious wrong-note flashes
      during chords. Takes effect the next time listening starts.
    </p>
  </div>

  <div class="card">
    <h2>Practice defaults</h2>
    <div class="row">
      <span>Default hand in the scale &amp; chord libraries:</span>
      {#each [['R', 'Right'], ['L', 'Left']] as const as [value, label] (value)}
        <button
          class="seg"
          class:active={settings.defaultHand === value}
          onclick={() => settings.setDefaultHand(value)}
        >
          {label}
        </button>
      {/each}
    </div>
  </div>

  <div class="card">
    <h2>Voice control</h2>
    {#if misses.length}
      <p class="hint">
        Phrases the voice control heard but couldn't act on — useful for spotting wordings it should
        learn ({misses.length} of the last 50):
      </p>
      <ul class="misses">
        {#each misses as m (m.ts)}
          <li><span class="miss-text">“{m.text}”</span> <span class="when">{fmtWhen(m.ts)}</span></li>
        {/each}
      </ul>
      <button class="ghost" onclick={onClearMisses}>Clear list</button>
    {:else}
      <p class="hint">No unrecognized voice phrases logged. Misheard commands will show up here.</p>
    {/if}
  </div>

  <div class="card">
    <h2>Offline</h2>
    <p class="hint">
      {#if swActive === null}
        Checking offline support…
      {:else if swActive}
        ✓ Offline support is active — pages, sheet music and models you've used are cached on this
        device.
      {:else}
        Offline caching isn't active in this session (it's enabled in the installed/production app).
      {/if}
      {#if voskCached !== null}
        {voskCached ? ' ✓ Voice model downloaded.' : ' Voice model not downloaded yet (enable voice control to fetch it).'}
      {/if}
    </p>
  </div>
</section>

<style>
  .card {
    margin-top: 16px;
    gap: 10px;
  }
  .card h2 {
    margin: 0 0 10px;
    font-size: 16px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 14px;
    color: #334155;
  }
  .row input[type='number'] {
    width: 80px;
    padding: 4px 6px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
  }
  .ghost {
    border: none;
    background: none;
    color: #1d4ed8;
    cursor: pointer;
    font-size: 13px;
  }
  .link {
    border: none;
    background: none;
    color: #1d4ed8;
    cursor: pointer;
    font-size: inherit;
    padding: 0;
    text-decoration: underline;
  }
  .misses {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 260px;
    overflow-y: auto;
  }
  .misses li {
    font-size: 13px;
    color: #334155;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid #f1f5f9;
    padding: 4px 0;
  }
  .when {
    color: #94a3b8;
    font-size: 12px;
    white-space: nowrap;
  }
</style>
