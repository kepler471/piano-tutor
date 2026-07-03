<script lang="ts">
  import { Note } from 'tonal'
  import PianoKeyboard from '../components/PianoKeyboard.svelte'
  import SheetMusic from '../components/SheetMusic.svelte'
  import { playNote, playSequence } from '../lib/audio/playback'
  import { scaleFingerings } from '../lib/data/scaleFingerings'
  import { scoreFromScale } from '../lib/notation/vexScore'
  import { SCALE_TYPES, getScale } from '../lib/theory/scales'
  import type { Finger, Hand, ScaleTypeId } from '../lib/theory/types'

  let typeId: ScaleTypeId = $state('major')
  let root = $state('C')
  let hand: Hand = $state('R')
  let playing = $state(false)

  const typeDef = $derived(SCALE_TYPES.find((t) => t.id === typeId)!)

  function selectType(id: ScaleTypeId) {
    typeId = id
    const roots = SCALE_TYPES.find((t) => t.id === id)!.roots
    if (!roots.includes(root)) root = roots[0]
  }

  const scale = $derived(getScale(root, typeId))
  const fingering = $derived(scaleFingerings[scale.id])
  const score = $derived(scoreFromScale(scale, hand, fingering))

  const handMidi = $derived(hand === 'R' ? scale.midi : scale.midi.map((m) => m - 12))
  const expected = $derived(new Set(handMidi))
  const fingerMap = $derived.by(() => {
    const map = new Map<number, Finger>()
    const fingers = hand === 'R' ? fingering.rh : fingering.lh
    handMidi.forEach((m, i) => map.set(m, fingers[i]))
    return map
  })

  async function play() {
    if (playing) return
    playing = true
    try {
      const upDown = [...handMidi, ...handMidi.slice(0, -1).reverse()]
      await playSequence(upDown, 92)
    } finally {
      playing = false
    }
  }
</script>

<section>
  <h1>Scales</h1>

  <div class="controls">
    <div class="control-group">
      <span class="control-label">Type</span>
      {#each SCALE_TYPES as t (t.id)}
        <button class:active={typeId === t.id} onclick={() => selectType(t.id)}>{t.id}</button>
      {/each}
    </div>
    <div class="control-group">
      <span class="control-label">Key</span>
      {#each typeDef.roots as r (r)}
        <button class:active={root === r} onclick={() => (root = r)}>{r}</button>
      {/each}
    </div>
    <div class="control-group">
      <span class="control-label">Hand</span>
      <button class:active={hand === 'R'} onclick={() => (hand = 'R')}>Right</button>
      <button class:active={hand === 'L'} onclick={() => (hand = 'L')}>Left</button>
    </div>
  </div>

  <div class="card">
    <div class="card-head">
      <h2>{scale.id}</h2>
      <button class="primary" onclick={play} disabled={playing}>
        {playing ? 'Playing…' : '▶ Play'}
      </button>
    </div>
    <p class="hint">
      Notes: {scale.notes.join(' – ')} · Fingering shown {hand === 'R' ? 'above' : 'below'} the staff
      ({hand === 'R' ? 'right' : 'left'} hand, one octave up and down)
    </p>
    <SheetMusic {score} />
    <PianoKeyboard
      from={hand === 'R' ? 55 : 43}
      to={hand === 'R' ? 84 : 72}
      expected={expected}
      fingers={fingerMap}
      onkeyclick={(m) => playNote(m)}
    />
    <p class="hint">
      Green keys are the scale ({scale.notes.join(' ')}); numbers show
      which finger plays each key on the way up. Thumb crossings happen after finger 3 (and after
      finger 4 in some keys).
    </p>
  </div>
</section>
