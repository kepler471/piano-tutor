<script lang="ts">
  import BackToGuide from '../components/BackToGuide.svelte'
  import GlossText from '../components/GlossText.svelte'
  import InputPicker from '../components/InputPicker.svelte'
  import SheetMusic from '../components/SheetMusic.svelte'
  import { getAnchorMs, onBeat, startMetronome, stopMetronome } from '../lib/audio/metronome'
  import { patternToNotation, RHYTHM_PATTERNS, type RhythmPattern } from '../lib/data/rhythms'
  import { onInput } from '../lib/input/noteInput.svelte'
  import { durationFromBeats, type HighlightState, type ScoreModel } from '../lib/notation/vexScore'
  import { addRecord } from '../lib/practice/history.svelte'
  import { getProgress, recordRun, setLevel as setStoredLevel, STREAK_TO_LEVEL_UP } from '../lib/practice/progress.svelte'
  import { gradeTiming, type TimingResult } from '../lib/practice/timingGrader'
  import { currentParams } from '../router.svelte'

  const SWING_RATIO = 2 / 3
  const COUNT_IN = 4
  const MAX_LEVEL = 5
  const ACTIVITY = 'rhythm'

  type Level = 1 | 2 | 3 | 4 | 5

  let level = $state<Level>(1)
  let patternId = $state(RHYTHM_PATTERNS[0].id)
  let bpm = $state(80)

  // Guide deep link (read once at mount) wins; otherwise resume the
  // persisted level.
  {
    const linked = Number(currentParams().level)
    const stored = Math.min(getProgress(ACTIVITY).level, MAX_LEVEL) as Level
    level = Number.isInteger(linked) && linked >= 1 && linked <= MAX_LEVEL ? (linked as Level) : stored
    patternId = RHYTHM_PATTERNS.find((p) => p.level === level)!.id
  }

  const levelPatterns = $derived(RHYTHM_PATTERNS.filter((p) => p.level === level))
  const pattern = $derived(RHYTHM_PATTERNS.find((p) => p.id === patternId) ?? levelPatterns[0])

  type Phase = 'idle' | 'count-in' | 'playing' | 'done'
  let phase = $state<Phase>('idle')
  let countBeat = $state(0)
  let result = $state<TimingResult | null>(null)
  // Streak-towards-level-up message for the summary card. Level-ups unlock
  // the next level in the store but never switch patterns mid-view.
  let runFeedback = $state<string | null>(null)

  let onsets: { tMs: number }[] = []
  let stopBeatListener: (() => void) | null = null
  let stopInputListener: (() => void) | null = null

  const totalBeats = $derived(pattern.bars * ((pattern.timeSignature[0] * 4) / pattern.timeSignature[1]))

  function setLevel(l: Level) {
    stopRun()
    level = l
    patternId = RHYTHM_PATTERNS.find((p) => p.level === l)!.id
    result = null
    runFeedback = null
    setStoredLevel(ACTIVITY, l)
  }

  function selectPattern(id: string) {
    stopRun()
    patternId = id
    result = null
    runFeedback = null
  }

  function stopRun() {
    stopMetronome()
    stopBeatListener?.()
    stopBeatListener = null
    stopInputListener?.()
    stopInputListener = null
    if (phase === 'count-in' || phase === 'playing') phase = 'idle'
  }

  function finish() {
    const anchor = getAnchorMs()
    stopRun()
    if (anchor !== null) {
      result = gradeTiming(
        pattern.events.map((e) => ({ startBeat: e.startBeat })),
        onsets,
        bpm,
        anchor,
        pattern.swing ? { swingRatio: SWING_RATIO } : {},
      )
      addRecord({
        lessonId: `rhythm-${pattern.id}`,
        title: `Rhythm: ${pattern.label}`,
        segment: `♩=${bpm}`,
        mistakes: result.missed.length + result.extra.length,
        steps: pattern.events.length,
        kind: 'rhythm',
        score: {
          correct: result.hits.filter((h) => h.rating === 'perfect' || h.rating === 'good').length,
          total: pattern.events.length,
        },
      })
      const clean =
        result.missed.length === 0 &&
        result.extra.length === 0 &&
        result.hits.every((h) => h.rating === 'perfect' || h.rating === 'good')
      const { leveledUp, progress } = recordRun(ACTIVITY, clean, MAX_LEVEL)
      if (leveledUp) {
        runFeedback = `🎉 Three clean runs in a row — Level ${progress.level} unlocked.`
      } else if (clean && level < MAX_LEVEL) {
        runFeedback = `Clean run — ${progress.streak}/${STREAK_TO_LEVEL_UP} towards level ${level + 1}.`
      } else {
        runFeedback = null
      }
    }
    phase = 'done'
  }

  async function start() {
    result = null
    runFeedback = null
    onsets = []
    phase = 'count-in'
    countBeat = 0
    stopInputListener = onInput((ev) => {
      if (ev.kind === 'on' && phase === 'playing') onsets.push({ tMs: ev.tMs ?? performance.now() })
    })
    stopBeatListener = onBeat((beatIndex) => {
      if (beatIndex < 0) {
        countBeat = beatIndex + COUNT_IN + 1
      } else if (beatIndex === 0) {
        phase = 'playing'
      }
      // One extra beat after the pattern so a late final tap still lands.
      if (beatIndex >= totalBeats + 1) finish()
    })
    await startMetronome(bpm, { countInBeats: COUNT_IN })
  }

  $effect(() => () => stopRun()) // teardown on navigate away

  const notation = $derived(patternToNotation(pattern))

  const score = $derived.by((): ScoreModel => {
    return {
      clef: 'treble',
      keySignature: 'C',
      timeSignature: `${pattern.timeSignature[0]}/${pattern.timeSignature[1]}`,
      events: notation.events.map((ev) => {
        const { duration, dots } = durationFromBeats(ev.durationBeats)
        return { keys: ['b/4'], duration, dots, rest: ev.rest, endsBar: ev.endsBar }
      }),
    }
  })

  const highlights = $derived.by(() => {
    const map = new Map<number, HighlightState>()
    if (!result) return map
    for (const hit of result.hits) {
      const noteIdx = notation.noteIndices[hit.index]
      map.set(noteIdx, hit.rating === 'perfect' ? 'correct' : hit.rating === 'good' ? 'played' : 'next')
    }
    for (const missIdx of result.missed) map.set(notation.noteIndices[missIdx], 'wrong')
    return map
  })

  const summary = $derived.by(() => {
    if (!result) return null
    const count = (r: string) => result!.hits.filter((h) => h.rating === r).length
    return {
      perfect: count('perfect'),
      good: count('good'),
      off: count('early') + count('late'),
      missed: result.missed.length,
      extra: result.extra.length,
      pct: Math.round(result.accuracy * 100),
    }
  })
