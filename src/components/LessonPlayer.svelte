<script lang="ts">
  import MicButton from './MicButton.svelte'
  import PianoKeyboard from './PianoKeyboard.svelte'
  import SheetMusic from './SheetMusic.svelte'
  import { setMetronomeBpm, startMetronome, stopMetronome } from '../lib/audio/metronome'
  import { monoPitch, onNoteEvent } from '../lib/audio/monoPitch.svelte'
  import { onPolyEvent, polyPitch } from '../lib/audio/polyPitch.svelte'
  import { playChord, playSequence } from '../lib/audio/playback'
  import type { Lesson } from '../lib/data/lessons'
  import { scoreFromSteps, type HighlightState } from '../lib/notation/vexScore'
  import { addRecord } from '../lib/practice/history.svelte'
  import { StepMatcher } from '../lib/practice/matcher'
  import type { Finger } from '../lib/theory/types'

  let { lesson, onexit }: { lesson: Lesson; onexit?: () => void } = $props()

  let segIndex = $state(0)
  const segment = $derived(lesson.segments[segIndex])

  let version = $state(0) // bumped on every matcher mutation to drive reactivity
  let resetKey = $state(0)
  let wrongFlash = $state(new Set<number>())
  let demoPlaying = $state(false)
  let metronomeOn = $state(false)
  // The player is keyed per lesson, so capturing the initial tempo is intended.
  // svelte-ignore state_referenced_locally
  let bpm = $state(lesson.tempoBpm)

  // Recreated whenever the lesson, segment, or resetKey changes.
  const matcher = $derived.by(() => {
    void resetKey
    return new StepMatcher(lesson.segments[segIndex].steps)
  })

  function restartSegment(index = segIndex) {
    segIndex = index
    resetKey++
    version++
  }

  $effect(() => {
    // Grading uses the lesson's designated detection source: fast mono for
    // melodic lessons, the chord model for chordal ones.
    const subscribe = lesson.detectionMode === 'poly' ? onPolyEvent : onNoteEvent
    return subscribe((ev) => {
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
    })
  })

  $effect(() => {
    if (metronomeOn) {
      void startMetronome(bpm)
      return () => stopMetronome()
    }
  })
  $effect(() => {
    if (metronomeOn) setMetronomeBpm(bpm)
  })

  const score = $derived.by(() => {
    void version
    return scoreFromSteps(segment.steps, lesson.keySignature, segment.clef)
  })

  const highlights = $derived.by(() => {
    void version
    const map = new Map<number, HighlightState>()
    matcher.results.forEach((r, i) => {
      if (r === 'correct') map.set(i, 'correct')
      else if (r === 'corrected') map.set(i, 'played')
    })
    if (!matcher.done) map.set(matcher.cursor, 'next')
    return map
  })

  const expected = $derived.by(() => {
    void version
    return matcher.done ? new Set<number>() : matcher.remaining
  })

  const fingerMap = $derived.by(() => {
    void version
    const map = new Map<number, Finger>()
    const cur = matcher.current
    cur?.midis.forEach((m, i) => {
      const f = cur.fingers[i]
      if (f) map.set(m, f)
    })
    return map
  })

  // Keyboard shows the union of both detectors; grading uses only the designated one.
  const pressed = $derived(
    new Set([
      ...(monoPitch.midi !== null ? [monoPitch.midi] : []),
      ...(lesson.detectionMode === 'poly' ? polyPitch.activeNotes : []),
    ]),
  )
  const done = $derived.by(() => {
    void version
    return matcher.done
  })
  const mistakes = $derived.by(() => {
    void version
    return matcher.mistakes
  })
  const progress = $derived.by(() => {
    void version
    return matcher.cursor
  })

  // Log each completed segment to practice history exactly once.
  let loggedDone = false
  $effect(() => {
    if (done && !loggedDone) {
      loggedDone = true
      addRecord({
        lessonId: lesson.id,
        title: lesson.title,
        segment: segment.label,
        mistakes: matcher.mistakes,
        steps: segment.steps.length,
      })
    } else if (!done) {
      loggedDone = false
    }
  })

  const allMidis = $derived(segment.steps.flatMap((s) => s.midis))
  const kbFrom = $derived(Math.floor((Math.min(...allMidis) - 2) / 12) * 12)
  const kbTo = $derived(Math.ceil((Math.max(...allMidis) + 2) / 12) * 12)

  async function demo() {
    if (demoPlaying) return
    demoPlaying = true
    try {
      const chordal = segment.steps.some((s) => s.midis.length > 1)
      if (chordal) {
        for (const step of segment.steps) {
          await playChord(step.midis, { duration: 1.1 })
        }
      } else {
        await playSequence(segment.steps.map((s) => s.midis[0]), bpm)
      }
    } finally {
      demoPlaying = false
    }
  }
