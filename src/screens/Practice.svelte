<script lang="ts">
  import LessonPlayer from '../components/LessonPlayer.svelte'
  import { allLessons, type Lesson } from '../lib/data/lessons'
  import { getProgress, recordRun, setLevel, STREAK_TO_LEVEL_UP } from '../lib/practice/progress.svelte'
  import { makeSightReading, SIGHT_LEVELS, type SightLevel } from '../lib/sightread/generator'
  import { matchLesson } from '../lib/voice/parser'
  import { registerVoiceCommands } from '../lib/voice/voice.svelte'
  import { currentParams } from '../router.svelte'

  const POLY_AVAILABLE = true
  const SIGHT_ACTIVITY = 'sight-reading'
  const MAX_SIGHT_LEVEL = 5

  const lessons = allLessons()
  const methods = [...new Set(lessons.map((l) => l.method))]
  const keys = ['All', ...new Set(lessons.map((l) => l.keySignature.replace(/m$/, '')))]

  let selected = $state<Lesson | null>(null)
  let keyFilter = $state('All')
  let sightLevel = $state(Math.min(MAX_SIGHT_LEVEL, getProgress(SIGHT_ACTIVITY).level) as SightLevel)
  // Seeding from the persisted level once is intended; newMelody() regenerates.
  // svelte-ignore state_referenced_locally
  let sightReading = $state(makeSightReading(sightLevel))
  let sightMessage = $state('')

  function newMelody(level = sightLevel) {
    sightLevel = level
    sightReading = makeSightReading(level)
    selected = sightReading
  }

  function chooseSightLevel(level: SightLevel) {
    setLevel(SIGHT_ACTIVITY, level)
    sightMessage = ''
    newMelody(level)
  }

  function onSightComplete({ mistakes }: { mistakes: number }) {
    const { leveledUp, progress } = recordRun(SIGHT_ACTIVITY, mistakes === 0, MAX_SIGHT_LEVEL)
    if (leveledUp) {
      sightLevel = progress.level as SightLevel
      sightMessage = `🎉 Level up! You're now reading at level ${progress.level}.`
    } else if (mistakes === 0) {
      sightMessage = `Clean read — ${progress.streak}/${STREAK_TO_LEVEL_UP} towards level ${Math.min(progress.level + 1, MAX_SIGHT_LEVEL)}.`
    } else {
      sightMessage = 'Streak reset — a clean read has no wrong notes. Try another!'
    }
  }

  const makeSightReadingLesson = () => makeSightReading(sightLevel)

  // Deep links from the learning guide, read once at mount. ?sight= goes
  // through newMelody (not chooseSightLevel) on purpose: a guide link must
  // never touch the persisted sight-reading level.
  {
    const params = currentParams()
    const linked = params.lesson && lessons.find((l) => l.id === params.lesson)
    if (linked) selected = linked
    else if (params.sight && /^[1-5]$/.test(params.sight)) newMelody(Number(params.sight) as SightLevel)
  }

  const visibleLessons = $derived(
    keyFilter === 'All' ? lessons : lessons.filter((l) => l.keySignature.replace(/m$/, '') === keyFilter),
  )

  const METHOD_BLURBS: Record<string, string> = {
    'Five-finger positions':
      'The classic starting point: one finger per key, no hand movement. Builds hand shape and evenness.',
    Hanon:
      'Charles-Louis Hanon’s finger independence exercises (1873) — still the most widely used technique drills in piano teaching.',
    'Scale routine':
      'Daily scales in every key with standard fingering — one and two octaves, hands separate and together.',
    Arpeggios:
      'Triad arpeggios up and down — the wrist-lateral motion behind accompaniment patterns and virtuosic passages alike.',
    'Broken chords':
      'Triads played note by note through every inversion — early-grades staple for hand shape and inversions.',
    'Cadence drills':
      'I–IV–V–I chord progressions in comfortable voicings — the harmony behind most songs you know.',
    'Jazz & blues':
      'Blues scales, ii–V–I guide tones and 12-bar comping — the entry points into jazz piano.',
    'Sight-reading':
      'Short random melodies you have never seen — trains reading the staff instead of memorizing.',
  }

  $effect(() =>
    registerVoiceCommands({
      name: 'Practice',
      phrases: ['practice five finger', 'finger exercise', 'sight reading', 'new melody', 'back to lessons'],
      handle(intent) {
        if (intent.kind === 'open-lesson') {
          if (/sight ?reading/.test(intent.query)) {
            sightReading = makeSightReadingLesson()
            selected = sightReading
            return { say: 'Sight reading — a fresh melody.' }
          }
          const id = matchLesson(intent.query, lessons)
          const lesson = lessons.find((l) => l.id === id)
          if (!lesson) return { say: "I couldn't find that lesson." }
          selected = lesson
          return { say: lesson.title }
        }
        if (intent.kind === 'lesson' && intent.action === 'new-melody') {
          sightReading = makeSightReadingLesson()
          selected = sightReading
          return { say: 'New melody.' }
        }
        if (intent.kind === 'lesson' && intent.action === 'exit') {
          selected = null
          return { say: '' }
        }
        return null
      },
    }),
  )
