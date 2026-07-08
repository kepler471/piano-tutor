<script lang="ts">
  import { Note } from 'tonal'
  import BackToGuide from '../components/BackToGuide.svelte'
  import CircleOfFifthsWheel from '../components/CircleOfFifthsWheel.svelte'
  import GlossText from '../components/GlossText.svelte'
  import SheetMusic from '../components/SheetMusic.svelte'
  import { buildHash } from '../lib/routing'
  import { CIRCLE_KEYS, neighborsOf, type CircleKey } from '../lib/theory/circle'
  import type { ScoreModel } from '../lib/notation/vexScore'
  import { SCOPE_PHRASES } from '../lib/voice/phrases'
  import { registerVoiceCommands } from '../lib/voice/voice.svelte'
  import { currentParams } from '../router.svelte'

  let selectedMajor = $state('C')

  // Deep link (#/circle?key=Gb): chroma-match so enharmonic spellings land.
  {
    const linked = currentParams().key
    if (linked) {
      const chroma = Note.chroma(linked)
      const match = CIRCLE_KEYS.find((k) => Note.chroma(k.major) === chroma)
      if (match) selectedMajor = match.major
    }
  }

  const key = $derived(CIRCLE_KEYS.find((k) => k.major === selectedMajor)!)
  const uni = (n: string) => n.replace('#', '♯').replace('b', '♭')

  const score = $derived<ScoreModel>({
    clef: 'treble',
    keySignature: key.major,
    events: [{ keys: [], duration: 'w', rest: true }],
  })

  function accPhrase(k: CircleKey): string {
    const n = k.accidentals.names.length
    if (k.accidentals.kind === 'none') return 'no sharps or flats'
    return `${n} ${k.accidentals.kind === 'sharps' ? 'sharp' : 'flat'}${n === 1 ? '' : 's'}`
  }

  const neighbours = $derived(neighborsOf(key.major))

  const detailProse = $derived.by(() => {
    const acc = key.accidentals
    const carries =
      acc.kind === 'none'
        ? `${uni(key.major)} major has no sharps or flats — all white keys.`
        : `${uni(key.major)} major carries ${accPhrase(key)} in its key signature: ${acc.names.join(', ')}.`
    const enh = key.enharmonic
      ? ` It can equally be written as ${uni(key.enharmonic)} major (six flats) — the same piano keys, spelled from the flat side.`
      : ''
    return (
      `${carries}${enh} Its relative minor is ${uni(key.minor)} minor — the same key signature with its tonic three semitones lower. ` +
      `On the circle it sits between ${uni(neighbours[0])} major and ${uni(neighbours[1])} major, each sharing six of its seven notes.`
    )
  })

  const chips = $derived([
    { label: `${uni(key.major)} major scale`, href: '#' + buildHash('/scales', { root: key.major, type: 'major' }) },
    {
      label: `${uni(key.minor)} minor scale`,
      href: '#' + buildHash('/scales', { root: key.minorScaleRoot, type: 'natural minor' }),
    },
    { label: 'Circle of fifths quiz', href: '#' + buildHash('/quizzes', { mode: 'circle-of-fifths', level: '1' }) },
    { label: 'Key signature quiz', href: '#' + buildHash('/quizzes', { mode: 'key-signature', level: '2' }) },
  ])

  const SECTIONS: { title: string; body: string }[] = [
    {
      title: 'Why fifths?',
      body:
        'Start on C major (no sharps or flats) and move to the key a perfect fifth up, G major: six of the seven notes stay the same and exactly one changes — F becomes F sharp. That holds for every clockwise step: up a fifth, add one sharp. Going anticlockwise mirrors it: down a fifth, add one flat. Arranged in a circle, the twelve major keys sort themselves from simplest key signature at the top to the most accidental-heavy at the bottom.',
    },
    {
      title: 'The order of sharps and flats',
      body:
        'Sharps always enter a key signature in the same fixed order: F, C, G, D, A, E, B — itself a chain of fifths. Two tricks fall out of this. The last sharp in a signature sits one semitone below the key name (three sharps end on G sharp, so the key is A major). Flats use the mirror order B, E, A, D, G, C, F, and the second-to-last flat names the key (three flats are B flat, E flat, A flat — the key is E flat major).',
    },
    {
      title: 'Relative minors: the inner ring',
      body:
        'Every major key shares its key signature with one minor key, the relative minor, whose tonic sits three semitones below. A major and F sharp minor both carry three sharps. The inner ring of the circle shows them: read outward for the major, inward for the minor with the same signature.',
    },
    {
      title: 'Modulation: neighbouring keys',
      body:
        'Because adjacent keys differ by a single accidental, they share six of their seven notes — which makes moving between them sound smooth. That is why so much music modulates to the dominant (one step clockwise) or the subdominant (one step anticlockwise), and why jazz progressions like ii–V–I walk root movements of falling fifths, anticlockwise around the circle.',
    },
    {
      title: 'The seam at six o\'clock',
      body:
        'At the bottom of the circle the sharp side meets the flat side. F sharp major (six sharps) and G flat major (six flats) are enharmonic — two spellings of the same piano keys. The same goes for their relative minors, D sharp minor and E flat minor. Composers pick whichever spelling is easier to read, which is why this app spells the key of six accidentals F sharp but its relative minor scale E flat minor.',
    },
  ]

  $effect(() =>
    registerVoiceCommands({
      name: 'Circle',
      phrases: SCOPE_PHRASES['Circle'],
      handle(intent) {
        // Bare keys ("e flat", "b major") select on the wheel; explicit
        // "…scale" utterances fall through so the dispatcher opens Scales.
        if (intent.kind === 'show-scale' && intent.root && !intent.explicit) {
          const chroma = Note.chroma(intent.root)
          const wantsMinor = intent.scaleType === 'natural minor' || intent.scaleType === 'harmonic minor'
          const match = wantsMinor
            ? CIRCLE_KEYS.find((k) => Note.chroma(k.minor) === chroma)
            : CIRCLE_KEYS.find((k) => Note.chroma(k.major) === chroma)
          if (!match) return { say: "I don't know that key." }
          selectedMajor = match.major
          const spoken = (n: string) => n.replace('#', ' sharp').replace('b', ' flat')
          return {
            say: wantsMinor
              ? `${spoken(match.minor)} minor — relative of ${spoken(match.major)} major, ${accPhrase(match)}.`
              : `${spoken(match.major)} major — ${accPhrase(match)}.`,
          }
        }
        return null
      },
    }),
  )
