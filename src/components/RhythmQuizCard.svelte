<script lang="ts">
  import SheetMusic from './SheetMusic.svelte'
  import { patternToNotation, type RhythmPattern } from '../lib/data/rhythms'
  import { durationFromBeats, type ScoreModel } from '../lib/notation/vexScore'

  /**
   * Multiple-choice card where the options are rendered rhythm notation —
   * QuizCard stays string-only; this is its notation sibling for dictation.
   */
  let {
    options,
    answerId,
    selected,
    playing = false,
    onselect,
    onreplay,
  }: {
    options: RhythmPattern[]
    answerId: string
    selected: string | null
    playing?: boolean
    onselect: (patternId: string) => void
    onreplay: () => void
  } = $props()

  const revealed = $derived(selected !== null)

  function patternScore(pattern: RhythmPattern): ScoreModel {
    return {
      clef: 'treble',
      keySignature: 'C',
      timeSignature: `${pattern.timeSignature[0]}/${pattern.timeSignature[1]}`,
      events: patternToNotation(pattern).events.map((ev) => {
        const { duration, dots } = durationFromBeats(ev.durationBeats)
        return { keys: ['b/4'], duration, dots, rest: ev.rest, endsBar: ev.endsBar }
      }),
    }
  }
</script>

<div class="quiz">
  <button class="primary replay" onclick={onreplay} disabled={playing}>
    {playing ? 'Playing…' : '🔊 Hear it again'}
  </button>
  <div class="options">
    {#each options as pattern (pattern.id)}
      <button
        class="option"
        class:correct={revealed && pattern.id === answerId}
        class:wrong={revealed && pattern.id === selected && pattern.id !== answerId}
        disabled={revealed}
        onclick={() => onselect(pattern.id)}
      >
        <SheetMusic score={patternScore(pattern)} minWidth={280} />
      </button>
    {/each}
  </div>
  {#if revealed}
    <p class="verdict" class:good={selected === answerId}>
      {selected === answerId ? 'Correct!' : 'Not that one — the green line is what you heard.'}
    </p>
  {/if}
</div>

<style>
  .quiz {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .replay {
    align-self: flex-start;
  }
  .options {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .option {
    padding: 6px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
    cursor: pointer;
    text-align: left;
  }
  .option:hover:not(:disabled) {
    background: #f1f5f9;
  }
  .option:disabled {
    cursor: default;
  }
  .option.correct {
    background: #dcfce7;
    border-color: #22c55e;
  }
  .option.wrong {
    background: #fee2e2;
    border-color: #dc2626;
  }
  .verdict {
    margin: 0;
    font-weight: 600;
    color: #991b1b;
  }
  .verdict.good {
    color: #166534;
  }
</style>
