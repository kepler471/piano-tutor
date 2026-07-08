<script lang="ts">
  import { practiceHistory } from '../lib/practice/history.svelte'
  import { navigate } from '../router.svelte'

  const recent = $derived(practiceHistory.records.slice(0, 6))

  // One-time welcome for first-run users (a UI flag, not progress tracking).
  const WELCOMED_KEY = 'piano-tutor.welcomed'
  let welcomed = $state(localStorage.getItem(WELCOMED_KEY) === '1')

  function dismissWelcome(openGuide: boolean) {
    localStorage.setItem(WELCOMED_KEY, '1')
    welcomed = true
    if (openGuide) navigate('/guide')
  }

  const sections: { route: string; title: string; desc: string; highlight?: boolean }[] = [
    {
      route: '/guide',
      title: 'Learning Guide — start here',
      desc: 'New to the piano, or unsure what to practice next? A staged path from first notes to intermediate playing, using everything below.',
      highlight: true,
    },
    {
      route: '/scales',
      title: 'Scales',
      desc: 'All major and minor scales with sheet music and standard fingering, one octave up and down.',
    },
    {
      route: '/chords',
      title: 'Chords',
      desc: 'Triads and 7th chords in every key and inversion, with notation and fingering.',
    },
    {
      route: '/circle',
      title: 'Circle of Fifths',
      desc: 'The map of the twelve keys — key signatures, relative minors and why music modulates where it does, on an interactive wheel.',
    },
    {
      route: '/practice',
      title: 'Practice',
      desc: 'Guided beginner routines — five-finger positions, Hanon, scales, cadences and sight-reading — with live feedback from your piano.',
    },
    {
      route: '/quizzes',
      title: 'Quizzes',
      desc: 'Train your ear and your reading: intervals, chords, cadences and scales by ear; notes, key signatures and harmony on the page.',
    },
    {
      route: '/rhythm',
      title: 'Rhythm Trainer',
      desc: 'Tap rhythms against the metronome — from steady quarters to swing and jazz comping — with millisecond feedback.',
    },
    {
      route: '/songs',
      title: 'Songs',
      desc: 'Graded sheet music from Ode to Joy to the blues — the score waits for you. Import your own MusicXML or MIDI.',
    },
    {
      route: '/play',
      title: 'Free Play',
      desc: 'Play anything: the app listens through the microphone, lights up the keys you press, and writes what you play as sheet music.',
    },
    {
      route: '/tuner',
      title: 'Note Detector',
      desc: 'Single-note detector and tuner — check what the app hears and how it is calibrated.',
    },
  ]
</script>

<section>
  <h1>Piano Tutor</h1>
  <p class="hint">
    A practice companion for your piano. Plug in a MIDI keyboard for instant, accurate feedback —
    or use no gear at all and let it listen through your microphone.
  </p>

  {#if !welcomed}
    <div class="welcome">
      <h2>Welcome — here's how this works</h2>
      <ol>
        <li><strong>Sit at your piano.</strong> Any acoustic or electric piano works — no cables needed.</li>
        <li>
          <strong>The app listens through your microphone.</strong> When you press "Start listening" in a
          lesson, allow microphone access — everything runs on your device. Wrong notes flash red, and the
          score always waits for you. A MIDI keyboard also works and is even more accurate.
        </li>
        <li>
          <strong>Not sure where to start?</strong> The Learning Guide is a staged path from your first
          notes to intermediate playing.
        </li>
      </ol>
      <div class="welcome-actions">
        <button class="primary" onclick={() => dismissWelcome(true)}>Open the Learning Guide</button>
        <button class="ghost" onclick={() => dismissWelcome(false)}>Got it</button>
      </div>
    </div>
  {/if}
  <div class="grid">
    {#each sections as s (s.route)}
      <button class="tile" class:highlight={s.highlight} onclick={() => navigate(s.route)}>
        <h2>{s.title}</h2>
        <p>{s.desc}</p>
      </button>
    {/each}
  </div>

  {#if recent.length}
    <h2 class="recent-h">Recent practice</h2>
    {#if practiceHistory.today.length}
      <p class="hint">
        {practiceHistory.today.length} segment{practiceHistory.today.length === 1 ? '' : 's'} completed today — keep it up!
      </p>
    {/if}
    <ul class="recent">
      {#each recent as r (r.at)}
        <li>
          <strong>{r.title}</strong> · {r.segment} ·
          {#if r.score}
            {r.score.correct}/{r.score.total} correct{r.score.correct === r.score.total ? ' ✨' : ''}
          {:else}
            {r.mistakes === 0 ? 'flawless ✨' : `${r.mistakes} wrong note${r.mistakes === 1 ? '' : 's'}`}
          {/if}
          <span class="when">{new Date(r.at).toLocaleString()}</span>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .welcome {
    margin-top: 16px;
    padding: 18px 20px;
    border: 1px solid #93c5fd;
    border-radius: 12px;
    background: #eff6ff;
  }
  .welcome h2 {
    margin: 0 0 10px;
    font-size: 17px;
    color: #1d4ed8;
  }
  .welcome ol {
    margin: 0;
    padding-left: 20px;
    font-size: 14px;
    line-height: 1.6;
    color: #334155;
  }
  .welcome li + li {
    margin-top: 6px;
  }
  .welcome-actions {
    display: flex;
    gap: 10px;
    margin-top: 14px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
    margin-top: 20px;
  }
  .tile {
    text-align: left;
    padding: 20px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #fff;
    cursor: pointer;
    transition: box-shadow 0.15s;
  }
  .tile:hover {
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  }
  .tile.highlight {
    border-color: #93c5fd;
    background: #eff6ff;
  }
  .tile.highlight h2 {
    color: #1d4ed8;
  }
  .tile h2 {
    margin: 0 0 8px;
    font-size: 18px;
  }
  .tile p {
    margin: 0;
    color: #64748b;
    font-size: 14px;
    line-height: 1.45;
  }
  .recent-h {
    margin-top: 32px;
  }
  .recent {
    list-style: none;
    padding: 0;
    margin: 12px 0 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .recent li {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 14px;
  }
  .when {
    float: right;
    color: #94a3b8;
    font-size: 12px;
  }
</style>