</script>

<section>
  <h1>Practice</h1>

  {#if selected}
    {#key selected.id}
      <LessonPlayer
        lesson={selected}
        onexit={() => (selected = null)}
        oncomplete={selected.method === 'Sight-reading' ? onSightComplete : undefined}
      />
    {/key}
    {#if selected.method === 'Sight-reading'}
      {#if sightMessage}
        <p class="sight-message">{sightMessage}</p>
      {/if}
      <p style="margin-top: 12px">
        <button class="primary" onclick={() => newMelody()}>🎲 New melody</button>
      </p>
    {/if}
  {:else}
    <p class="hint">
      Pick a routine. The app listens while you play and walks you through it note by note —
      wrong notes flash red and the lesson waits for you.
    </p>

    <label class="key-filter">
      Key:
      <select bind:value={keyFilter}>
        {#each keys as k (k)}
          <option value={k}>{k}</option>
        {/each}
      </select>
    </label>

    {#each methods.filter((m) => visibleLessons.some((l) => l.method === m)) as method (method)}
      <h2 class="method">{method}</h2>
      <p class="hint">{METHOD_BLURBS[method]}</p>
      <div class="lesson-grid">
        {#each visibleLessons.filter((l) => l.method === method) as lesson (lesson.id)}
          {@const locked = lesson.detectionMode === 'poly' && !POLY_AVAILABLE}
          <button
            class="lesson-tile"
            disabled={locked}
            onclick={() => (selected = lesson)}
            title={locked ? 'Needs chord detection — coming soon' : ''}
          >
            <strong>{lesson.title}</strong>
            <span>{lesson.segments.length} part{lesson.segments.length > 1 ? 's' : ''} · ♩= {lesson.tempoBpm}</span>
            {#if locked}<span class="lock">🔒 needs chord detection</span>{/if}
          </button>
        {/each}
      </div>
    {/each}

    <h2 class="method">Sight-reading</h2>
    <p class="hint">{METHOD_BLURBS['Sight-reading']}</p>
    <p class="hint">
      {STREAK_TO_LEVEL_UP} clean reads in a row level you up. Current streak:
      {getProgress(SIGHT_ACTIVITY).streak}/{STREAK_TO_LEVEL_UP}.
    </p>
    <div class="controls-row">
      {#each [1, 2, 3, 4, 5] as const as l (l)}
        <button class="seg" class:active={sightLevel === l} onclick={() => chooseSightLevel(l)}>
          L{l} · {SIGHT_LEVELS[l]}
        </button>
      {/each}
    </div>
    <div class="lesson-grid">
      <button class="lesson-tile" onclick={() => newMelody()}>
        <strong>Sight-read at level {sightLevel}</strong>
        <span>a new melody every time</span>
      </button>
    </div>
  {/if}
</section>

<style>
  .method {
    margin-top: 24px;
  }
  .controls-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin: 10px 0;
  }
  .seg {
    padding: 6px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
    font-size: 13px;
  }
  .seg.active {
    background: #1d4ed8;
    border-color: #1d4ed8;
    color: #fff;
  }
  .sight-message {
    margin: 10px 0 0;
    padding: 10px 14px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    font-weight: 600;
    color: #1d4ed8;
  }
  .key-filter {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #475569;
    margin-top: 8px;
  }
  .key-filter select {
    padding: 6px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
  }
  .lesson-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
    margin-top: 10px;
  }
  .lesson-tile {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
    text-align: left;
    padding: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
    cursor: pointer;
    font-size: 14px;
  }
  .lesson-tile:hover:not(:disabled) {
    border-color: #1d4ed8;
  }
  .lesson-tile:disabled {
    opacity: 0.55;
    cursor: default;
  }
  .lesson-tile span {
    color: #64748b;
    font-size: 12px;
  }
  .lock {
    color: #b45309 !important;
  }
</style>
