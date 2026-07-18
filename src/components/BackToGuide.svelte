<script lang="ts">
  import { currentParams } from '../router.svelte'

  /**
   * Breadcrumb back to the curriculum the user came from, shown only when
   * they arrived via a deep link (?from=guide or ?from=chord-path). Plain
   * hash link — browser back works the same way.
   */
  const SOURCES: Record<string, { href: string; label: string }> = {
    guide: { href: '#/guide', label: '← Back to the learning guide' },
    'chord-path': { href: '#/chord-path', label: '← Back to the chord path' },
  }
  const source = $derived(SOURCES[currentParams().from ?? ''])
</script>

{#if source}
  <p class="back">
    <a href={source.href}>{source.label}</a>
  </p>
{/if}

<style>
  .back {
    margin: 0 0 4px;
    font-size: 14px;
  }
  .back a {
    color: #1d4ed8;
    text-decoration: none;
  }
  .back a:hover {
    text-decoration: underline;
  }
</style>
