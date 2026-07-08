<script lang="ts">
  import {
    grandScoreNaturalWidth,
    renderGrandScore,
    type HighlightState,
  } from '../lib/notation/vexScore'
  import { songSystems } from '../lib/notation/songScore'
  import type { Song } from '../lib/data/songs/types'
  import type { SongStepOptions } from '../lib/practice/songSteps'

  /**
   * Stacked grand-staff systems for song notation, fitted to the available
   * width: as many measures per line as fit comfortably, every full line
   * justified to the container so nothing scrolls sideways. Highlights come
   * keyed by matcher step index; each system maps them onto its own events.
   */
  let {
    song,
    range,
    stepHighlights,
    showFingering,
  }: {
    song: Song
    range: SongStepOptions
    stepHighlights?: Map<number, HighlightState>
    showFingering?: boolean
  } = $props()

  let container: HTMLDivElement | undefined = $state()
  let measuredWidth = $state(0)

  const MAX_MEASURES_PER_LINE = 4
  const sheetWidth = $derived(Math.max(320, Math.floor(measuredWidth)))

  const systems = $derived.by(() => {
    // Per-measure event density, then the most measures per line whose
    // densest line still fits the container at natural spacing.
    const counts = songSystems(song, { ...range, measuresPerSystem: 1, showFingering }).map((s) =>
      Math.max(s.model.treble.length, s.model.bass.length),
    )
    let per = 1
    for (let k = MAX_MEASURES_PER_LINE; k >= 2; k--) {
      let fits = true
      for (let i = 0; i < counts.length && fits; i += k) {
        const events = counts.slice(i, i + k).reduce((a, b) => a + b, 0)
        if (grandScoreNaturalWidth(events) > sheetWidth) fits = false
      }
      if (fits) {
        per = k
        break
      }
    }
    return songSystems(song, { ...range, measuresPerSystem: per, showFingering })
  })

  $effect(() => {
    if (!container) return
    container.innerHTML = ''
    systems.forEach((system, sysIndex) => {
      const div = document.createElement('div')
      container!.appendChild(div)
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
      // Justify every line to the sheet; the final (often partial) line keeps
      // its natural width so a couple of notes never stretch across the page.
      const natural = grandScoreNaturalWidth(
        Math.max(system.model.treble.length, system.model.bass.length),
      )
      const width =
        sysIndex === systems.length - 1 ? Math.min(sheetWidth, Math.max(320, natural)) : sheetWidth
      try {
        renderGrandScore(div, system.model, treble, { width, bassHighlights: bass })
      } catch (err) {
        console.error('Song system render failed', err)
      }
    })
  })
</script>

<div class="sheet-wrap" bind:clientWidth={measuredWidth}>
  <div class="sheet" bind:this={container}></div>
</div>

<style>
  .sheet-wrap {
    width: 100%;
  }
  .sheet {
    background: #fff;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden;
  }
</style>
