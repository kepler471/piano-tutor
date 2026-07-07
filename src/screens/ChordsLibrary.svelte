<script lang="ts">
  import BackToGuide from '../components/BackToGuide.svelte'
  import { Chord, Note } from 'tonal'
  import GlossText from '../components/GlossText.svelte'
  import MicButton from '../components/MicButton.svelte'
  import PianoKeyboard from '../components/PianoKeyboard.svelte'
  import SheetMusic from '../components/SheetMusic.svelte'
  import { mic } from '../lib/audio/mic.svelte'
  import { startMonoDetection, stopMonoDetection } from '../lib/audio/monoPitch.svelte'
  import { onPolyEvent, startPolyDetection, stopPolyDetection } from '../lib/audio/polyPitch.svelte'
  import { playChord, playNote } from '../lib/audio/playback'
  import { chordFingering } from '../lib/data/chordFingerings'
  import { lookupTerm } from '../lib/data/glossary'
  import { scoreFromChord, scoreFromSteps, type ScoreModel } from '../lib/notation/vexScore'
  import { CHORD_QUALITIES, CHORD_ROOTS, getChord, inversionsFor } from '../lib/theory/chords'
  import { SHELL_QUALITIES, shellVoicing } from '../lib/theory/voicings'
  import type { ChordQualityId, Finger, Hand } from '../lib/theory/types'
  import { matchRoot } from '../lib/voice/parser'
  import { registerVoiceCommands } from '../lib/voice/voice.svelte'
  import { currentParams } from '../router.svelte'

  let root = $state('C')
  let quality: ChordQualityId = $state('major')
  let inversion = $state(0)
  let hand: Hand = $state('R')
  let playing = $state(false)

  // Deep link from the learning guide, read once at mount.
  {
    const params = currentParams()
    if (CHORD_QUALITIES.some((q) => q.id === params.quality)) quality = params.quality as ChordQualityId
    if (params.root && CHORD_ROOTS.includes(params.root)) root = params.root
  }

  const qualityDef = $derived(CHORD_QUALITIES.find((q) => q.id === quality)!)

  function selectQuality(id: ChordQualityId) {
    quality = id
    const size = CHORD_QUALITIES.find((q) => q.id === id)!.size
    if (inversion >= size) inversion = 0
  }

  // Shell voicings (LH root + 3rd or 7th) for qualities that have a 7th.
  type Voicing = 'full' | 'A' | 'B'
  let voicing = $state<Voicing>('full')
  const shellAvailable = $derived(SHELL_QUALITIES.includes(quality))
  const activeVoicing = $derived(shellAvailable ? voicing : 'full')

  const chord = $derived(getChord(root, quality, inversion))
  const fingering = $derived(chordFingering(qualityDef.size, inversion))
  const shell = $derived(activeVoicing === 'full' ? null : shellVoicing(root, quality, activeVoicing))

  const score = $derived.by(() => {
    if (!shell) return scoreFromChord(chord, hand, fingering)
    // Shells are a left-hand device; render them on the bass stave.
    return scoreFromSteps([{ midis: shell.midis, fingers: [5, 1], durationBeats: 4 }], 'C', 'bass') as ScoreModel
  })

  const handMidi = $derived(
    shell ? shell.midis : hand === 'R' ? chord.midi : chord.midi.map((m) => m - 12),
  )
  const expected = $derived(new Set(handMidi))
  const fingerMap = $derived.by(() => {
    const map = new Map<number, Finger>()
    const fingers: Finger[] = shell ? [5, 1] : hand === 'R' ? fingering.rh : fingering.lh
    handMidi.forEach((m, i) => map.set(m, fingers[i]))
    return map
  })

  const INV_LABELS = ['Root', '1st inv', '2nd inv', '3rd inv']

  // "Check my chord": collect chord-model onsets over a rolling window and
  // compare against the selected chord.
  let checkOnsets = $state<{ midi: number; t: number }[]>([])

  $effect(() => {
    return onPolyEvent((ev) => {
      if (ev.kind !== 'on') return
      checkOnsets = [...checkOnsets.filter((o) => ev.t - o.t < 1.2), { midi: ev.midi, t: ev.t }]
    })
  })

  const heardMidis = $derived([...new Set(checkOnsets.map((o) => o.midi))].sort((a, b) => a - b))
  const heardNames = $derived(heardMidis.map((m) => Note.fromMidi(m)))
  const heardChordNames = $derived(Chord.detect(heardNames))

  const verdict = $derived.by(() => {
    if (!heardMidis.length) return null
    const expectedSet = new Set(handMidi)
    const heardSet = new Set(heardMidis)
    const exact = handMidi.every((m) => heardSet.has(m)) && heardMidis.every((m) => expectedSet.has(m))
    if (exact) return { ok: true, text: `✓ That's ${chord.id}!` }
    const pcs = (ms: Iterable<number>) => new Set([...ms].map((m) => m % 12))
    const expPcs = pcs(handMidi)
    const heardPcs = pcs(heardMidis)
    if (expPcs.size === heardPcs.size && [...expPcs].every((p) => heardPcs.has(p)))
      return { ok: true, text: `✓ Right notes — just in a different octave.` }
    const missing = handMidi.filter((m) => !heardPcs.has(m % 12)).map((m) => Note.pitchClass(Note.fromMidi(m)))
    const extra = heardMidis.filter((m) => !expPcs.has(m % 12)).map((m) => Note.pitchClass(Note.fromMidi(m)))
    const parts: string[] = []
    if (missing.length) parts.push(`missing ${missing.join(', ')}`)
    if (extra.length) parts.push(`extra ${extra.join(', ')}`)
    return { ok: false, text: `Not quite — ${parts.join('; ')}.` }
  })

  async function play(arpeggiate: boolean) {
    if (playing) return
    playing = true
    try {
      await playChord(handMidi, { arpeggiate })
    } finally {
      playing = false
    }
  }

  function applyChordPick(pick: { root?: string; quality?: ChordQualityId; inversion?: number; hand?: Hand }) {
    const matched = pick.root ? matchRoot(pick.root, CHORD_ROOTS) : null
    if (pick.root && !matched) return { say: "I don't know that chord root." }
    if (pick.quality) selectQuality(pick.quality)
    if (matched) root = matched
    if (pick.inversion !== undefined) {
      if (pick.inversion >= qualityDef.size) return { say: `${quality} chords have no ${INV_LABELS[pick.inversion]}.` }
      inversion = pick.inversion
    }
    if (pick.hand) hand = pick.hand
    return { say: `${chord.id}.` }
  }

  $effect(() =>
    registerVoiceCommands({
      name: 'Chords',
      phrases: ['show me d minor seventh', 'first inversion', 'block / arpeggio', 'check my chord'],
      handle(intent) {
        if (intent.kind === 'show-chord') return applyChordPick(intent)
        if (intent.kind === 'show-scale' && !intent.explicit) {
          // Browsing chords, "show me d minor" means the chord.
          if (intent.scaleType === 'harmonic minor') return null // genuinely a scale — let it route
          return applyChordPick({
            root: intent.root,
            quality: intent.scaleType === 'natural minor' ? 'minor' : intent.scaleType ? 'major' : undefined,
            hand: intent.hand,
          })
        }
        if (intent.kind === 'set-inversion') return applyChordPick({ inversion: intent.inversion })
        if (intent.kind === 'set-hand') {
          hand = intent.hand
          return { say: intent.hand === 'L' ? 'Left hand.' : 'Right hand.' }
        }
        if (intent.kind === 'play-demo') {
          void play(intent.variant === 'arpeggio')
          return { say: '' }
        }
        if (intent.kind === 'mic' && intent.action === 'start') {
          void startMonoDetection().then(() => {
            if (mic.status === 'running') return startPolyDetection()
          })
          return { say: 'Listening — play the chord and hold it.' }
        }
        if (intent.kind === 'mic' && intent.action === 'stop') {
          stopPolyDetection()
          stopMonoDetection()
          return { say: 'Stopped.' }
        }
        return null
      },
    }),
  )
