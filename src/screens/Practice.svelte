<script lang="ts">
  import LessonPlayer from '../components/LessonPlayer.svelte'
  import { allLessons, makeSightReadingLesson, type Lesson } from '../lib/data/lessons'
  import { matchLesson } from '../lib/voice/parser'
  import { registerVoiceCommands } from '../lib/voice/voice.svelte'

  const POLY_AVAILABLE = true

  const lessons = allLessons()
  const methods = [...new Set(lessons.map((l) => l.method))]

  let selected = $state<Lesson | null>(null)
  let sightReading = $state(makeSightReadingLesson())

  const METHOD_BLURBS: Record<string, string> = {
    'Five-finger positions':
      'The classic starting point: one finger per key, no hand movement. Builds hand shape and evenness.',
    Hanon:
      'Charles-Louis Hanon’s finger independence exercises (1873) — still the most widely used technique drills in piano teaching.',
    'Scale routine':
      'Daily scales with standard fingering — the backbone of technique and key familiarity.',
    'Cadence drills':
      'I–IV–V–I chord progressions in comfortable voicings — the harmony behind most songs you know.',
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
      <LessonPlayer lesson={selected} onexit={() => (selected = null)} />
    {/key}
    {#if selected.method === 'Sight-reading'}
      <p style="margin-top: 12px">
        <button
          class="primary"
          onclick={() => {
            sightReading = makeSightReadingLesson()
            selected = sightReading
          }}
        >
          🎲 New melody
        </button>
      </p>
    {/if}
  {:else}
    <p class="hint">
      Pick a routine. The app listens while you play and walks you through it note by note —
      wrong notes flash red and the lesson waits for you.
    </p>

    {#each methods as method (method)}
      <h2 class="method">{method}</h2>
      <p class="hint">{METHOD_BLURBS[method]}</p>
      <div class="lesson-grid">
        {#each lessons.filter((l) => l.method === method) as lesson (lesson.id)}
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
    <div class="lesson-grid">
      <button class="lesson-tile" onclick={() => (selected = sightReading)}>
        <strong>{sightReading.title}</strong>
        <span>a new melody every time</span>
      </button>
    </div>
  {/if}
</section>

<style>
  .method {
    margin-top: 24px;
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
