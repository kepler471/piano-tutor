<script lang="ts">
  import { CIRCLE_KEYS, type CircleKey } from '../lib/theory/circle'

  let {
    selected,
    onselect,
    size = 420,
  }: {
    /** The selected major key, in MAJOR_ROOTS spelling ('F#', 'Db', …). */
    selected: string
    onselect?: (major: string) => void
    size?: number
  } = $props()

  // Fixed internal geometry; the svg scales via width/height.
  const C = 210
  const R_OUT = 200
  const R_IN = 86
  const R_MAJOR = 172
  const R_MINOR = 132
  const R_BADGE = 102

  const uni = (n: string) => n.replace('#', '♯').replace('b', '♭')

  function polar(r: number, deg: number): [number, number] {
    const rad = (deg * Math.PI) / 180
    return [C + r * Math.cos(rad), C + r * Math.sin(rad)]
  }

  /** Annular sector for slot i: 30° wide, centered at i*30 − 90 (C at 12 o'clock). */
  function wedgePath(i: number): string {
    const a0 = i * 30 - 105
    const a1 = a0 + 30
    const [x1, y1] = polar(R_OUT, a0)
    const [x2, y2] = polar(R_OUT, a1)
    const [x3, y3] = polar(R_IN, a1)
    const [x4, y4] = polar(R_IN, a0)
    return `M ${x1} ${y1} A ${R_OUT} ${R_OUT} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${R_IN} ${R_IN} 0 0 0 ${x4} ${y4} Z`
  }

  function badgeFor(k: CircleKey): string {
    const n = k.accidentals.names.length
    if (k.accidentals.kind === 'none') return '–'
    return `${n}${k.accidentals.kind === 'sharps' ? '♯' : '♭'}`
  }

  const spoken = (n: string) => n.replace('#', ' sharp').replace('b', ' flat')

  function ariaFor(k: CircleKey): string {
    const major = k.enharmonic ? `${spoken(k.major)} or ${spoken(k.enharmonic)}` : spoken(k.major)
    const n = k.accidentals.names.length
    const acc =
      k.accidentals.kind === 'none'
        ? 'no sharps or flats'
        : `${n} ${k.accidentals.kind === 'sharps' ? 'sharp' : 'flat'}${n === 1 ? '' : 's'}`
    return `${major} major, relative minor ${spoken(k.minor)}, ${acc}`
  }

  const wedges = $derived.by(() =>
    CIRCLE_KEYS.map((key) => {
      const angle = key.index * 30 - 90
      return {
        key,
        path: wedgePath(key.index),
        majorPos: polar(R_MAJOR, angle),
        minorPos: polar(R_MINOR, angle),
        badgePos: polar(R_BADGE, angle),
        // The six-o'clock seam shows both spellings on both rings.
        majorLabel: key.enharmonic ? `${uni(key.major)}/${uni(key.enharmonic)}` : uni(key.major),
        minorLabel: key.enharmonic
          ? `${uni(key.minor).toLowerCase()}/${uni('Eb').toLowerCase()}`
          : uni(key.minor).toLowerCase(),
        badge: badgeFor(key),
        aria: ariaFor(key),
      }
    }),
  )

  const selectedKey = $derived(wedges.find((w) => w.key.major === selected))
</script>

<svg width={size} height={size} viewBox="0 0 420 420" role="group" aria-label="Circle of fifths">
  {#each wedges as w (w.key.major)}
    <path
      class="wedge"
      class:selected={w.key.major === selected}
      d={w.path}
      role="button"
      tabindex="0"
      aria-label={w.aria}
      aria-pressed={w.key.major === selected}
      onclick={() => onselect?.(w.key.major)}
      onkeydown={(e) => e.key === 'Enter' && onselect?.(w.key.major)}
    />
  {/each}
  {#each wedges as w (w.key.major)}
    <g class="labels" class:selected={w.key.major === selected}>
      <text class="major" x={w.majorPos[0]} y={w.majorPos[1]}>{w.majorLabel}</text>
      <text class="minor" x={w.minorPos[0]} y={w.minorPos[1]}>{w.minorLabel}</text>
      <text class="badge" x={w.badgePos[0]} y={w.badgePos[1]}>{w.badge}</text>
    </g>
  {/each}
  {#if selectedKey}
    <text class="center-major" x={C} y={C - 6}>{selectedKey.majorLabel}</text>
    <text class="center-badge" x={C} y={C + 18}>{selectedKey.badge === '–' ? 'no ♯/♭' : selectedKey.badge}</text>
  {/if}
</svg>

<style>
  svg {
    max-width: 100%;
    height: auto;
    display: block;
  }
  .wedge {
    fill: #ffffff;
    stroke: #cbd5e1;
    stroke-width: 1;
    cursor: pointer;
  }
  .wedge:hover {
    fill: #eff6ff;
  }
  .wedge:focus {
    outline: none;
  }
  .wedge:focus-visible {
    stroke: #3b82f6;
    stroke-width: 2;
  }
  .wedge.selected,
  .wedge.selected:hover {
    fill: #1d4ed8;
    stroke: #1d4ed8;
  }
  text {
    text-anchor: middle;
    dominant-baseline: middle;
    pointer-events: none;
    font-family: system-ui, sans-serif;
  }
  .major {
    font-size: 17px;
    font-weight: 700;
    fill: #1e293b;
  }
  .minor {
    font-size: 12px;
    fill: #64748b;
  }
  .badge {
    font-size: 10px;
    fill: #94a3b8;
  }
  .labels.selected .major,
  .labels.selected .minor,
  .labels.selected .badge {
    fill: #ffffff;
  }
  .labels.selected .minor,
  .labels.selected .badge {
    fill: #dbeafe;
  }
  .center-major {
    font-size: 24px;
    font-weight: 700;
    fill: #1d4ed8;
  }
  .center-badge {
    font-size: 13px;
    fill: #64748b;
  }
</style>
