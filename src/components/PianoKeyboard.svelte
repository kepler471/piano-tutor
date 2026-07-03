<script lang="ts">
  import { Note } from 'tonal'
  import type { Finger } from '../lib/theory/types'

  let {
    from = 48, // C3
    to = 84, // C6
    pressed = new Set<number>(),
    expected = new Set<number>(),
    wrong = new Set<number>(),
    fingers = new Map<number, Finger>(),
    onkeyclick,
  }: {
    from?: number
    to?: number
    pressed?: Set<number>
    expected?: Set<number>
    wrong?: Set<number>
    fingers?: Map<number, Finger>
    onkeyclick?: (midi: number) => void
  } = $props()

  const WHITE_W = 26
  const WHITE_H = 118
  const BLACK_W = 15
  const BLACK_H = 72
  const BLACK_PCS = new Set([1, 3, 6, 8, 10])

  interface Key {
    midi: number
    black: boolean
    x: number
    label?: string
  }

  const keys = $derived.by(() => {
    const out: Key[] = []
    let whiteCount = 0
    for (let midi = from; midi <= to; midi++) {
      const pc = midi % 12
      if (BLACK_PCS.has(pc)) {
        out.push({ midi, black: true, x: whiteCount * WHITE_W - BLACK_W / 2 })
      } else {
        out.push({
          midi,
          black: false,
          x: whiteCount * WHITE_W,
          label: pc === 0 ? Note.fromMidi(midi) : undefined,
        })
        whiteCount++
      }
    }
    return out
  })

  const totalWidth = $derived(keys.filter((k) => !k.black).length * WHITE_W)

  function fillFor(k: Key): string {
    if (wrong.has(k.midi)) return '#dc2626'
    if (pressed.has(k.midi)) return '#3b82f6'
    if (expected.has(k.midi)) return k.black ? '#15803d' : '#bbf7d0'
    return k.black ? '#1f2937' : '#ffffff'
  }
</script>

<div class="kb-scroll">
  <svg
    width={totalWidth}
    height={WHITE_H}
    viewBox="0 0 {totalWidth} {WHITE_H}"
    role="group"
    aria-label="Piano keyboard"
  >
    {#each keys.filter((k) => !k.black) as k (k.midi)}
      <rect
        x={k.x}
        y="0"
        width={WHITE_W}
        height={WHITE_H}
        fill={fillFor(k)}
        stroke="#94a3b8"
        stroke-width="1"
        rx="2"
        role="button"
        tabindex="0"
        aria-label={Note.fromMidi(k.midi)}
        onclick={() => onkeyclick?.(k.midi)}
        onkeydown={(e) => e.key === 'Enter' && onkeyclick?.(k.midi)}
      />
      {#if fingers.has(k.midi)}
        <text x={k.x + WHITE_W / 2} y={WHITE_H - 26} text-anchor="middle" class="finger">
          {fingers.get(k.midi)}
        </text>
      {/if}
      {#if k.label}
        <text x={k.x + WHITE_W / 2} y={WHITE_H - 8} text-anchor="middle" class="label">
          {k.label}
        </text>
      {/if}
    {/each}
    {#each keys.filter((k) => k.black) as k (k.midi)}
      <rect
        x={k.x}
        y="0"
        width={BLACK_W}
        height={BLACK_H}
        fill={fillFor(k)}
        stroke="#0f172a"
        stroke-width="1"
        rx="2"
        role="button"
        tabindex="0"
        aria-label={Note.fromMidi(k.midi)}
        onclick={() => onkeyclick?.(k.midi)}
        onkeydown={(e) => e.key === 'Enter' && onkeyclick?.(k.midi)}
      />
      {#if fingers.has(k.midi)}
        <text x={k.x + BLACK_W / 2} y={BLACK_H - 8} text-anchor="middle" class="finger black-finger">
          {fingers.get(k.midi)}
        </text>
      {/if}
    {/each}
  </svg>
</div>

<style>
  .kb-scroll {
    overflow-x: auto;
    padding: 4px 0;
  }
  svg rect {
    cursor: pointer;
  }
  .finger {
    font: 600 12px system-ui, sans-serif;
    fill: #374151;
    pointer-events: none;
  }
  .black-finger {
    fill: #f9fafb;
  }
  .label {
    font: 10px system-ui, sans-serif;
    fill: #94a3b8;
    pointer-events: none;
  }
</style>
