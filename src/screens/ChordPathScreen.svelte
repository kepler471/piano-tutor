<script lang="ts" module>
  import { CHORD_UNITS } from '../lib/data/chordPath'

  // Which units are expanded. Module-level so following a link and coming
  // back keeps your place for the rest of the visit — never persisted (the
  // path tracks no progress by design; a reload resets).
  let open = $state<Record<string, boolean>>({ [CHORD_UNITS[0].id]: true })
</script>

<script lang="ts">
  import GlossText from '../components/GlossText.svelte'
  import LinkChips from '../components/LinkChips.svelte'
  import { chordPathHref } from '../lib/data/chordPath'
  import { SCOPE_PHRASES } from '../lib/voice/phrases'
  import { registerVoiceCommands } from '../lib/voice/voice.svelte'
  import { currentParams } from '../router.svelte'

  function toggle(id: string) {
    open[id] = !open[id]
  }

  function showUnit(n: number) {
    const unit = CHORD_UNITS[n - 1]
    if (!unit) return false
    open[unit.id] = true
    document.getElementById(unit.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return true
  }

  // Deep link (#/chord-path?unit=unit-4): open and scroll to that unit.
  {
    const linked = CHORD_UNITS.findIndex((u) => u.id === currentParams().unit)
    if (linked !== -1) setTimeout(() => showUnit(linked + 1), 0)
  }

  $effect(() =>
    registerVoiceCommands({
      name: 'Chord Path',
      phrases: SCOPE_PHRASES['Chord Path'],
      handle(intent) {
        if (intent.kind === 'show-unit') {
          return showUnit(intent.unit) ? { say: `Unit ${intent.unit}.` } : { say: 'Units go from one to seven.' }
        }
        return null
      },
    }),
  )
</script>

<section>
  <h1>Chord Path</h1>
  <p class="hint">
    Everything about chords, in order: what they are, how they connect, why progressions work,
    and how to accompany real songs from chord symbols. Each unit pairs a little theory with
    drills you can play right now — work top to bottom, and use the check quizzes as your gate
    to the next unit. A green ✓ marks material you've already practiced.
  </p>
  <p class="hint">
    The units build on each other more strictly than the learning guide's stages do — inversions
    feed progressions, progressions feed accompaniment. Resist skipping ahead.
  </p>

  {#each CHORD_UNITS as unit (unit.id)}
    <article class="stage" id={unit.id}>
      <button class="stage-head" onclick={() => toggle(unit.id)} aria-expanded={!!open[unit.id]}>
        <div>
          <h2>{unit.title}</h2>
          <span class="grade">{unit.tagline}</span>
        </div>
        <span class="chevron">{open[unit.id] ? '▾' : '▸'}</span>
      </button>

      {#if open[unit.id]}
        <div class="stage-body">
          <p class="overview"><GlossText text={unit.overview} /></p>

          {#each unit.theory as section (section.title)}
            <div class="theory">
              <h3>{section.title}</h3>
              <p><GlossText text={section.body} /></p>
              {#if section.links.length}
                <LinkChips links={section.links} href={chordPathHref} />
              {/if}
            </div>
          {/each}

          <h3>Practice</h3>
          <LinkChips links={unit.practice} href={chordPathHref} />

          <h3>Check yourself</h3>
          <LinkChips links={unit.check} href={chordPathHref} />

          <h3>Move on when…</h3>
          <ul>
            {#each unit.moveOnWhen as item (item)}
              <li>{item}</li>
            {/each}
          </ul>

          <h3>Beyond the app</h3>
          <ul class="resources">
            {#each unit.resources as res (res.url)}
              <li>
                <a href={res.url} target="_blank" rel="noopener noreferrer">{res.title}</a>
                — {res.note}
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </article>
  {/each}
</section>

<style>
  .stage {
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #fff;
    margin-top: 16px;
  }
  .stage-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 16px 20px;
    border: none;
    background: none;
    cursor: pointer;
    text-align: left;
  }
  .stage-head h2 {
    margin: 0;
    font-size: 18px;
  }
  .grade {
    font-size: 13px;
    color: #64748b;
  }
  .chevron {
    color: #94a3b8;
    font-size: 14px;
  }
  .stage-body {
    padding: 0 20px 20px;
    border-top: 1px solid #f1f5f9;
  }
  .stage-body h3 {
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #475569;
    margin: 20px 0 8px;
  }
  .overview {
    color: #334155;
    line-height: 1.55;
    margin: 14px 0 0;
  }
  .stage-body ul {
    margin: 0;
    padding-left: 20px;
    color: #334155;
    font-size: 14px;
    line-height: 1.6;
  }
  .theory p {
    color: #334155;
    font-size: 14px;
    line-height: 1.6;
    margin: 0 0 8px;
  }
  .resources a {
    color: #1d4ed8;
    font-weight: 600;
  }
</style>
