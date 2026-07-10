<script lang="ts">
  import BackToGuide from '../components/BackToGuide.svelte'
  import EchoPlayer from '../components/EchoPlayer.svelte'
  import GlossText from '../components/GlossText.svelte'
  import MelodyReadCard from '../components/MelodyReadCard.svelte'
  import QuizCard from '../components/QuizCard.svelte'
  import RhythmQuizCard from '../components/RhythmQuizCard.svelte'
  import SheetMusic from '../components/SheetMusic.svelte'
  import SightReadPlayer from '../components/SightReadPlayer.svelte'
  import { playChord, playChordSequence, playSequence, playSong } from '../lib/audio/playback'
  import {
    makeCadenceQuestion,
    makeChordQuestion,
    makeEchoQuestion,
    makeIntervalQuestion,
    makeScaleTypeQuestion,
    type CadenceQuestion,
    type ChordQuestion,
    type EchoQuestion,
    type IntervalQuestion,
    type ScaleTypeQuestion,
  } from '../lib/ear/quiz'
  import {
    makeChordFunctionQuestion,
    makeChordSpellingQuestion,
    makeCircleQuestion,
    makeIntervalStaffQuestion,
    makeKeySignatureQuestion,
    makeNoteNamingQuestion,
    makeReadMelodyQuestion,
    type ChordFunctionQuestion,
    type ChordSpellingQuestion,
    type CircleQuestion,
    type IntervalStaffQuestion,
    type KeySignatureQuestion,
    type NoteNamingQuestion,
    type ReadMelodyQuestion,
  } from '../lib/theory/quiz'
  import { makeRhythmDictationQuestion, type RhythmDictationQuestion } from '../lib/quiz/rhythmQuiz'
  import { makeSightReadQuestion, type SightReadQuestion } from '../lib/quiz/sightReadQuiz'
  import { QUIZ_LEVEL_COUNTS, type QuizModeId } from '../lib/quiz/modes'
  import { midiToVexKey, type ScoreModel } from '../lib/notation/vexScore'
  import { addRecord } from '../lib/practice/history.svelte'
  import { getProgress, recordRun, setLevel as setStoredLevel, STREAK_TO_LEVEL_UP } from '../lib/practice/progress.svelte'
  import { SCOPE_PHRASES } from '../lib/voice/phrases'
  import { registerVoiceCommands } from '../lib/voice/voice.svelte'
  import { currentParams, navigate } from '../router.svelte'

  type Question =
    | IntervalQuestion
    | ChordQuestion
    | EchoQuestion
    | ScaleTypeQuestion
    | CadenceQuestion
    | NoteNamingQuestion
    | KeySignatureQuestion
    | CircleQuestion
    | IntervalStaffQuestion
    | ChordSpellingQuestion
    | ChordFunctionQuestion
    | RhythmDictationQuestion
    | ReadMelodyQuestion
    | SightReadQuestion

  interface ModeDef {
    id: QuizModeId
    label: string
    desc: string
    /** Audio modes gate the options behind a "Hear it" button. */
    audio: boolean
  }

  const MODE_GROUPS: { label: string; modes: ModeDef[] }[] = [
    {
      label: 'By ear',
      modes: [
        { id: 'intervals', label: 'Intervals', desc: 'Two notes sound — name the distance between them.', audio: true },
        { id: 'chords', label: 'Chord qualities', desc: 'A chord sounds — is it major, minor, or something else?', audio: true },
        { id: 'scale-type', label: 'Scale types', desc: 'A scale runs up — major, minor, blues, or a mode?', audio: true },
        { id: 'cadence', label: 'Cadences', desc: 'A short progression plays — how does it end?', audio: true },
        { id: 'echo', label: 'Play it back', desc: 'Listen to a short phrase, then play it back from memory.', audio: true },
        { id: 'rhythm-dictation', label: 'Rhythm dictation', desc: 'Hear a rhythm tapped out — pick the notation that matches.', audio: true },
      ],
    },
    {
      label: 'Reading & theory',
      modes: [
        { id: 'note-naming', label: 'Name the note', desc: 'A note on the staff — what is it called?', audio: false },
        { id: 'read-melody', label: 'Read a melody', desc: 'A short phrase on the staff — name the notes left to right.', audio: false },
        { id: 'sight-read', label: 'Play what you read', desc: 'A short phrase on the staff — play it on your piano and the mic checks each note.', audio: false },
        { id: 'key-signature', label: 'Key signatures', desc: 'Read the sharps and flats — which key are you in?', audio: false },
        { id: 'circle-of-fifths', label: 'Circle of fifths', desc: 'Fifths, key signatures and relative minors — navigate the clock of keys.', audio: false },
        { id: 'interval-staff', label: 'Intervals on the staff', desc: 'Two written notes — name the interval by sight.', audio: false },
        { id: 'chord-spelling', label: 'Spell the chord', desc: 'A chord symbol — pick the notes that build it.', audio: false },
        { id: 'chord-function', label: 'Chord functions', desc: 'Which chord is V in G major? Harmony as the Romans wrote it.', audio: false },
      ],
    },
  ]

  const ALL_MODES = MODE_GROUPS.flatMap((g) => g.modes)

  let mode = $state<QuizModeId>('intervals')
  let level = $state(1)

  /** Persisted level for a mode, capped to its level count. */
  function storedLevel(m: QuizModeId): number {
    return Math.min(getProgress(`quiz-${m}`).level, QUIZ_LEVEL_COUNTS[m])
  }

  // Mode and level are mirrored in the URL (?mode=&level=) with replace
  // navigation: refresh and back-into-the-screen restore them, but toggling
  // modes never stacks history entries. The $effect below also applies
  // guide deep links and back/forward param changes. A URL without a valid
  // level falls back to the mode's persisted level.
  const routeParams = $derived(currentParams())

  function fromParams(params: Readonly<Record<string, string>>): { mode: QuizModeId; level: number } | null {
    if (!ALL_MODES.some((m) => m.id === params.mode)) return null
    const linkedMode = params.mode as QuizModeId
    const linkedLevel = Number(params.level)
    const validLevel =
      Number.isInteger(linkedLevel) && linkedLevel >= 1 && linkedLevel <= QUIZ_LEVEL_COUNTS[linkedMode]
    return { mode: linkedMode, level: validLevel ? linkedLevel : storedLevel(linkedMode) }
  }

  // Initial deep link, applied before the first render.
  const initial = fromParams(currentParams())
  if (initial) {
    mode = initial.mode
    level = initial.level
  } else {
    // Default mode — resume its persisted level. (Literal id: referencing
    // `mode` here would only capture its initial value anyway.)
    level = storedLevel('intervals')
  }

  function reflectRoute() {
    const params: Record<string, string> = { mode, level: String(level) }
    if (routeParams.from) params.from = routeParams.from
    navigate('/quizzes', params, { replace: true })
  }

  $effect(() => {
    const linked = fromParams(routeParams)
    if (linked && (linked.mode !== mode || linked.level !== level)) {
      mode = linked.mode
      level = linked.level
      resetRound()
    }
  })

  const modeDef = $derived(ALL_MODES.find((m) => m.id === mode)!)
  const maxLevel = $derived(QUIZ_LEVEL_COUNTS[mode])
  const roundSize = $derived(mode === 'echo' || mode === 'read-melody' || mode === 'sight-read' ? 5 : 10)

  let question = $state<Question | null>(null)
  let selected = $state<string | null>(null)
  let echoResult = $state<number | null>(null) // mistakes on the completed echo phrase
  let phraseResult = $state<number | null>(null) // mistakes on a completed read/play phrase
  let playing = $state(false)
  let heard = $state(false)

  let answered = $state(0)
  let correct = $state(0)
  const roundDone = $derived(answered >= roundSize)

  function makeQuestion(): Question {
    switch (mode) {
      case 'intervals': return makeIntervalQuestion(level)
      case 'chords': return makeChordQuestion(level)
      case 'echo': return makeEchoQuestion(level)
      case 'scale-type': return makeScaleTypeQuestion(level)
      case 'cadence': return makeCadenceQuestion(level)
      case 'rhythm-dictation': return makeRhythmDictationQuestion(level)
      case 'note-naming': return makeNoteNamingQuestion(level)
      case 'read-melody': return makeReadMelodyQuestion(level)
      case 'sight-read': return makeSightReadQuestion(level)
      case 'key-signature': return makeKeySignatureQuestion(level)
      case 'circle-of-fifths': return makeCircleQuestion(level)
      case 'interval-staff': return makeIntervalStaffQuestion(level)
      case 'chord-spelling': return makeChordSpellingQuestion(level)
      case 'chord-function': return makeChordFunctionQuestion(level)
    }
  }

  function resetRound() {
    answered = 0
    correct = 0
    question = makeQuestion()
    selected = null
    echoResult = null
    phraseResult = null
    heard = false
    roundFeedback = null
    autoLeveled = false
  }

  function setMode(m: QuizModeId) {
    mode = m
    level = storedLevel(m)
    resetRound()
    reflectRoute()
  }

  function setLevel(l: number) {
    level = l
    setStoredLevel(`quiz-${mode}`, l)
    resetRound()
    reflectRoute()
  }

  async function play() {
    if (!question || playing) return
    playing = true
    heard = true
    try {
      switch (question.kind) {
        case 'chord':
          await playChord(question.midis, { duration: 1.8 })
          break
        case 'interval':
          if (question.harmonic) await playChord(question.midis, { duration: 1.8 })
          else await playSequence(question.midis, 40)
          break
        case 'echo':
          await playSequence(question.midis, 60)
          break
        case 'scale-type':
          await playSequence(question.midis, 84)
          break
        case 'cadence':
          await playChordSequence(question.chords, 40)
          break
        case 'rhythm-dictation': {
          // Sixteenth-note patterns get a slower click so the ear can keep up.
          const tempo = question.answer.events.some((e) => e.durationBeats <= 0.25 + 1e-6) ? 72 : 84
          await playSong(question.answer.events.map((e) => ({ midi: 75, ...e })), tempo, question.answer.swing)
          break
        }
      }
    } finally {
      playing = false
    }
  }

  /** Staff rendering for the visual question kinds. */
  const visualScore = $derived.by((): ScoreModel | null => {
    if (!question) return null
    switch (question.kind) {
      case 'note-naming':
        return {
          clef: question.clef,
          keySignature: 'C',
          events: [{ keys: [midiToVexKey(question.midi)], duration: 'w' }],
        }
      case 'key-signature':
        return {
          clef: 'treble',
          keySignature: question.keySignature,
          events: [{ keys: [], duration: 'w', rest: true }],
        }
      case 'circle-of-fifths':
        // Only the relative-minor level carries a signature to show.
        if (!question.keySignature) return null
        return {
          clef: 'treble',
          keySignature: question.keySignature,
          events: [{ keys: [], duration: 'w', rest: true }],
        }
      case 'interval-staff':
        return {
          clef: question.clef,
          keySignature: 'C',
          events: question.harmonic
            ? [{ keys: [midiToVexKey(question.midis[0]), midiToVexKey(question.midis[1])], duration: 'w' }]
            : [
                { keys: [midiToVexKey(question.midis[0])], duration: 'h' },
                { keys: [midiToVexKey(question.midis[1])], duration: 'h' },
              ],
        }
      default:
        return null
    }
  })

  const prompt = $derived.by(() => {
    if (!question) return null
    if ('prompt' in question) return question.prompt
    return null
  })

  function choose(opt: string) {
    if (!question || selected !== null) return
    // Phrase modes grade themselves via their own components, not QuizCard.
    if (question.kind === 'echo' || question.kind === 'read-melody' || question.kind === 'sight-read') return
    selected = opt
    answered++
    const answer = question.kind === 'rhythm-dictation' ? question.answer.id : question.answer
    if (opt === answer) correct++
    maybeRecord()
  }

  function onEchoComplete(mistakes: number) {
    if (echoResult !== null) return
    echoResult = mistakes
    answered++
    if (mistakes === 0) correct++
    maybeRecord()
  }

  function onPhraseComplete(mistakes: number) {
    if (phraseResult !== null) return
    phraseResult = mistakes
    answered++
    if (mistakes === 0) correct++
    maybeRecord()
  }

  // Feedback for the round-complete card: streak towards the next level, or
  // the level-up itself (three perfect rounds in a row bump the stored level).
  let roundFeedback = $state<string | null>(null)
  let autoLeveled = $state(false)

  function maybeRecord() {
    if (answered < roundSize) return
    addRecord({
      lessonId: `quiz-${mode}`,
      title: `Quiz: ${modeDef.label}`,
      segment: `Level ${level}`,
      mistakes: answered - correct,
      steps: answered,
      kind: 'ear',
      score: { correct, total: answered },
    })
    const { leveledUp, progress } = recordRun(`quiz-${mode}`, correct === answered, maxLevel)
    if (leveledUp) {
      level = progress.level
      autoLeveled = true
      roundFeedback = `🎉 Three perfect rounds — you're now on level ${progress.level}.`
      reflectRoute()
    } else if (correct === answered && level < maxLevel) {
      roundFeedback = `Perfect round — ${progress.streak}/${STREAK_TO_LEVEL_UP} towards level ${level + 1}.`
    } else {
      roundFeedback = null
    }
  }

  function next() {
    question = makeQuestion()
    selected = null
    echoResult = null
    phraseResult = null
    heard = false
    if (modeDef.audio) void play()
  }

  // Initial question (no autoplay — audio needs a user gesture).
  resetRound()

  $effect(() =>
    registerVoiceCommands({
      name: 'Quizzes',
      phrases: SCOPE_PHRASES['Quizzes'],
      handle(intent) {
        if (intent.kind === 'play-demo') {
          void play()
          return { say: '' }
        }
        if (intent.kind === 'lesson' && intent.action === 'next') {
          if (!roundDone && (selected !== null || echoResult !== null || phraseResult !== null)) next()
          return { say: '' }
        }
        return null
      },
    }),
  )
