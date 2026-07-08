<script lang="ts">
  import SheetMusic from './SheetMusic.svelte'
  import { scoreFromSteps, type HighlightState } from '../lib/notation/vexScore'

  /**
   * Reading trainer: a short phrase is drawn on the staff and the user names
   * the notes left to right by tapping letters. Wrong guesses flash red but
   * never advance the cursor — the same "wait, don't fail" grading the mic
   * modes use. Completion (all notes named) reports the mistake count.
   */
  let {
    clef,
    keySignature,
    midis,
    names,
    optionPool,
    oncomplete,
  }: {
    clef: 'treble' | 'bass'
    keySignature: string
    midis: number[]
    names: string[]
    optionPool: string[]
    oncomplete?: (mistakes: number) => void
  } = $props()

  let cursor = $state(0)
  let mistakes = $state(0)
  let stumbled = $state(new Set<number>()) // indices named only after a wrong guess
  let wrongFlash = $state<string | null>(null)
  let flashTimer: ReturnType<typeof setTimeout> | undefined

  // Reset when the phrase changes (the parent keys us, but be safe).
  $effect(() => {
    void midis
    cursor = 0
    mistakes = 0
    stumbled = new Set()
    wrongFlash = null
  })

  const score = $derived(
    scoreFromSteps(
      midis.map((m) => ({ midis: [m], fingers: [null] })),
      keySignature,
      clef,
    ),
  )

  const highlights = $derived.by(() => {
    const map = new Map<number, HighlightState>()
    for (let i = 0; i < cursor; i++) map.set(i, stumbled.has(i) ? 'played' : 'correct')
    if (cursor < names.length) map.set(cursor, 'next')
    return map
  })

  function choose(letter: string) {
    if (cursor >= names.length) return
    if (letter === names[cursor]) {
      cursor++
      if (cursor === names.length) oncomplete?.(mistakes)
    } else {
      mistakes++
      stumbled = new Set([...stumbled, cursor])
      wrongFlash = letter
      clearTimeout(flashTimer)
      flashTimer = setTimeout(() => (wrongFlash = null), 350)
    }
  }
</script>

<div class="melody">
  <div class="staff">
    <SheetMusic {score} {highlights} minWidth={280} />
  </div>
  <p class="hint">Name note {Math.min(cursor + 1, names.length)} of {names.length}.</p>
  <div class="letters">
    {#each optionPool as letter (letter)}
      <button
        class="seg"
        class:wrong={wrongFlash === letter}
        disabled={cursor >= names.length}
        onclick={() => choose(letter)}
      >
        {letter}
      </button>
    {/each}
  </div>
</div>

<style>
  .melody {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .staff {
    max-width: 420px;
  }
  .hint {
    margin: 0;
    font-size: 13px;
    color: #64748b;
  }
  .letters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .seg {
    min-width: 44px;
    padding: 10px 12px;
    font-size: 16px;
    font-weight: 600;
  }
  .seg.wrong {
    background: #fee2e2;
    border-color: #dc2626;
    color: #dc2626;
  }
</style>
