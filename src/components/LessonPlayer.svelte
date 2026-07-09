<script lang="ts">
  import GlossText from './GlossText.svelte'
  import InputPicker from './InputPicker.svelte'
  import PianoKeyboard from './PianoKeyboard.svelte'
  import SheetMusic from './SheetMusic.svelte'
  import { setMetronomeBpm, startMetronome, stopMetronome } from '../lib/audio/metronome'
  import { playChord, playChordSequence, playSequence } from '../lib/audio/playback'
  import { noteInput, onInput } from '../lib/input/noteInput.svelte'
  import { expectedMicSource } from '../lib/input/routing'
  import { settings } from '../lib/settings.svelte'
  import type { Lesson } from '../lib/data/lessons'
  import { scoreFromSteps, type HighlightState } from '../lib/notation/vexScore'
  import { addRecord } from '../lib/practice/history.svelte'
  import { StepMatcher } from '../lib/practice/matcher'
  import { gradeTiming } from '../lib/practice/timingGrader'
  import type { Finger } from '../lib/theory/types'
  import { SCOPE_PHRASES } from '../lib/voice/phrases'
  import { registerVoiceCommands } from '../lib/voice/voice.svelte'

  let {
    lesson,
    onexit,
    oncomplete,
    nextLesson,
  }: {
    lesson: Lesson
    onexit?: () => void
    oncomplete?: (info: { mistakes: number }) => void
    /** Offered after the final segment: the natural next lesson to open. */
    nextLesson?: { title: string; onopen: () => void }
  } = $props()

  let segIndex = $state(0)
  const segment = $derived(lesson.segments[segIndex])
  // Reading-focused lessons hide the keyboard (and its expected-key/finger
  // hints) so the score can't be shortcut by watching for the lit key.
  const reading = $derived(lesson.hints === 'reading')
  let showKeyboard = $state(false)
  // Hands-together segments override to chord detection when on the mic.
  const effectiveMode = $derived(segment.detectionMode ?? lesson.detectionMode)

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
    return new StepMatcher(lesson.segments[segIndex].steps, { lookahead: true })
  })

  // Wall-clock times of each step advance — graded against the beat grid
  // when the metronome is on and the material carries startBeats.
  let advanceTimes: number[] = []
  let timingPct = $state<number | null>(null)
  $effect(() => {
    void matcher
    advanceTimes = []
    timingPct = null
  })

  function restartSegment(index = segIndex) {
    segIndex = index
    resetKey++
    version++
  }

  $effect(() => {
    // Grading hears the hub's active source: MIDI when a keyboard is
    // connected, otherwise the lesson's designated mic detector.
    return onInput((ev) => {
      if (ev.kind !== 'on' || matcher.done) return
      const outcome = matcher.onOnset(ev.midi)
      version++
      if (outcome.advanced) advanceTimes.push(ev.tMs ?? performance.now())
      if (outcome.wrong) {
        const flashed = ev.midi
        wrongFlash = new Set([...wrongFlash, flashed])
        setTimeout(() => {
          wrongFlash = new Set([...wrongFlash].filter((m) => m !== flashed))
        }, 350)
      }
    })
  })

  // If the segment's detection needs change while listening on the mic
  // (e.g. moving to a hands-together segment), restart with the right detector.
  $effect(() => {
    const mode = effectiveMode
    const activeSource = noteInput.activeSource
    const isMic = activeSource !== 'midi' && activeSource !== 'none'
    if (isMic && activeSource !== expectedMicSource(mode, settings.fusion)) {
      noteInput.stop()
      void noteInput.start(mode)
    }
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
      else if (r === 'corrected' || r === 'skipped') map.set(i, 'played')
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

  // Keyboard shows everything the active input hears; grading uses only the
  // hub-forwarded events.
  const pressed = $derived(noteInput.activeNotes)
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
      // Rhythm read-through grade, relative to the player's own first note.
      // A lookahead-skipped step advances the cursor twice on one onset, so
      // the length check fails and the run simply isn't timing-graded.
      const steps = segment.steps
      if (metronomeOn && steps.length > 1 && steps.every((s) => s.startBeat !== undefined) && advanceTimes.length === steps.length) {
        const beatMs = 60000 / bpm
        const anchor = advanceTimes[0] - steps[0].startBeat! * beatMs
        const result = gradeTiming(
          steps.map((s) => ({ startBeat: s.startBeat! })),
          advanceTimes.map((tMs) => ({ tMs })),
          bpm,
          anchor,
        )
        timingPct = Math.round(result.accuracy * 100)
      }
      addRecord({
        lessonId: lesson.id,
        title: lesson.title,
        segment: segment.label,
        mistakes: matcher.mistakes,
        steps: segment.steps.length,
      })
      oncomplete?.({ mistakes: matcher.mistakes })
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
      if (segment.hand === 'both') {
        // Parallel-motion lines: play the pairs in tempo, not as slow chords.
        await playChordSequence(segment.steps.map((s) => s.midis), bpm)
      } else if (chordal) {
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

  const clampBpm = (n: number) => Math.max(40, Math.min(160, n))

  $effect(() =>
    registerVoiceCommands({
      name: 'Lesson',
      phrases: SCOPE_PHRASES['Lesson'],
      handle(intent) {
        switch (intent.kind) {
          case 'play-demo':
            void demo()
            return { say: '' }
          case 'lesson':
            if (intent.action === 'restart') {
              restartSegment()
              return { say: 'From the top.' }
            }
            if (intent.action === 'next') {
              if (segIndex >= lesson.segments.length - 1) return { say: 'This is the last part.' }
              restartSegment(segIndex + 1)
              return { say: lesson.segments[segIndex].label }
            }
            if (intent.action === 'previous') {
              if (segIndex === 0) return { say: 'Already at the first part.' }
              restartSegment(segIndex - 1)
              return { say: lesson.segments[segIndex].label }
            }
            return null // exit / new-melody belong to the Practice screen beneath
          case 'metronome':
            if (intent.action === 'stop') {
              metronomeOn = false
              return { say: '' }
            }
            if (intent.bpm !== undefined) bpm = clampBpm(intent.bpm)
            metronomeOn = true
            return { say: '' }
          case 'set-bpm': {
            const next = intent.bpm !== undefined ? intent.bpm : bpm + (intent.delta ?? 0)
            bpm = clampBpm(next)
            return { say: `${bpm}.` }
          }
          case 'mic':
            if (intent.action === 'start') {
              void noteInput.start(effectiveMode)
              return { say: 'Listening.' }
            }
            noteInput.stop()
            return { say: 'Stopped.' }
          default:
            return null
        }
      },
    }),
  )
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

  <p class="hint"><GlossText text={lesson.description} /></p>

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

  <InputPicker preferred={effectiveMode} />
  {#if effectiveMode === 'poly' && noteInput.activeSource !== 'midi' && segment.hand === 'both'}
    <p class="hint">
      🎹 Hands-together grading works best with a MIDI keyboard —
      {noteInput.activeSource === 'mic-fused'
        ? 'the mic grades the top line instantly, but the remaining chord notes land about a second behind.'
        : 'mic chord detection runs about a second behind your playing.'}
    </p>
  {/if}

  {#if done}
    <div class="complete">
      🎉 Segment complete — {segment.steps.length} notes,
      {mistakes === 0 ? 'no wrong notes!' : `${mistakes} wrong note${mistakes === 1 ? '' : 's'} along the way.`}
      {#if timingPct !== null}
        Timing: {timingPct}% in the pocket.
      {/if}
      {#if segIndex < lesson.segments.length - 1}
        <button class="primary" onclick={() => restartSegment(segIndex + 1)}>
          Next: {lesson.segments[segIndex + 1].label} →
        </button>
      {:else}
        <button class="primary" onclick={() => restartSegment(0)}>Practice again</button>
        {#if nextLesson}
          <button class="primary" onclick={nextLesson.onopen}>Next: {nextLesson.title} →</button>
        {/if}
        {#if onexit}
          <button class="ghost" onclick={onexit}>← All lessons</button>
        {/if}
      {/if}
    </div>
  {:else}
    <p class="hint">
      Progress: {progress} / {segment.steps.length} ·
      {#if reading}
        The orange note is next — read it off the staff; eyes on the score, not your hands.
      {:else}
        The orange note is next — green keys show where it is and which finger to use.
      {/if}
      {#if mistakes > 0}
        Wrong notes so far: {mistakes}.{/if}
    </p>
  {/if}

  <SheetMusic {score} {highlights} />
  {#if reading}
    <label class="metro">
      <input type="checkbox" bind:checked={showKeyboard} /> Show keyboard (played notes only — no hints)
    </label>
    {#if showKeyboard}
      <PianoKeyboard from={kbFrom} to={kbTo} {pressed} wrong={wrongFlash} />
    {/if}
  {:else}
    <PianoKeyboard from={kbFrom} to={kbTo} {pressed} {expected} wrong={wrongFlash} fingers={fingerMap} />
  {/if}

  {#if lesson.tips.length}
    <details open>
      <summary>Practice tips</summary>
      <ul>
        {#each lesson.tips as tip (tip)}
          <li><GlossText text={tip} /></li>
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
  details {
    font-size: 14px;
    color: #475569;
  }
  summary {
    cursor: pointer;
    font-weight: 600;
  }
</style>