</script>

<section>
  <BackToGuide />
  <h1>Quizzes</h1>
  <p class="hint">A few minutes of ear training and theory a day — it makes everything else easier.</p>

  {#each MODE_GROUPS as group (group.label)}
    <div class="mode-row">
      <span class="group-label">{group.label}</span>
      {#each group.modes as m (m.id)}
        <button class="seg" class:active={mode === m.id} data-tip={m.desc} onclick={() => setMode(m.id)}>
          {m.label}
        </button>
      {/each}
    </div>
  {/each}

  <div class="mode-row">
    <label class="level">
      Level
      {#each Array.from({ length: maxLevel }, (_, i) => i + 1) as l (l)}
        <button class="seg small" class:active={level === l} onclick={() => setLevel(l)}>{l}</button>
      {/each}
    </label>
  </div>

  <div class="card">
    <p class="hint"><GlossText text={modeDef.desc} /></p>
    <p class="score">
      Question {Math.min(answered + 1, roundSize)} / {roundSize} · {correct} correct
    </p>

    {#if roundDone}
      <div class="complete">
        🎉 Round complete — {correct} / {answered} correct.
        {#if roundFeedback}
          <span class="feedback">{roundFeedback}</span>
        {/if}
        <button class="primary" onclick={resetRound}>New round</button>
        {#if !autoLeveled && correct === answered && level < maxLevel}
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
      {:else if question.kind === 'read-melody'}
        <MelodyReadCard
          clef={question.clef}
          keySignature={question.keySignature}
          midis={question.midis}
          names={question.names}
          optionPool={question.optionPool}
          oncomplete={onPhraseComplete}
        />
        {#if phraseResult !== null}
          <div class="complete">
            {phraseResult === 0 ? '✨ Every note named!' : `Named them with ${phraseResult} wrong guess${phraseResult === 1 ? '' : 'es'}.`}
            <button class="primary" onclick={next}>Next phrase →</button>
          </div>
        {/if}
      {:else if question.kind === 'sight-read'}
        <SightReadPlayer
          clef={question.clef}
          keySignature={question.keySignature}
          steps={question.steps}
          oncomplete={onPhraseComplete}
        />
        {#if phraseResult !== null}
          <div class="complete">
            {phraseResult === 0 ? '✨ Played it clean!' : `Played it with ${phraseResult} wrong note${phraseResult === 1 ? '' : 's'}.`}
            <button class="primary" onclick={next}>Next phrase →</button>
          </div>
        {/if}
      {:else if question.kind === 'rhythm-dictation'}
        {#if !heard}
          <button class="primary" onclick={play} disabled={playing}>🔊 Hear it</button>
        {:else}
          <RhythmQuizCard
            options={question.options}
            answerId={question.answer.id}
            {selected}
            {playing}
            onselect={choose}
            onreplay={play}
            explanation={question.explanation}
          />
        {/if}
        {#if selected !== null}
          <button class="primary next" onclick={next}>Next →</button>
        {/if}
      {:else if question.kind === 'interval' || question.kind === 'chord' || question.kind === 'scale-type' || question.kind === 'cadence'}
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
            explanation={question.explanation}
          />
        {/if}
        {#if selected !== null}
          <button class="primary next" onclick={next}>Next →</button>
        {/if}
      {:else}
        {#if prompt}
          <p class="prompt">{prompt}</p>
        {/if}
        {#if question.kind === 'chord-spelling'}
          <p class="symbol">{question.symbol}</p>
        {/if}
        {#if visualScore}
          <div class="staff">
            <SheetMusic score={visualScore} minWidth={260} />
          </div>
        {/if}
        <QuizCard
          options={question.options}
          answer={question.answer}
          {selected}
          onselect={choose}
          explanation={question.explanation}
        />
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
    margin: 12px 0;
  }
  .group-label {
    flex: 0 0 120px;
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
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
  .prompt {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
  }
  .symbol {
    margin: 0;
    font-size: 34px;
    font-weight: 700;
    color: #1d4ed8;
  }
  .staff {
    max-width: 360px;
  }
  .next {
    align-self: flex-start;
  }
  .feedback {
    display: block;
    font-size: 13px;
    color: #475569;
  }
  button.primary {
    align-self: flex-start;
  }
</style>
