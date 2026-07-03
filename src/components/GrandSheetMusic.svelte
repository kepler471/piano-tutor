<script lang="ts">
  import { renderGrandScore, type HighlightState } from '../lib/notation/vexScore'
  import type { SongSystem } from '../lib/notation/songScore'

  /**
   * Stacked grand-staff systems for song notation. Highlights come keyed by
   * matcher step index; each system maps them onto its own note events.
   */
  let {
    systems,
    stepHighlights,
  }: {
    systems: SongSystem[]
    stepHighlights?: Map<number, HighlightState>
  } = $props()

  let container: HTMLDivElement | undefined = $state()

  $effect(() => {
    if (!container) return
    container.innerHTML = ''
    for (const system of systems) {
      const div = document.createElement('div')
      container.appendChild(div)
      const treble = new Map<number, HighlightState>()
      const bass = new Map<number, HighlightState>()
      if (stepHighlights) {
        system.trebleSteps.forEach((step, i) => {
          if (step !== null && stepHighlights.has(step)) treble.set(i, stepHighlights.get(step)!)
        })
        system.bassSteps.forEach((step, i) => {
          if (step !== null && stepHighlights.has(step)) bass.set(i, stepHighlights.get(step)!)
        })
      }
      try {
        renderGrandScore(div, system.model, treble, 320, bass)
      } catch (err) {
        console.error('Song system render failed', err)
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
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
</style>