</script>

<section>
  <BackToGuide />
  <h1>Chords</h1>

  <div class="controls">
    <div class="control-group">
      <span class="control-label">Root</span>
      {#each CHORD_ROOTS as r (r)}
        <button class:active={root === r} onclick={() => (root = r)}>{r}</button>
      {/each}
    </div>
    <div class="control-group">
      <span class="control-label">Quality</span>
      {#each CHORD_QUALITIES as q (q.id)}
        <button
          class:active={quality === q.id}
          data-tip={lookupTerm(q.id)?.short}
          onclick={() => selectQuality(q.id)}
        >
          {lookupTerm(q.id)?.term ?? q.id}
        </button>
      {/each}
    </div>
    <div class="control-group">
      <span class="control-label">Inversion</span>
      {#each inversionsFor(quality) as inv (inv)}
        <button
          class:active={inversion === inv}
          data-tip={lookupTerm(inv === 0 ? 'root position' : 'inversion')?.short}
          onclick={() => (inversion = inv)}
        >
          {INV_LABELS[inv]}
        </button>
      {/each}
    </div>
    <div class="control-group">
      <span class="control-label">Hand</span>
      <button class:active={hand === 'R'} onclick={() => (hand = 'R')}>Right</button>
      <button class:active={hand === 'L'} onclick={() => (hand = 'L')}>Left</button>
    </div>
    {#if shellAvailable}
      <div class="control-group">
        <span class="control-label">Voicing</span>
        <button class:active={activeVoicing === 'full'} onclick={() => (voicing = 'full')}>Full chord</button>
        <button
          class:active={activeVoicing === 'A'}
          data-tip={lookupTerm('shell voicing')?.short}
          onclick={() => (voicing = 'A')}
        >
          Shell A (1+7)
        </button>
        <button
          class:active={activeVoicing === 'B'}
          data-tip={lookupTerm('shell voicing')?.short}
          onclick={() => (voicing = 'B')}
        >
          Shell B (1+3)
        </button>
      </div>
    {/if}
  </div>

  <div class="card">
    <div class="card-head">
      <h2>{shell ? shell.label : chord.id}</h2>
      <div>
        <button class="primary" onclick={() => play(false)} disabled={playing}>▶ Block</button>
        <button class="primary" onclick={() => play(true)} disabled={playing}>▶ Arpeggio</button>
      </div>
    </div>
    {#if shell}
      <p class="hint">
        <GlossText
          text={`Notes: ${shell.midis.map((m) => Note.pitchClass(Note.fromMidi(m))).join(' – ')} · Left hand, fingers 5 and 1. Jazz players sketch the harmony with just these two notes in a shell voicing — the other hand is free for melody.`}
        />
      </p>
    {:else}
      {#if lookupTerm(quality)}
        <p class="hint">{lookupTerm(quality)!.short}</p>
      {/if}
      <p class="hint">
        Notes: {chord.noteNames.map((n) => Note.pitchClass(n)).join(' – ')} · Fingers
        ({hand === 'R' ? 'right' : 'left'} hand, bottom to top):
        {(hand === 'R' ? fingering.rh : fingering.lh).join(' – ')}
      </p>
    {/if}
    <SheetMusic {score} />
    <PianoKeyboard
      from={shell ? 36 : hand === 'R' ? 55 : 43}
      to={shell ? 72 : hand === 'R' ? 89 : 77}
      expected={expected}
      fingers={fingerMap}
      onkeyclick={(m) => playNote(m)}
    />
  </div>

  <div class="card" style="margin-top: 16px">
    <div class="card-head">
      <h2>Check my chord</h2>
      <MicButton poly={true} />
    </div>
    <p class="hint">
      Start listening, then play <strong>{chord.id}</strong> on your piano and hold it. Chord
      detection runs about a second behind — give it a moment.
    </p>
    {#if mic.status === 'running'}
      {#if verdict}
        <p class="verdict" class:ok={verdict.ok}>{verdict.text}</p>
        <p class="hint">
          Heard: {heardNames.join(' ')}
          {#if heardChordNames.length}
            — looks like {heardChordNames[0]}{/if}
        </p>
      {:else}
        <p class="hint">Listening… play the chord.</p>
      {/if}
    {/if}
  </div>
</section>

<style>
  .verdict {
    margin: 0;
    font-weight: 600;
    color: #b45309;
  }
  .verdict.ok {
    color: #16a34a;
  }
</style>
