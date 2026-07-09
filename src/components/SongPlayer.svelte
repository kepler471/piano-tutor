<script lang="ts">
  import GrandSheetMusic from './GrandSheetMusic.svelte'
  import InputPicker from './InputPicker.svelte'
  import PianoKeyboard from './PianoKeyboard.svelte'
  import { setMetronomeBpm, startMetronome, stopMetronome } from '../lib/audio/metronome'
  import { playSong } from '../lib/audio/playback'
  import { beatsPerMeasure, type Song } from '../lib/data/songs/types'
  import { noteInput, onInput } from '../lib/input/noteInput.svelte'
  import type { HighlightState } from '../lib/notation/vexScore'
  import { addRecord } from '../lib/practice/history.svelte'
  import { StepMatcher } from '../lib/practice/matcher'
  import { songPrefs } from '../lib/practice/songPrefs.svelte'
  import { barsParam, parseBarsParam, stepsFromSong } from '../lib/practice/songSteps'
  import { gradeTiming } from '../lib/practice/timingGrader'
  import { currentParams, navigate } from '../router.svelte'

  let { song, onexit }: { song: Song; onexit?: () => void } = $props()

  const MIN_BPM = 40
  const MAX_BPM = 180

  type Hands = 'both' | 'R' | 'L'
  let hands = $state<Hands>('both')
  let fromMeasure = $state(0)
  // The player is keyed per song, so capturing the initial length is intended.
  // svelte-ignore state_referenced_locally
  let toMeasure = $state(song.measures.length - 1)
  let version = $state(0)
  let resetKey = $state(0)
  let wrongFlash = $state(new Set<number>())
  let demoPlaying = $state(false)
  // Songs are reading material: no keyboard by default, and when shown it only
  // mirrors what was played — never the expected keys or fingers.
  let showKeyboard = $state(false)
  let showFingering = $state(true)
  let metronomeOn = $state(false)
  let loop = $state(false)
  // Practice tempo, persisted per song. svelte-ignore as above: keyed per song.
  // svelte-ignore state_referenced_locally
  let bpm = $state(songPrefs.get(song.id)?.bpm ?? song.tempoBpm)

  // Range and hand sub-state mirrors into the URL (?bars=3-6&hands=R) with
  // replace navigation — restorable on refresh, no history pollution.
  // (Param is `bars`, not `from`/`to`: `from=guide` is the guide breadcrumb.)
  {
    const params = currentParams()
    // svelte-ignore state_referenced_locally
    const linked = parseBarsParam(params.bars, song.measures.length)
    if (linked) {
      fromMeasure = linked.fromMeasure
      toMeasure = linked.toMeasure
    }
    if (params.hands === 'R' || params.hands === 'L') hands = params.hands
  }

  function reflectRoute() {
    const params: Record<string, string> = { song: song.id }
    if (fromMeasure !== 0 || toMeasure !== song.measures.length - 1) {
      params.bars = barsParam(fromMeasure, toMeasure)
    }
    if (hands !== 'both') params.hands = hands
    const from = currentParams().from
    if (from) params.from = from
    navigate('/songs', params, { replace: true })
  }

  function selectSection(from: number, to: number) {
    fromMeasure = from
    toMeasure = to
    resetKey++
    version++
    reflectRoute()
  }

  function setHands(h: Hands) {
    hands = h
    resetKey++
    version++
    reflectRoute()
  }

  function setBpm(value: number) {
    const n = Math.round(Number(value))
    bpm = Number.isFinite(n) && n > 0 ? Math.min(MAX_BPM, Math.max(MIN_BPM, n)) : song.tempoBpm
    songPrefs.setBpm(song.id, bpm)
  }

  const range = $derived({ hands, fromMeasure, toMeasure })
  const steps = $derived(stepsFromSong(song, range))

  const matcher = $derived.by(() => {
    void resetKey
    return new StepMatcher(steps, { lookahead: true })
  })

  // Wall-clock times of each step advance — graded against the beat grid on
  // completion when the metronome is on (same pattern as LessonPlayer).
  let advanceTimes: number[] = []
  let timingPct = $state<number | null>(null)
  $effect(() => {
    void matcher
    advanceTimes = []
    timingPct = null
  })

  // Metronome with a one-bar count-in; restarted on every attempt so each
  // run gets its own count-in. It deliberately does NOT gate the mic
  // (playback.isPlaying stays false) — grading listens while it ticks.
  $effect(() => {
    void resetKey
    if (metronomeOn) {
      void startMetronome(bpm, { countInBeats: song.timeSignature[0] })
      return () => stopMetronome()
    }
  })
  $effect(() => {
    if (metronomeOn) setMetronomeBpm(bpm)
  })

  $effect(() => {
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

  // Loop-the-section drilling: auto-restart shortly after completion.
  $effect(() => {
    if (loop && done && steps.length > 0) {
      const t = setTimeout(() => {
        resetKey++
        version++
      }, 1200)
      return () => clearTimeout(t)
    }
  })

  let loggedDone = false
  $effect(() => {
    if (done && steps.length > 0 && !loggedDone) {
      loggedDone = true
      // Rhythm read-through grade, relative to the run's own first note.
      // Suppressed on mic-poly input: its 0.5–1.5 s detection latency makes
      // millisecond grading meaningless. A lookahead-skip advances the cursor
      // twice on one onset, so the length check fails and the run simply
      // isn't timing-graded.
      if (
        metronomeOn &&
        noteInput.activeSource !== 'mic-poly' &&
        steps.length > 1 &&
        steps.every((s) => s.startBeat !== undefined) &&
        advanceTimes.length === steps.length
      ) {
        const beatMs = 60000 / bpm
        const anchor = advanceTimes[0] - steps[0].startBeat! * beatMs
        const result = gradeTiming(
          steps.map((s) => ({ startBeat: s.startBeat! })),
          advanceTimes.map((tMs) => ({ tMs })),
          bpm,
          anchor,
          song.swing ? { swingRatio: 2 / 3 } : {},
        )
        timingPct = Math.round(result.accuracy * 100)
      }
      addRecord({
        lessonId: `song-${song.id}`,
        title: song.title,
        segment: `bars ${fromMeasure + 1}–${toMeasure + 1}${hands === 'both' ? '' : hands === 'R' ? ' (RH)' : ' (LH)'}`,
        mistakes: matcher.mistakes,
        steps: steps.length,
        kind: 'song',
      })
    } else if (!done) {
      loggedDone = false
    }
  })

  const allMidis = $derived(steps.flatMap((s) => s.midis))
  const kbFrom = $derived(allMidis.length ? Math.floor((Math.min(...allMidis) - 2) / 12) * 12 : 48)
  const kbTo = $derived(allMidis.length ? Math.ceil((Math.max(...allMidis) + 2) / 12) * 12 : 84)

  async function demo() {
    if (demoPlaying) return
    demoPlaying = true
    try {
      const bpm = beatsPerMeasure(song)
      const notes = []
      for (let m = fromMeasure; m <= toMeasure; m++) {
        for (const n of song.measures[m].notes) {
          if (hands !== 'both' && n.hand !== hands) continue
          notes.push({ midi: n.midi, startBeat: (m - fromMeasure) * bpm + n.startBeat, durationBeats: n.durationBeats })
        }
      }
      await playSong(notes, bpm, song.swing)
    } finally {
      demoPlaying = false
    }
  }

  const needsChords = $derived(steps.some((s) => s.midis.length > 1))

  // Next-step suggestions for the completion card: the following section
  // (when practising by section), then hands-together (when on one hand).
  const nextSection = $derived.by(() => {
    const idx = song.sections.findIndex((s) => s.fromMeasure === fromMeasure && s.toMeasure === toMeasure)
    return idx !== -1 ? song.sections[idx + 1] : undefined
  })
</script>

<div class="card">
  <div class="card-head">
    <div>
      <h2>{song.title}</h2>
      <p class="hint">
        {song.composer} · Grade {song.grade} · {song.timeSignature[0]}/{song.timeSignature[1]} · ♩=
        {song.tempoBpm}{song.swing ? ' · swing' : ''}
      </p>
    </div>
    {#if onexit}
      <button class="ghost" onclick={onexit}>← All songs</button>
    {/if}
  </div>

  <div class="controls-row">
    <span class="control-label">Section:</span>
    <button
      class="seg"
      class:active={fromMeasure === 0 && toMeasure === song.measures.length - 1}
      onclick={() => selectSection(0, song.measures.length - 1)}
    >
      Whole piece
    </button>
    {#each song.sections as s (s.label)}
      <button
        class="seg"
        class:active={fromMeasure === s.fromMeasure && toMeasure === s.toMeasure}
        onclick={() => selectSection(s.fromMeasure, s.toMeasure)}
      >
        {s.label}
      </button>
    {/each}
    <label class="bars">
      Bars
      <input
        type="number"
        min="1"
        max={toMeasure + 1}
        value={fromMeasure + 1}
        onchange={(e) => {
          const v = Math.round(Number(e.currentTarget.value))
          const from = Number.isFinite(v) ? Math.min(Math.max(v, 1), toMeasure + 1) : 1
          e.currentTarget.value = String(from)
          selectSection(from - 1, toMeasure)
        }}
      />
      –
      <input
        type="number"
        min={fromMeasure + 1}
        max={song.measures.length}
        value={toMeasure + 1}
        onchange={(e) => {
          const v = Math.round(Number(e.currentTarget.value))
          const to = Number.isFinite(v) ? Math.min(Math.max(v, fromMeasure + 1), song.measures.length) : song.measures.length
          e.currentTarget.value = String(to)
          selectSection(fromMeasure, to - 1)
        }}
      />
    </label>
    <label class="opt">
      <input type="checkbox" bind:checked={loop} /> Loop
    </label>
  </div>

  <div class="controls-row">
    <span class="control-label">Tempo:</span>
    <input
      class="tempo-slider"
      type="range"
      min={MIN_BPM}
      max={MAX_BPM}
      value={bpm}
      oninput={(e) => setBpm(Number(e.currentTarget.value))}
    />
    <input
      class="tempo-num"
      type="number"
      min={MIN_BPM}
      max={MAX_BPM}
      value={bpm}
      onchange={(e) => {
        setBpm(Number(e.currentTarget.value))
        e.currentTarget.value = String(bpm)
      }}
    />
    <span class="hint-inline">BPM{bpm !== song.tempoBpm ? ` (score: ♩=${song.tempoBpm})` : ''}</span>
    <label class="opt">
      <input type="checkbox" bind:checked={metronomeOn} />
      Metronome ({song.timeSignature[0]}-beat count-in, grades your timing)
    </label>
  </div>

  <div class="controls-row">
    <span class="control-label">Hands:</span>
    {#each [['both', 'Both'], ['R', 'Right'], ['L', 'Left']] as const as [value, label] (value)}
      <button class="seg" class:active={hands === value} onclick={() => setHands(value)}>
        {label}
      </button>
    {/each}
    <span class="spacer"></span>
    <button class="primary" onclick={demo} disabled={demoPlaying}>
      {demoPlaying ? 'Playing…' : '▶ Demo'}
    </button>
    <button
      class="primary"
      onclick={() => {
        resetKey++
        version++
      }}
    >
      ↺ Restart
    </button>
  </div>

  <InputPicker preferred={needsChords ? 'poly' : 'mono'} />
  {#if needsChords && noteInput.activeSource !== 'midi'}
    <p class="hint">
      🎹 This piece has chords or both hands — it works best with a MIDI keyboard. Mic chord
      detection runs about a second behind.
    </p>
  {/if}

  {#if done && steps.length > 0}
    <div class="complete">
      🎉 Passage complete — {steps.length} steps,
      {mistakes === 0 ? 'no wrong notes!' : `${mistakes} wrong note${mistakes === 1 ? '' : 's'} along the way.`}
      {#if timingPct !== null}
        <span class="timing">Timing: {timingPct}% in the pocket at ♩={bpm}.</span>
      {/if}
      {#if loop}
        <span class="timing">Looping — starting again…</span>
      {/if}
      <button
        class="primary"
        onclick={() => {
          resetKey++
          version++
        }}
      >
        Play it again
      </button>
      {#if nextSection}
        <button class="primary" onclick={() => selectSection(nextSection.fromMeasure, nextSection.toMeasure)}>
          Next: {nextSection.label} →
        </button>
      {/if}
      {#if hands !== 'both'}
        <button
          class="primary"
          onclick={() => {
            hands = 'both'
            resetKey++
            version++
          }}
        >
          Try hands together
        </button>
      {/if}
      {#if onexit}
        <button class="ghost" onclick={onexit}>← All songs</button>
      {/if}
    </div>
  {:else}
    <p class="hint">
      Wait-mode: the orange note is next; the score waits until you play it. Progress: {progress} /
      {steps.length}.
      {#if mistakes > 0}Wrong notes so far: {mistakes}.{/if}
    </p>
  {/if}

  <GrandSheetMusic {song} {range} stepHighlights={highlights} {showFingering} />
  <label class="show-kb">
    <input type="checkbox" bind:checked={showKeyboard} /> Show keyboard (played notes only — no hints)
  </label>
  <label class="show-kb">
    <input type="checkbox" bind:checked={showFingering} /> Show fingering
  </label>
  {#if showKeyboard}
    <PianoKeyboard from={kbFrom} to={kbTo} pressed={noteInput.activeNotes} wrong={wrongFlash} />
  {/if}
</div>

<style>
  .controls-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .control-label {
    font-size: 13px;
    color: #475569;
    font-weight: 600;
  }
  .spacer {
    flex: 1;
  }
  .bars,
  .opt {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #475569;
  }
  .bars input {
    width: 52px;
    padding: 4px 6px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
  }
  .tempo-slider {
    width: 140px;
  }
  .tempo-num {
    width: 60px;
    padding: 4px 6px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
  }
  .hint-inline {
    font-size: 13px;
    color: #64748b;
  }
  .timing {
    display: block;
    font-size: 13px;
    color: #475569;
  }
  .show-kb {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #475569;
  }
</style>
