<script lang="ts">
  import { currentParams } from '../router.svelte'

  /**
   * Breadcrumb back to the learning guide, shown only when the user arrived
   * via a guide deep link (?from=guide). Plain hash link — browser back works
   * the same way.
   */
  const fromGuide = $derived(currentParams().from === 'guide')
</script>

{#if fromGuide}
  <p class="back">
    <a href="#/guide">← Back to the learning guide</a>
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