</script>

<section>
  <BackToGuide />
  <h1>Rhythm Trainer</h1>
  <p class="hint">
    Tap the rhythm on any key while the metronome clicks — the score lights up green where you were
    in the pocket. Four click count-in, then you're on.
  </p>

  <div class="controls-row">
    {#each [1, 2, 3, 4, 5] as const as l (l)}
      <button class="seg" class:active={level === l} onclick={() => setLevel(l)}>
        Level {l}
      </button>
    {/each}
    <span class="spacer"></span>
    <label class="bpm">
      <input type="number" min="50" max="140" bind:value={bpm} disabled={phase === 'count-in' || phase === 'playing'} />
      BPM
    </label>
  </div>

  <div class="controls-row">
    {#each levelPatterns as p (p.id)}
      <button class="seg" class:active={pattern.id === p.id} data-tip={p.hint} onclick={() => selectPattern(p.id)}>
        {p.label}{p.swing ? ' 𝄋' : ''}
      </button>
    {/each}
  </div>

  <div class="card">
    {#if pattern.hint}
      <p class="hint"><GlossText text={pattern.hint + (pattern.swing ? ' (swing feel)' : '')} /></p>
    {/if}

    <InputPicker preferred="mono" />

    <div class="run-row">
      {#if phase === 'count-in'}
        <span class="count">Count-in: {countBeat}</span>
      {:else if phase === 'playing'}
        <span class="count live">Tap!</span>
        <button class="primary" onclick={stopRun}>■ Stop</button>
      {:else}
        <button class="primary" onclick={start}>▶ Start ({COUNT_IN}-beat count-in)</button>
      {/if}
    </div>

    <SheetMusic {score} {highlights} />

    {#if summary}
      <div class="complete">
        {summary.pct}% in the pocket —
        {summary.perfect} perfect · {summary.good} good
        {#if summary.off}· {summary.off} early/late{/if}
        {#if summary.missed}· {summary.missed} missed{/if}
        {#if summary.extra}· {summary.extra} stray tap{summary.extra === 1 ? '' : 's'}{/if}
        {#if runFeedback}
          <span class="feedback">{runFeedback}</span>
        {/if}
        <button class="primary" onclick={start}>↺ Again</button>
      </div>
      <p class="hint legend">
        <span class="lg green">●</span> perfect (±40 ms) · <span class="lg blue">●</span> good (±100 ms) ·
        <span class="lg orange">●</span> early/late · <span class="lg red">●</span> missed
      </p>
    {/if}
  </div>
</section>

<style>
  .controls-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin: 12px 0;
  }
  .spacer {
    flex: 1;
  }
  .bpm {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #475569;
  }
  .bpm input {
    width: 60px;
    padding: 4px 6px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .run-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .count {
    font-size: 22px;
    font-weight: 700;
    color: #1d4ed8;
  }
  .count.live {
    color: #16a34a;
  }
  .feedback {
    display: block;
    font-size: 13px;
    color: #475569;
  }
  .legend .lg.green {
    color: #16a34a;
  }
  .legend .lg.blue {
    color: #2563eb;
  }
  .legend .lg.orange {
    color: #d97706;
  }
  .legend .lg.red {
    color: #dc2626;
  }
</style>
