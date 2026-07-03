<script lang="ts">
  import EchoPlayer from '../components/EchoPlayer.svelte'
  import QuizCard from '../components/QuizCard.svelte'
  import { playChord, playSequence } from '../lib/audio/playback'
  import {
    CHORD_LEVELS,
    ECHO_LEVELS,
    INTERVAL_LEVELS,
    makeChordQuestion,
    makeEchoQuestion,
    makeIntervalQuestion,
    type ChordQuestion,
    type EchoQuestion,
    type IntervalQuestion,
  } from '../lib/ear/quiz'
  import { addRecord } from '../lib/practice/history.svelte'
  import { registerVoiceCommands } from '../lib/voice/voice.svelte'

  type Mode = 'intervals' | 'chords' | 'echo'
  type Question = IntervalQuestion | ChordQuestion | EchoQuestion

  const MODES: { id: Mode; label: string; desc: string }[] = [
    { id: 'intervals', label: 'Intervals', desc: 'Two notes sound — name the distance between them.' },
    { id: 'chords', label: 'Chord qualities', desc: 'A chord sounds — is it major, minor, or something else?' },
    { id: 'echo', label: 'Play it back', desc: 'Listen to a short phrase, then play it back from memory.' },
  ]

  let mode = $state<Mode>('intervals')
  let level = $state(1)

  const maxLevel = $derived(
    mode === 'intervals' ? INTERVAL_LEVELS.length : mode === 'chords' ? CHORD_LEVELS.length : ECHO_LEVELS.length,
  )
  const roundSize = $derived(mode === 'echo' ? 5 : 10)

  let question = $state<Question | null>(null)
  let selected = $state<string | null>(null)
  let echoResult = $state<number | null>(null) // mistakes on the completed phrase
  let playing = $state(false)
  let heard = $state(false)

  let answered = $state(0)
  let correct = $state(0)
  const roundDone = $derived(answered >= roundSize)

  function makeQuestion(): Question {
    if (mode === 'intervals') return makeIntervalQuestion(level)
    if (mode === 'chords') return makeChordQuestion(level)
    return makeEchoQuestion(level)
  }

  function resetRound() {
    answered = 0
    correct = 0
    question = makeQuestion()
    selected = null
    echoResult = null
    heard = false
  }

  function setMode(m: Mode) {
    mode = m
    level = 1
    resetRound()
  }

  function setLevel(l: number) {
    level = l
    resetRound()
  }

  async function play() {
    if (!question || playing) return
    playing = true
    heard = true
    try {
      if (question.kind === 'chord') await playChord(question.midis, { duration: 1.8 })
      else await playSequence(question.midis, question.kind === 'interval' ? 40 : 60)
    } finally {
      playing = false
    }
  }

  function choose(opt: string) {
    if (!question || question.kind === 'echo' || selected !== null) return
    selected = opt
    answered++
    if (opt === question.answer) correct++
    maybeRecord()
  }

  function onEchoComplete(mistakes: number) {
    if (echoResult !== null) return
    echoResult = mistakes
    answered++
    if (mistakes === 0) correct++
    maybeRecord()
  }

  function maybeRecord() {
    if (answered < roundSize) return
    const modeLabel = MODES.find((m) => m.id === mode)!.label
    addRecord({
      lessonId: `ear-${mode}`,
      title: `Ear training: ${modeLabel}`,
      segment: `Level ${level}`,
      mistakes: answered - correct,
      steps: answered,
      kind: 'ear',
      score: { correct, total: answered },
    })
  }

  function next() {
    question = makeQuestion()
    selected = null
    echoResult = null
    heard = false
    void play()
  }

  // Initial question (no autoplay — audio needs a user gesture).
  resetRound()

  $effect(() =>
    registerVoiceCommands({
      name: 'Ear training',
      phrases: ['hear it again', 'next'],
      handle(intent) {
        if (intent.kind === 'play-demo') {
          void play()
          return { say: '' }
        }
        if (intent.kind === 'lesson' && intent.action === 'next') {
          if (!roundDone && (selected !== null || echoResult !== null)) next()
          return { say: '' }
        }
        return null
      },
    }),
  )
</script>

<section>
  <h1>Ear Training</h1>
  <p class="hint">Train your ear a few minutes a day — it makes everything else easier.</p>

  <div class="mode-row">
    {#each MODES as m (m.id)}
      <button class="seg" class:active={mode === m.id} onclick={() => setMode(m.id)}>{m.label}</button>
    {/each}
    <span class="spacer"></span>
    <label class="level">
      Level
      {#each Array.from({ length: maxLevel }, (_, i) => i + 1) as l (l)}
        <button class="seg small" class:active={level === l} onclick={() => setLevel(l)}>{l}</button>
      {/each}
    </label>
  </div>

  <div class="card">
    <p class="hint">{MODES.find((m) => m.id === mode)!.desc}</p>
    <p class="score">
      Question {Math.min(answered + 1, roundSize)} / {roundSize} · {correct} correct
    </p>

    {#if roundDone}
      <div class="complete">
        🎉 Round complete — {correct} / {answered} correct.
        <button class="primary" onclick={resetRound}>New round</button>
        {#if correct === answered && level < maxLevel}
          <button class="primary" onclick={() => setLevel(level + 1)}>Level up →</button>
        {/if}
      </div>
    {:else if question}
      {#if question.kind === 'echo'}
        <button class="primary" onclick={play} disabled={playing}>
          {playing ? 'Playing…' : heard ? '🔊 Hear it again' : '🔊 Hear the phrase'}
        </button>
        <p class="hint">{question.midis.length} notes, starting on the first note you hear ({question.positionLabel}).</p>
        {#if heard}
          <EchoPlayer midis={question.midis} oncomplete={onEchoComplete} />
        {/if}
        {#if echoResult !== null}
          <div class="complete">
            {echoResult === 0 ? '✨ Perfect echo!' : `Got there with ${echoResult} wrong note${echoResult === 1 ? '' : 's'}.`}
            <button class="primary" onclick={next}>Next phrase →</button>
          </div>
        {/if}
      {:else}
        {#if !heard}
          <button class="primary" onclick={play} disabled={playing}>🔊 Hear it</button>
        {:else}
          <QuizCard
            options={question.options}
            answer={question.answer}
            {selected}
            {playing}
            onselect={choose}
            onreplay={play}
          />
        {/if}
        {#if selected !== null}
          <button class="primary next" onclick={next}>Next →</button>
        {/if}
      {/if}
    {/if}
  </div>
</section>

<style>
  .mode-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin: 16px 0;
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
  .seg.small {
    padding: 4px 10px;
  }
  .seg.active {
    background: #1d4ed8;
    border-color: #1d4ed8;
    color: #fff;
  }
  .level {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #475569;
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .score {
    margin: 0;
    font-size: 13px;
    color: #64748b;
    font-weight: 600;
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
  .next {
    align-self: flex-start;
  }
  button.primary {
    align-self: flex-start;
  }
</style>
