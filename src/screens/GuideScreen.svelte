<script lang="ts">
  import { GUIDE_STAGES, guideHref, type GuideLink, type GuideStage } from '../lib/data/guide'
  import { registerVoiceCommands } from '../lib/voice/voice.svelte'

  // Which stages are expanded. Transient by design — the guide never
  // persists anything (no progress tracking).
  let open = $state<Record<string, boolean>>({ [GUIDE_STAGES[0].id]: true })

  function toggle(id: string) {
    open[id] = !open[id]
  }

  function showStage(n: number) {
    const stage = GUIDE_STAGES[n - 1]
    if (!stage) return false
    open[stage.id] = true
    document.getElementById(stage.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return true
  }

  const LINK_GROUPS: { key: 'technique' | 'repertoire' | 'ear' | 'rhythm' | 'sight'; label: string }[] = [
    { key: 'technique', label: 'Technique' },
    { key: 'repertoire', label: 'Pieces' },
    { key: 'ear', label: 'Ear' },
    { key: 'rhythm', label: 'Rhythm' },
    { key: 'sight', label: 'Sight-reading' },
  ]

  function groups(stage: GuideStage): { label: string; links: GuideLink[] }[] {
    return LINK_GROUPS.map((g) => ({ label: g.label, links: stage[g.key] })).filter((g) => g.links.length > 0)
  }

  $effect(() =>
    registerVoiceCommands({
      name: 'Guide',
      phrases: ['show stage two', 'open stage four'],
      handle(intent) {
        if (intent.kind === 'show-stage') {
          return showStage(intent.stage) ? { say: `Stage ${intent.stage}.` } : { say: 'There are five stages.' }
        }
        return null
      },
    }),
  )
</script>

<section>
  <h1>Learning Guide</h1>
  <p class="hint">
    A path from your first notes to early intermediate playing, using everything in this app —
    and pointing to the outside learning worth adding along the way. There is nothing to unlock
    and nothing is tracked: read a stage, practice from it, and move on when it feels secure.
  </p>
  <p class="hint">
    Work a stage for a few weeks. Little and often beats long and rare — twenty focused minutes a
    day outruns a two-hour Sunday.
  </p>

  {#each GUIDE_STAGES as stage (stage.id)}
    <article class="stage" id={stage.id}>
      <button class="stage-head" onclick={() => toggle(stage.id)} aria-expanded={!!open[stage.id]}>
        <div>
          <h2>{stage.title}</h2>
          <span class="grade">{stage.gradeEquivalent}</span>
        </div>
        <span class="chevron">{open[stage.id] ? '▾' : '▸'}</span>
      </button>

      {#if open[stage.id]}
        <div class="stage-body">
          <p class="overview">{stage.overview}</p>

          <h3>You're working towards</h3>
          <ul>
            {#each stage.goals as goal (goal)}
              <li>{goal}</li>
            {/each}
          </ul>

          <h3>Practice material</h3>
          {#each groups(stage) as group (group.label)}
            <div class="link-group">
              <span class="group-label">{group.label}</span>
              <div class="chips">
                {#each group.links as link (link.label)}
                  <a class="chip" href={guideHref(link)}>{link.label}</a>
                {/each}
              </div>
            </div>
          {/each}

          {#each stage.theory as section (section.title)}
            <div class="theory">
              <h3>{section.title}</h3>
              <p>{section.body}</p>
              {#if section.links.length}
                <div class="chips">
                  {#each section.links as link (link.label)}
                    <a class="chip" href={guideHref(link)}>{link.label}</a>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}

          <h3>A week at this stage (~{stage.weeklyPlan.totalMinutes} min/day)</h3>
          <ul>
            {#each stage.weeklyPlan.items as item (item)}
              <li>{item}</li>
            {/each}
          </ul>

          <h3>Beyond the app</h3>
          <ul class="resources">
            {#each stage.resources as res (res.url)}
              <li>
                <a href={res.url} target="_blank" rel="noopener noreferrer">{res.title}</a>
                — {res.note}
              </li>
            {/each}
          </ul>

          <h3>Move on when…</h3>
          <ul>
            {#each stage.moveOnWhen as item (item)}
              <li>{item}</li>
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
    overflow: hidden;
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
  .link-group {
    display: flex;
    gap: 10px;
    align-items: baseline;
    margin-bottom: 8px;
  }
  .group-label {
    flex: 0 0 90px;
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    display: inline-block;
    padding: 4px 10px;
    border: 1px solid #dbeafe;
    border-radius: 999px;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 13px;
    text-decoration: none;
  }
  .chip:hover {
    background: #dbeafe;
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
