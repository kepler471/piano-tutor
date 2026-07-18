<script lang="ts">
  import BackToGuide from '../components/BackToGuide.svelte'
  import GlossText from '../components/GlossText.svelte'
  import LessonPlayer from '../components/LessonPlayer.svelte'
  import { METHOD_GUIDE_STAGE } from '../lib/data/guide'
  import { METHOD_CHORD_UNIT } from '../lib/data/chordPath'
  import { allLessons, type Lesson } from '../lib/data/lessons'
  import { getProgress, recordRun, setLevel, STREAK_TO_LEVEL_UP } from '../lib/practice/progress.svelte'
  import { makeSightReading, SIGHT_LEVELS, type SightLevel } from '../lib/sightread/generator'
  import { matchLesson } from '../lib/voice/parser'
  import { SCOPE_PHRASES } from '../lib/voice/phrases'
  import { registerVoiceCommands } from '../lib/voice/voice.svelte'
  import { currentParams, navigate } from '../router.svelte'

  const SIGHT_ACTIVITY = 'sight-reading'
  const MAX_SIGHT_LEVEL = 5

  const lessons = allLessons()
  const methods = [...new Set(lessons.map((l) => l.method))]
  const keys = ['All', ...new Set(lessons.map((l) => l.keySignature.replace(/m$/, '')))]

  let keyFilter = $state('All')
  let sightLevel = $state(Math.min(MAX_SIGHT_LEVEL, getProgress(SIGHT_ACTIVITY).level) as SightLevel)
  // Seeding from the persisted level once is intended; newMelody() regenerates.
  // svelte-ignore state_referenced_locally
  let sightReading = $state(makeSightReading(sightLevel))
  let sightMessage = $state('')

  // Selection lives in the URL so the browser back button steps
  // open lesson → lesson list → previous screen, and guide deep links
  // just work. The generated sight-reading melody itself stays in state
  // (it has no stable id); ?sight=<level> marks it open.
  const params = $derived(currentParams())
  const selected = $derived.by((): Lesson | null => {
    if (params.lesson) return lessons.find((l) => l.id === params.lesson) ?? null
    if (params.sight && /^[1-5]$/.test(params.sight)) return sightReading
    return null
  })

  /** Preserve the guide breadcrumb (?from=guide) across in-screen navigation. */
  const withFrom = (extra?: Record<string, string>) =>
    params.from ? { ...extra, from: params.from } : extra

  function openLesson(lesson: Lesson) {
    navigate('/practice', withFrom({ lesson: lesson.id }))
  }

  function exitLesson() {
    navigate('/practice', withFrom())
  }

  /** Open the sight-reading player with a fresh melody at `level`. */
  function openSight(level = sightLevel) {
    sightLevel = level
    sightReading = makeSightReading(level)
    navigate('/practice', withFrom({ sight: String(level) }))
  }

  /** Regenerate in place while the player is open — no history entry. */
  function newMelody(level = sightLevel) {
    sightLevel = level
    sightReading = makeSightReading(level)
    if (params.sight !== String(level)) navigate('/practice', withFrom({ sight: String(level) }), { replace: true })
  }

  function chooseSightLevel(level: SightLevel) {
    setLevel(SIGHT_ACTIVITY, level)
    sightMessage = ''
    openSight(level)
  }

  // A guide link (?sight=N) must produce a melody at that level without
  // touching the persisted sight-reading level; also covers back/forward
  // between different ?sight= entries.
  $effect(() => {
    const s = params.sight
    if (s && /^[1-5]$/.test(s)) {
      const level = Number(s) as SightLevel
      if (level !== sightLevel) {
        sightLevel = level
        sightReading = makeSightReading(level)
      }
    }
  })

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

  // The natural follow-up offered on the completion card: the next lesson
  // of the same method (sight-reading regenerates instead).
  const nextLesson = $derived.by(() => {
    if (!selected || selected.method === 'Sight-reading') return undefined
    const sameMethod = lessons.filter((l) => l.method === selected.method)
    const next = sameMethod[sameMethod.findIndex((l) => l.id === selected.id) + 1]
    return next ? { title: next.title, onopen: () => openLesson(next) } : undefined
  })

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
    'Chromatic scale':
      'Every key in order — 3 on the blacks, thumb on the whites. The same fingering works from any starting note.',
    'Contrary motion':
      'Both thumbs on the same note, hands moving apart and back — the mirror image trains real hand independence.',
    Arpeggios:
      'Triad arpeggios up and down — the wrist-lateral motion behind accompaniment patterns and virtuosic passages alike.',
    'Broken chords':
      'Triads played note by note through every inversion — early-grades staple for hand shape and inversions.',
    'Triad drills':
      'Block triads in root position — the basic chord shapes and the four qualities side by side.',
    Inversions:
      'The same triad rearranged so any note can be on the bottom — the key to smooth chord changes.',
    'Diatonic chords':
      'The seven chords that live inside one key, built on each scale note and named with roman numerals.',
    'Cadence drills':
      'I–IV–V–I chord progressions in comfortable voicings — the harmony behind most songs you know.',
    'Cadence types':
      'The four classic phrase endings — authentic, plagal, half and deceptive — played and compared.',
    Progressions:
      'The workhorse chord loops of pop, doo-wop and blues, voiced so each change barely moves the hand.',
    'Seventh chords':
      'Four-note chords — maj7, m7, 7 and m7♭5 — and the V7→I resolution that drives tonal music.',
    Accompaniment:
      'Left-hand patterns over a progression — block, broken, Alberti and stride — plus playing from a lead sheet.',
    'Jazz & blues':
      'Blues scales, ii–V–I guide tones and 12-bar comping — the entry points into jazz piano.',
    'Sight-reading':
      'Short random melodies you have never seen — trains reading the staff instead of memorizing.',
  }


  $effect(() =>
    registerVoiceCommands({
      name: 'Practice',
      phrases: SCOPE_PHRASES['Practice'],
      handle(intent) {
        if (intent.kind === 'open-lesson') {
          if (/sight ?reading/.test(intent.query)) {
            openSight()
            return { say: 'Sight reading — a fresh melody.' }
          }
          const id = matchLesson(intent.query, lessons)
          const lesson = lessons.find((l) => l.id === id)
          if (!lesson) return { say: "I couldn't find that lesson." }
          openLesson(lesson)
          return { say: lesson.title }
        }
        if (intent.kind === 'lesson' && intent.action === 'new-melody') {
          if (selected?.method === 'Sight-reading') newMelody()
          else openSight()
          return { say: 'New melody.' }
        }
        if (intent.kind === 'lesson' && intent.action === 'exit') {
          exitLesson()
          return { say: '' }
        }
        return null
      },
    }),
  )
