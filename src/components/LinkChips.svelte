<script lang="ts">
  import type { GuideLink } from '../lib/data/guide'
  import { guideItemStats } from '../lib/practice/guideProgress'
  import { practiceHistory } from '../lib/practice/history.svelte'

  /**
   * A row of curriculum link chips with "practiced ✓" badges derived from the
   * history log (reference-only links get no badge). Shared by the learning
   * guide and the chord path; `href` decides which from= param the links carry.
   */
  let { links, href }: { links: GuideLink[]; href: (link: GuideLink) => string } = $props()

  function stats(link: GuideLink) {
    return guideItemStats(link, practiceHistory.records, new Date())
  }

  function badgeTitle(s: NonNullable<ReturnType<typeof stats>>): string {
    const when = s.lastAt ? ` — last on ${new Date(s.lastAt).toLocaleDateString()}` : ''
    return `Practiced ${s.count} time${s.count === 1 ? '' : 's'}${when}`
  }
</script>

<div class="chips">
  {#each links as link (link.label)}
    {@const s = stats(link)}
    <a class="chip" class:practiced={s?.recent} href={href(link)}>
      {link.label}{#if s && s.count > 0}<span class="tick" title={badgeTitle(s)}>
          ✓{s.count > 1 ? `×${s.count}` : ''}</span>{/if}
    </a>
  {/each}
</div>

<style>
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
  .chip.practiced {
    border-color: #86efac;
    background: #f0fdf4;
    color: #15803d;
  }
  .chip.practiced:hover {
    background: #dcfce7;
  }
  .tick {
    margin-left: 5px;
    font-size: 12px;
    color: #16a34a;
    font-weight: 600;
  }
</style>
