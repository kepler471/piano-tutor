<script lang="ts">
  import GrandSheetMusic from './GrandSheetMusic.svelte'
  import InputPicker from './InputPicker.svelte'
  import PianoKeyboard from './PianoKeyboard.svelte'
  import { playSong } from '../lib/audio/playback'
  import { beatsPerMeasure, type Song } from '../lib/data/songs/types'
  import { noteInput, onInput } from '../lib/input/noteInput.svelte'
  import { midiToNameInKey, type HighlightState } from '../lib/notation/vexScore'
  import { addRecord } from '../lib/practice/history.svelte'
  import { StepMatcher } from '../lib/practice/matcher'
  import { stepsFromSong } from '../lib/practice/songSteps'

  let { song, onexit }: { song: Song; onexit?: () => void } = $props()

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

  function selectSection(from: number, to: number) {
    fromMeasure = from
    toMeasure = to
    resetKey++
    version++
  }

  const range = $derived({ hands, fromMeasure, toMeasure })
  const steps = $derived(stepsFromSong(song, range))

  const matcher = $derived.by(() => {
    void resetKey
    return new StepMatcher(steps, { lookahead: 2 })
  })

  // Wrong-note flash lasts one beat, clamped so it stays visible but snappy.
  const flashMs = $derived(Math.max(200, Math.min(600, 60000 / song.tempoBpm)))

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
        }, flashMs)
      }
    })
  })

  const highlights = $derived.by(() => {
    void version
    const map = new Map<number, HighlightState>()
    matcher.results.forEach((r, i) => {
      if (r === 'correct') map.set(i, 'correct')
      else if (r === 'corrected') map.set(i, 'played')
      else if (r === 'skipped') map.set(i, 'missed')
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
  const skips = $derived.by(() => {
    void version
    return matcher.skips
  })
  const missedNames = $derived.by(() => {
    void version
    return [...new Set(matcher.skippedMidis.map((m) => midiToNameInKey(m, song.keySignature)))]
  })
  const missedLabel = $derived(
    missedNames.length > 8 ? `${missedNames.slice(0, 8).join(', ')}…` : missedNames.join(', '),
  )
  const progress = $derived.by(() => {
    void version
    return matcher.cursor
  })

  let loggedDone = false
  $effect(() => {
    if (done && steps.length > 0 && !loggedDone) {
      loggedDone = true
      addRecord({
        lessonId: `song-${song.id}`,
        title: song.title,
        segment: `bars ${fromMeasure + 1}–${toMeasure + 1}${hands === 'both' ? '' : hands === 'R' ? ' (RH)' : ' (LH)'}`,
        mistakes: matcher.mistakes,
        steps: steps.length,
        skips: matcher.skips,
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
          notes.push({ midi: n.midi, startBeat: (m - fromMeasure) * bpm + n.startBeat, durationBeats: n.durationBeats, hand: n.hand })
        }
      }
      await playSong(notes, song.tempoBpm, song.swing)
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
  </div>

  <div class="controls-row">
    <span class="control-label">Hands:</span>
    {#each [['both', 'Both'], ['R', 'Right'], ['L', 'Left']] as const as [value, label] (value)}
      <button
        class="seg"
        class:active={hands === value}
        onclick={() => {
          hands = value
          resetKey++
          version++
        }}
      >
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
      {#if skips > 0}
        {skips} note{skips === 1 ? '' : 's'} slipped by — missed: {missedLabel} (shown in gray on the score).
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
      {#if skips > 0}Missed so far: {skips}.{/if}
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
  .show-kb {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #475569;
  }
</style>
