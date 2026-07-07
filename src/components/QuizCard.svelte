<script lang="ts">
  /**
   * Presentational multiple-choice card: answer options with reveal styling
   * once the user has picked, plus a replay button for by-ear questions
   * (omit onreplay for visual/text questions).
   */
  let {
    options,
    answer,
    selected,
    playing = false,
    onselect,
    onreplay,
    explanation,
  }: {
    options: string[]
    answer: string
    selected: string | null
    playing?: boolean
    onselect: (option: string) => void
    onreplay?: () => void
    /** Shown after the reveal (right or wrong) — the "why" behind the answer. */
    explanation?: string
  } = $props()

  const revealed = $derived(selected !== null)
</script>

<div class="quiz">
  {#if onreplay}
    <button class="primary replay" onclick={onreplay} disabled={playing}>
      {playing ? 'Playing…' : '🔊 Hear it again'}
    </button>
  {/if}
  <div class="options">
    {#each options as opt (opt)}
      <button
        class="option"
        class:correct={revealed && opt === answer}
        class:wrong={revealed && opt === selected && opt !== answer}
        disabled={revealed}
        onclick={() => onselect(opt)}
      >
        {opt}
      </button>
    {/each}
  </div>
  {#if revealed}
    <p class="verdict" class:good={selected === answer}>
      {selected === answer ? 'Correct!' : `It was ${answer}.`}
    </p>
    {#if explanation}
      <p class="why">{explanation}</p>
    {/if}
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
    gap: 10px;
    flex-wrap: wrap;
  }
  .option {
    padding: 10px 18px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
    cursor: pointer;
    font-size: 15px;
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
    color: #166534;
    font-weight: 600;
  }
  .option.wrong {
    background: #fee2e2;
    border-color: #dc2626;
    color: #991b1b;
  }
  .verdict {
    margin: 0;
    font-weight: 600;
    color: #991b1b;
  }
  .verdict.good {
    color: #166534;
  }
  .why {
    margin: -6px 0 0;
    color: #64748b;
    font-size: 13px;
    line-height: 1.55;
    max-width: 560px;
  }
</style>
