<script lang="ts">
  import { annotateGlossary } from '../lib/data/glossary'
  import Term from './Term.svelte'

  /**
   * Prose with glossary terms auto-annotated: recognized terms (see
   * annotateGlossary) render as <Term> tooltips, the rest as plain text.
   */
  let { text }: { text: string } = $props()

  const segments = $derived(annotateGlossary(text))
</script>

{#each segments as seg, i (i)}{#if seg.termId}<Term term={seg.termId} label={seg.text} />{:else}{seg.text}{/if}{/each}
