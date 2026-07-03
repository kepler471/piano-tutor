<script lang="ts">
  import InputPicker from './InputPicker.svelte'
  import PianoKeyboard from './PianoKeyboard.svelte'
  import { noteInput, onInput } from '../lib/input/noteInput.svelte'
  import { StepMatcher } from '../lib/practice/matcher'

  /**
   * Call-and-response grader: the user plays back a phrase they just heard.
   * Deliberately no sheet music and no target-key highlighting — the ear is
   * the only guide. Wrong notes flash red; the matcher waits, never fails.
   */
  let {
    midis,
    oncomplete,
  }: {
    midis: number[]
    oncomplete?: (mistakes: number) => void
  } = $props()

  let version = $state(0)
  let wrongFlash = $state(new Set<number>())

  const matcher = $derived(new StepMatcher(midis.map((m) => ({ midis: [m], fingers: [null] }))))

  let completed = false
  $effect(() => {
    void matcher // reset the completion latch when the phrase changes
    completed = false
  })

  $effect(() => {
    return onInput((ev) => {
      if (ev.kind !== 'on' || matcher.done) return
      const outcome = matcher.onOnset(ev.midi)
      version++
      if (outcome.wrong) {
        const flashed = ev.midi
        wrongFlash = new Set([...wrongFlash, flashed])
        setTimeout(() => {
          wrongFlash = new Set([...wrongFlash].filter((m) => m !== flashed))
        }, 350)
      }
      if (outcome.done && !completed) {
        completed = true
        oncomplete?.(matcher.mistakes)
      }
    })
  })

  const progress = $derived.by(() => {
    void version
    return matcher.results
  })

  const kbFrom = $derived(Math.floor((Math.min(...midis) - 2) / 12) * 12)
  const kbTo = $derived(Math.ceil((Math.max(...midis) + 2) / 12) * 12)
</script>

<div class="echo">
  <InputPicker preferred="mono" />
  <div class="dots" title="Phrase progress">
    {#each progress as r, i (i)}
      <span class="dot" class:correct={r === 'correct'} class:corrected={r === 'corrected'}></span>
    {/each}
  </div>
  <PianoKeyboard from={kbFrom} to={kbTo} pressed={noteInput.activeNotes} wrong={wrongFlash} />
</div>

<style>
  .echo {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .dots {
    display: flex;
    gap: 8px;
  }
  .dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #e2e8f0;
  }
  .dot.correct {
    background: #22c55e;
  }
  .dot.corrected {
    background: #f59e0b;
  }
</style>