</script>

<section>
  <BackToGuide />
  <h1>Circle of Fifths</h1>
  <p class="hint">
    The map of the twelve keys: each clockwise step goes up a fifth and adds one sharp, each
    anticlockwise step adds one flat. Click a key — or say one — to explore it.
  </p>

  <div class="layout">
    <div class="wheel">
      <CircleOfFifthsWheel selected={selectedMajor} onselect={(m) => (selectedMajor = m)} />
    </div>

    <div class="card detail">
      <h2>
        {uni(key.major)}{key.enharmonic ? ` / ${uni(key.enharmonic)}` : ''} major
        <span class="rel">· {uni(key.minor).toLowerCase()} minor</span>
      </h2>
      <div class="staff">
        <SheetMusic {score} minWidth={240} />
      </div>
      <p class="prose"><GlossText text={detailProse} /></p>
      <div class="neighbour-row">
        <button class="chip-btn" onclick={() => (selectedMajor = neighbours[0])}>
          ← {uni(neighbours[0])} major
        </button>
        <span class="neighbour-label">neighbours</span>
        <button class="chip-btn" onclick={() => (selectedMajor = neighbours[1])}>
          {uni(neighbours[1])} major →
        </button>
      </div>
      <div class="chips">
        {#each chips as chip (chip.label)}
          <a class="chip" href={chip.href}>{chip.label}</a>
        {/each}
      </div>
    </div>
  </div>

  {#each SECTIONS as sec (sec.title)}
    <div class="theory">
      <h3>{sec.title}</h3>
      <p><GlossText text={sec.body} /></p>
    </div>
  {/each}
</section>

<style>
  .layout {
    display: flex;
    gap: 24px;
    align-items: flex-start;
    flex-wrap: wrap;
    margin-top: 16px;
  }
  .wheel {
    flex: 1 1 340px;
    max-width: 460px;
  }
  .detail {
    flex: 1 1 320px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .detail h2 {
    margin: 0;
    font-size: 22px;
  }
  .rel {
    font-size: 15px;
    font-weight: 500;
    color: #64748b;
  }
  .staff {
    max-width: 280px;
  }
  .prose {
    margin: 0;
    color: #334155;
    font-size: 14px;
    line-height: 1.6;
  }
  .neighbour-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .neighbour-label {
    font-size: 12px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .chip-btn {
    padding: 4px 10px;
    border: 1px solid #dbeafe;
    border-radius: 999px;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 13px;
    cursor: pointer;
  }
  .chip-btn:hover {
    background: #dbeafe;
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
  .theory {
    margin-top: 24px;
    max-width: 720px;
  }
  .theory h3 {
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #475569;
    margin: 0 0 8px;
  }
  .theory p {
    margin: 0;
    color: #334155;
    font-size: 14px;
    line-height: 1.6;
  }
</style>
