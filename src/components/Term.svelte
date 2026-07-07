<script lang="ts" module>
  let nextTipId = 0
</script>

<script lang="ts">
  import { lookupTerm } from '../lib/data/glossary'

  /**
   * Inline glossary term with a tooltip definition: dotted underline, shown
   * on hover/keyboard focus, tap-to-toggle on touch. Unknown ids render as
   * plain text so a missing glossary entry can never break a screen.
   */
  let { term, label }: { term: string; label?: string } = $props()

  const entry = $derived(lookupTerm(term))
  $effect(() => {
    if (!entry && import.meta.env.DEV) console.warn(`[glossary] unknown term id: ${term}`)
  })

  const tipId = `gloss-tip-${++nextTipId}`
  let open = $state(false)
</script>

{#if entry}<span class="wrap" class:open
  ><button
    type="button"
    class="term"
    aria-describedby={tipId}
    onclick={() => (open = !open)}
    onblur={() => (open = false)}
    onkeydown={(e) => e.key === 'Escape' && (open = false)}
    onmouseleave={() => (open = false)}>{label ?? entry.term}</button
  ><span class="tip" role="tooltip" id={tipId}><strong>{entry.term}.</strong> {entry.short}</span></span
>{:else}{label ?? term}{/if}

<style>
  .wrap {
    position: relative;
    display: inline;
  }
  .term {
    border: none;
    background: none;
    padding: 0;
    margin: 0;
    font: inherit;
    color: inherit;
    cursor: help;
    border-bottom: 1px dotted #94a3b8;
    border-radius: 0;
  }
  .term:focus-visible {
    outline: 2px solid #93c5fd;
    outline-offset: 1px;
  }
  .tip {
    display: none;
    position: absolute;
    bottom: calc(100% + 6px);
    left: 0;
    z-index: 30;
    width: max-content;
    max-width: min(260px, 78vw);
    padding: 8px 12px;
    border-radius: 8px;
    background: #1e293b;
    color: #f1f5f9;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.5;
    text-align: left;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.25);
  }
  .tip strong {
    color: #fff;
  }
  .wrap:hover .tip,
  .wrap:focus-within .tip,
  .wrap.open .tip {
    display: block;
  }
</style>