</script>

<section>
  <BackToGuide />
  <h1>Practice</h1>

  {#if selected}
    {#key selected.id}
      <LessonPlayer
        lesson={selected}
        onexit={exitLesson}
        oncomplete={selected.method === 'Sight-reading' ? onSightComplete : undefined}
        {nextLesson}
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
      <h2 class="method">
        {method}
        {#if METHOD_GUIDE_STAGE[method]}
          <a class="guide-chip" href={`#/guide?stage=${METHOD_GUIDE_STAGE[method]}`}>Guide →</a>
        {/if}
        {#if METHOD_CHORD_UNIT[method]}
          <a class="guide-chip" href={`#/chord-path?unit=${METHOD_CHORD_UNIT[method]}`}>Chord path →</a>
        {/if}
      </h2>
      <p class="hint"><GlossText text={METHOD_BLURBS[method]} /></p>
      <div class="lesson-grid">
        {#each visibleLessons.filter((l) => l.method === method) as lesson (lesson.id)}
          <button class="lesson-tile" onclick={() => openLesson(lesson)}>
            <strong>{lesson.title}</strong>
            <span>{lesson.segments.length} part{lesson.segments.length > 1 ? 's' : ''} · ♩= {lesson.tempoBpm}</span>
          </button>
        {/each}
      </div>
    {/each}

    <h2 class="method">
      Sight-reading
      <a class="guide-chip" href={`#/guide?stage=${METHOD_GUIDE_STAGE['Sight-reading']}`}>Guide →</a>
    </h2>
    <p class="hint"><GlossText text={METHOD_BLURBS['Sight-reading']} /></p>
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
      <button class="lesson-tile" onclick={() => openSight()}>
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
  .lesson-tile:hover {
    border-color: #1d4ed8;
  }
  .lesson-tile span {
    color: #64748b;
    font-size: 12px;
  }
  .guide-chip {
    margin-left: 8px;
    padding: 2px 10px;
    border: 1px solid #dbeafe;
    border-radius: 999px;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
    vertical-align: middle;
  }
  .guide-chip:hover {
    background: #dbeafe;
  }
</style>
