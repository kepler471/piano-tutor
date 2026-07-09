<script lang="ts">
  import InputPicker from './InputPicker.svelte'
  import SheetMusic from './SheetMusic.svelte'
  import { playSequence } from '../lib/audio/playback'
  import { onInput } from '../lib/input/noteInput.svelte'
  import type { LessonStep } from '../lib/data/lessons/types'
  import { scoreFromSteps, type HighlightState } from '../lib/notation/vexScore'
  import { StepMatcher } from '../lib/practice/matcher'

  /**
   * "Play what you read": the phrase is drawn on the staff and the player
   * performs it on the real piano; the mic (via the input hub) drives the
   * cursor. No keyboard is shown — this is a reading test, so nothing lights
   * up the expected key. Wrong notes pulse the current note red; the matcher
   * waits, never fails. History is logged by the quiz screen, not here.
   */
  let {
    clef,
    keySignature,
    steps,
    oncomplete,
  }: {
    clef: 'treble' | 'bass'
    keySignature: string
    steps: LessonStep[]
    oncomplete?: (mistakes: number) => void
  } = $props()

  let version = $state(0) // bumped on every matcher mutation to drive reactivity
  let wrongPulse = $state(false)
  let pulseTimer: ReturnType<typeof setTimeout> | undefined
  let demoPlaying = $state(false)

  const matcher = $derived(new StepMatcher(steps, { lookahead: 1 }))

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
        wrongPulse = true
        clearTimeout(pulseTimer)
        pulseTimer = setTimeout(() => (wrongPulse = false), 350)
      }
      if (outcome.done && !completed) {
        completed = true
        oncomplete?.(matcher.mistakes)
      }
    })
  })

  const score = $derived(scoreFromSteps(steps, keySignature, clef))

  const highlights = $derived.by(() => {
    void version
    const map = new Map<number, HighlightState>()
    matcher.results.forEach((r, i) => {
      if (r === 'correct') map.set(i, 'correct')
      else if (r === 'corrected' || r === 'skipped') map.set(i, 'played')
    })
    if (!matcher.done) map.set(matcher.cursor, wrongPulse ? 'wrong' : 'next')
    return map
  })

  const progress = $derived.by(() => {
    void version
    return matcher.results
  })

  async function hear() {
    if (demoPlaying) return
    demoPlaying = true
    try {
      // Playback raises the audio gate, so the matcher never hears this.
      await playSequence(steps.flatMap((s) => s.midis), 96)
    } finally {
      demoPlaying = false
    }
  }
</script>

<div class="sight">
  <div class="staff">
    <SheetMusic {score} {highlights} minWidth={280} />
  </div>
  <div class="controls">
    <InputPicker preferred="mono" />
    <button class="ghost" onclick={hear} disabled={demoPlaying}>
      {demoPlaying ? 'Playing…' : '🔊 Hear it'}
    </button>
  </div>
  <div class="dots" title="Phrase progress">
    {#each progress as r, i (i)}
      <span class="dot" class:correct={r === 'correct'} class:corrected={r === 'corrected' || r === 'skipped'}></span>
    {/each}
  </div>
  <p class="hint">Read the notes and play them on your piano — look at the score, not your hands.</p>
</div>

<style>
  .sight {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .staff {
    max-width: 480px;
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
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
  .hint {
    margin: 0;
    font-size: 13px;
    color: #64748b;
  }
</style>
