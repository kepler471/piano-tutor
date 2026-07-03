<script lang="ts">
  import { currentRoute, navigate } from './router.svelte'
  import VoiceButton from './components/VoiceButton.svelte'
  import VoiceHud from './components/VoiceHud.svelte'
  import Home from './screens/Home.svelte'
  import ScalesLibrary from './screens/ScalesLibrary.svelte'
  import ChordsLibrary from './screens/ChordsLibrary.svelte'
  import Practice from './screens/Practice.svelte'
  import FreePlay from './screens/FreePlay.svelte'
  import Tuner from './screens/Tuner.svelte'

  const links = [
    { route: '/', label: 'Home' },
    { route: '/scales', label: 'Scales' },
    { route: '/chords', label: 'Chords' },
    { route: '/practice', label: 'Practice' },
    { route: '/play', label: 'Free Play' },
    { route: '/tuner', label: 'Note Detector' },
  ]

  const route = $derived(currentRoute())
</script>

<nav>
  <span class="brand">🎹 Piano Tutor</span>
  {#each links as l (l.route)}
    <button class="nav-link" class:active={route === l.route} onclick={() => navigate(l.route)}>
      {l.label}
    </button>
  {/each}
  <VoiceButton />
</nav>

<main>
  {#if route === '/scales'}
    <ScalesLibrary />
  {:else if route === '/chords'}
    <ChordsLibrary />
  {:else if route === '/practice'}
    <Practice />
  {:else if route === '/play'}
    <FreePlay />
  {:else if route === '/tuner'}
    <Tuner />
  {:else}
    <Home />
  {/if}
</main>

<VoiceHud />

<style>
  nav {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 10px 20px;
    background: #fff;
    border-bottom: 1px solid #e2e8f0;
    position: sticky;
    top: 0;
    z-index: 10;
    flex-wrap: wrap;
  }
  .brand {
    font-weight: 700;
    margin-right: 16px;
  }
  .nav-link {
    border: none;
    background: none;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    color: #475569;
  }
  .nav-link:hover {
    background: #f1f5f9;
  }
  .nav-link.active {
    background: #eff6ff;
    color: #1d4ed8;
    font-weight: 600;
  }
  main {
    max-width: 1000px;
    margin: 0 auto;
    padding: 24px 20px 80px;
  }
</style>
