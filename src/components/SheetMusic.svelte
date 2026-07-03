<script lang="ts">
  import { renderScore, type HighlightState, type ScoreModel } from '../lib/notation/vexScore'

  let {
    score,
    highlights,
    minWidth = 320,
  }: {
    score: ScoreModel
    highlights?: Map<number, HighlightState>
    minWidth?: number
  } = $props()

  let container: HTMLDivElement | undefined = $state()

  $effect(() => {
    if (container && score) {
      try {
        renderScore(container, score, highlights, minWidth)
      } catch (err) {
        console.error('Sheet music render failed', err)
      }
    }
  })
</script>

<div class="sheet" bind:this={container}></div>

<style>
  .sheet {
    overflow-x: auto;
    background: #fff;
    border-radius: 8px;
  }
</style>