</script>

<div class="card">
  <div class="card-head">
    <div>
      <h2>{lesson.title}</h2>
      <p class="hint">{lesson.method}</p>
    </div>
    {#if onexit}
      <button class="ghost" onclick={onexit}>← All lessons</button>
    {/if}
  </div>

  <p class="hint">{lesson.description}</p>

  <div class="controls-row">
    {#each lesson.segments as seg, i (seg.label)}
      <button class="seg" class:active={segIndex === i} onclick={() => restartSegment(i)}>
        {seg.label}
      </button>
    {/each}
    <span class="spacer"></span>
    <button class="primary" onclick={demo} disabled={demoPlaying}>
      {demoPlaying ? 'Playing…' : '▶ Demo'}
    </button>
    <button class="primary" onclick={() => restartSegment()}>↺ Restart</button>
    <label class="metro">
      <input type="checkbox" bind:checked={metronomeOn} /> Metronome
      <input type="number" min="40" max="160" bind:value={bpm} disabled={!metronomeOn} /> BPM
    </label>
  </div>

  <MicButton poly={lesson.detectionMode === 'poly'} />

  {#if done}
    <div class="complete">
      🎉 Segment complete — {segment.steps.length} notes,
      {mistakes === 0 ? 'no wrong notes!' : `${mistakes} wrong note${mistakes === 1 ? '' : 's'} along the way.`}
      {#if segIndex < lesson.segments.length - 1}
        <button class="primary" onclick={() => restartSegment(segIndex + 1)}>
          Next: {lesson.segments[segIndex + 1].label} →
        </button>
      {:else}
        <button class="primary" onclick={() => restartSegment(0)}>Practice again</button>
      {/if}
    </div>
  {:else}
    <p class="hint">
      Progress: {progress} / {segment.steps.length} · The orange note is next — green keys show
      where it is and which finger to use.
      {#if mistakes > 0}
        Wrong notes so far: {mistakes}.{/if}
    </p>
  {/if}

  <SheetMusic {score} {highlights} />
  <PianoKeyboard from={kbFrom} to={kbTo} {pressed} {expected} wrong={wrongFlash} fingers={fingerMap} />

  {#if lesson.tips.length}
    <details>
      <summary>Practice tips</summary>
      <ul>
        {#each lesson.tips as tip (tip)}
          <li>{tip}</li>
        {/each}
      </ul>
    </details>
  {/if}
</div>

<style>
  .controls-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .spacer {
    flex: 1;
  }
  .seg {
    padding: 6px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
  }
  .seg.active {
    background: #1d4ed8;
    border-color: #1d4ed8;
    color: #fff;
  }
  .ghost {
    border: none;
    background: none;
    color: #1d4ed8;
    cursor: pointer;
    font-size: 14px;
  }
  .metro {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #475569;
  }
  .metro input[type='number'] {
    width: 60px;
    padding: 4px 6px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
  }
  .complete {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 12px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    font-weight: 600;
    color: #166534;
  }
  details {
    font-size: 14px;
    color: #475569;
  }
  summary {
    cursor: pointer;
    font-weight: 600;
  }
</style>
