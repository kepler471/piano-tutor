# Piano Tutor

Browser-based piano learning app for a beginner with a non-MIDI electric piano. The app listens
through the microphone: fast monophonic pitch detection (pitchy/MPM) for instant feedback, and
polyphonic detection (Spotify Basic Pitch on TF.js WASM, in a Web Worker) for chords and
transcription. Fully voice-controllable (hands-free) via on-device Vosk speech recognition with
a "piano, …" wake word.

## Commands

- `npm run dev` — Vite dev server (port 5173, app at `/piano-tutor/` — see Deployment)
- `npm test` — vitest unit tests (`src/tests/`)
- `npm run check` — svelte-check + tsc
- `npm run build` — production build to `dist/` (static hosting, no server config needed)

## Deployment (GitHub Pages)

Deployed to **https://kepler471.github.io/piano-tutor/** by `.github/workflows/deploy.yml`
(check + test + build + deploy on every push to main). Because the site lives under the
`/piano-tutor/` subpath, Vite `base` is set unconditionally — dev and preview serve the same
path, so missed absolute URLs 404 in dev too. Rules this imposes:

- Never hard-code root-absolute `public/` asset URLs; go through `src/lib/assetUrl.ts`
  (works in module workers too — `import.meta.env.BASE_URL` is defined there).
- The workbox `urlPattern` functions in vite.config.ts are inlined into the generated SW via
  `.toString()` — they must stay closure-free (no captured variables), hence base-agnostic
  `url.pathname` matching instead of prefix anchors.

## Stack

Svelte 5 (runes) + TypeScript + Vite · `vexflow@5` (notation) · `tonal` (theory) · `pitchy`
(mono pitch) · `@spotify/basic-pitch` + `@tensorflow/tfjs-backend-wasm` (poly pitch) · `tone`
(playback: Salamander piano samples + metronome) · `vosk-browser` (voice commands, Kaldi WASM
in a worker — dynamically imported so the ~6 MB chunk loads only when voice is enabled) ·
`@huggingface/transformers` (MiniLM sentence embeddings for the voice-intent fallback, ONNX on
WASM — dynamically imported, fully offline against vendored model files).

⚠️ basic-pitch pins `@tensorflow/tfjs@3.x`. Do not install tfjs independently; keep
`tfjs-backend-wasm` at the same major/minor as `npm ls @tensorflow/tfjs` reports (3.21.0).

## Architecture

- `src/router.svelte.ts` — hand-rolled hash router; screens in `src/screens/`.
- `src/lib/theory/` — scales/chords computed via tonal (36 scales, 7 chord qualities × 12 roots ×
  inversions). All spellings computed; **fingerings are hand-authored** in `src/lib/data/`
  (standard ABRSM/Hanon charts) because they are pedagogical conventions, not derivable.
- `src/lib/notation/vexScore.ts` — the only file touching VexFlow. Builds `ScoreModel` from
  scales/chords/lesson steps/transcriptions; supports fingering annotations, rests, barlines,
  per-note highlight colors. `SheetMusic.svelte` re-renders fully on any change (scores are small).
- `src/lib/audio/`
  - `mic.svelte.ts` — getUserMedia with echoCancellation/noiseSuppression/autoGainControl **off**
    (voice processing destroys piano transients). Instead a 20 Hz high-pass BiquadFilterNode on
    the shared source kills DC offset and low rumble; all consumers tap `mic.output` (never the
    raw source).
  - `monoTracker.ts` — pure detection logic (pitchy + clarity threshold + 3-frame hysteresis to
    kill octave flicker + adaptive RMS gate: `noiseFloor.ts` tracks ambient level via a
    sliding-block minimum so steady hum/fans can't register as notes). Same code path runs live
    (`monoPitch.svelte.ts`, rAF + AnalyserNode) and in tests against synthesized audio
    (`src/tests/detection.test.ts`).
  - `basicPitch.worker.ts` — sliding-window inference (2 s window / 0.5 s hop) over a ring
    buffer; dedup by (midi, onset ±0.3 s); `polyFilter.ts` drops harmonic ghosts (amplitude
    floor 0.4 + octave/12th suppression — thresholds verified against synthetic chords).
  - `polyPitch.svelte.ts` — main-thread facade; streams mic audio via an AudioWorklet
    (`public/worklets/capture-processor.js` — served from public because addModule needs a real
    URL) resampled to 22050 Hz (`resample.ts`).
  - `playback.ts` sets `isPlaying` during demos; both detectors ignore the mic then (+300 ms
    tail) to avoid hearing the speakers. The metronome (`metronome.ts`) intentionally does NOT
    set it.
- `src/lib/voice/` — hands-free voice control.
  - `voice.svelte.ts` — singleton: taps the shared mic through the same capture worklet
    (resampled to 16 kHz), feeds a grammar-constrained Vosk `KaldiRecognizer`, and dispatches
    parsed intents. Persists enable state (`piano-tutor.voice-enabled`); drops audio chunks
    while `playback.isPlaying || tts.speaking` so it never hears the app itself.
  - `parser.ts` / `intents.ts` / `dispatcher.ts` — **pure** (vitest-covered). Wake word
    ("piano, …"), note/quality/number/lesson-name parsing, and a scope-stack dispatcher:
    screens register commands while mounted via `registerVoiceCommands` in an `$effect`;
    cross-screen commands ("show me D major" from Home) navigate and replay the intent when
    the target screen's scope registers (pending-intent, 10 s TTL). `buildGrammar()` generates
    the Kaldi word-list grammar (+`"[unk]"`) so piano notes/chatter decode as `[unk]` and are
    dropped before the wake-word check.
  - `convo.ts` — **pure** conversation state machine between parser and dispatcher (design
    follows the ACIxD VUI wiki, acixd.org — HTTP only, cert is broken for HTTPS): armed window
    after the wake word AND after every command (5 s one-step correction: "no, d minor" / bare
    "no" → "My mistake."), escalating no-match reprompts ("Sorry?" → two examples from the
    active scope → point at the HUD list, then give up until re-woken), and "…— right?"
    confirmation of uncertain fallback matches ("yes"/"no"). `describe.ts` renders intents as
    spoken paraphrases for those confirmations. Universal commands: "repeat" (re-speaks
    `tts.lastSpoken`; meta-prompts are excluded via `speak(text, {remember:false})`) and
    "go back" (`history.back()` — drill-downs are URL-backed).
  - `phrases.ts` — single registry of advertised example phrases per scope
    (`SCOPE_PHRASES`); screens import it, and `src/tests/voicePhrases.test.ts` enforces the
    mimicry invariant: every advertised phrase must parse AND be decodable under the grammar.
    Add new example phrases here, never inline in a screen.
  - Embedding fallback (Tier 1): when the regex parser yields `{kind:'unknown'}`,
    `voice.svelte.ts` embeds the transcript (MiniLM via `embedder.ts`, lazily preloaded on
    voice enable) and nearest-neighbor matches it against `intentBank.ts` — example phrasings
    per intent whose `resolve()` re-extracts slots from the actual transcript
    (`extractSlots` in parser.ts). `intentMatcher.ts` gates acceptance by similarity
    threshold + cross-template margin (calibrated by
    `src/tests/voiceEmbedding.integration.test.ts`, which runs the REAL model offline in node
    env — tune constants there, never by hand). All matching logic is pure
    (`intentBank`/`intentMatcher`/`fallback` — vitest-covered); scores in the uncertain band
    (`SUGGEST_THRESHOLD` ≤ score < accept gates) become a spoken "did you mean" confirmation
    via `convo.ts`; full misses get the escalating reprompts and are logged to
    `missLog.ts` (localStorage ring buffer, for tuning). Bank example words are auto-added to the Vosk grammar
    (invariant-tested), so keep examples to real English words the small model knows.
    Antonym-ish intents (faster/slower, arpeggio/block) share ONE template with the direction
    read from the transcript — separate templates sit too close in embedding space.
  - `tts.ts` — speechSynthesis confirmations; holds the playback audio gate while speaking so
    pitch detectors ignore the speakers. Feedback strings must never contain "piano".
  - `modelLoader.ts` — streams the model download with progress into the Cache API
    (`piano-tutor.vosk-model`), then hands vosk-browser a blob URL.
  - Mic lifecycle: voice holds the mic via `mic.acquire()`/`release()` (refcounted) so
    `stopMonoDetection()`'s `mic.stop()` can't tear down the stream while voice listens.
- `src/lib/input/` — unified note-input hub (`noteInput.svelte.ts`) over MIDI / mic-mono /
  mic-poly. Routing is pure (`routing.ts`): MIDI always wins; chord practice defaults to
  `mic-fused` — mono onsets grade instantly, poly fills in the rest of the chord, and the pure
  `MonoPolyFuser` (`fusion.ts`, unit-tested) drops poly re-reports of mono-graded notes
  (exact-midi, 2 s lag window). `settings.fusion` toggles back to poly-only.
- `src/lib/settings.svelte.ts` — persisted app settings (`piano-tutor.settings`): `a4` tuning
  reference (435–445; threaded through `frequencyToMidi`/`MonoTracker`, applied on detection
  start; the Tuner has an auto-calibrate flow; Basic Pitch stays at 440 by design), `fusion`,
  `defaultHand`. Surfaced in the Settings screen (`/settings`), which also shows the voice
  miss log (`voice/missLog.ts`) and offline status. Setters are no-ops when unchanged —
  screens write back from `$effect`s.
- `src/lib/practice/` — `matcher.ts` is a pure cursor matcher ("wait, don't fail": wrong notes
  flash but never advance); `history.svelte.ts` persists completions to localStorage (cap 500).
  `progress.svelte.ts` (level/streak, 3 clean runs → level up) backs sight-reading, quizzes
  (`quiz-${mode}`) and rhythm (`rhythm`). `stats.ts` (Home streak/week counts) and
  `guideProgress.ts` (maps guide links to the history `lessonId` formats each screen writes;
  integrity-tested) are pure. `timingGrader.ts` grades onsets against the beat grid — used by
  RhythmTrainer, LessonPlayer and SongPlayer (metronome on; suppressed on laggy `mic-poly`).
  `songPrefs.svelte.ts` persists per-song practice tempo; `songSteps.ts` also owns the
  `bars=3-6` URL-param helpers for arbitrary measure-range practice.
- `src/lib/data/lessons/` — practice content (five-finger, Hanon No. 1, scale routine incl.
  melodic minors, chromatic, contrary motion, arpeggios in all 24 keys, I–IV–V–I cadences
  (poly), jazz, generated sight-reading melodies).
- `src/lib/data/songs/` — graded repertoire: `catalog.ts` (hand-written arrangements, named
  midi constants) + `catalogImported.ts` (generated from public-domain Mutopia MIDI via
  `scripts/midiToCatalog.ts`, then curated: grades/sections/tempi are editorial). To add
  imported pieces: download the Mutopia .mid, run
  `npx vite-node scripts/midiToCatalog.ts file.mid`, paste + clamp/curate.
- `src/lib/data/guide.ts` — the learning guide: five curriculum stages whose deep links are
  integrity-tested against the lesson/song/quiz registries (`src/tests/guide.test.ts`).
  Deliberately static data — GuideScreen derives "practiced ✓" badges from history via
  `practice/guideProgress.ts`; never add tracking to the guide data itself.
- `src/lib/data/chordPath.ts` — the chord path (`/chord-path`): a 7-unit topic curriculum on
  chords (triads → inversions → diatonic/roman numerals → cadences → progressions → sevenths
  → accompaniment/lead sheets) that reuses the guide's types, `guideHref(link, source)` and
  badge machinery. Same rules as the guide (static, integrity-tested in
  `src/tests/chordPath.test.ts`) plus one more: `practice`/`check` links must be badge-able
  (lesson/quiz kinds); browse links belong in `theory[]`. Its drills live in
  `lessons/{triads,inversions,diatonic,progressions,sevenths,accompaniment}.ts`, generated
  via `theory/progressions.ts` (`diatonicTriad`, minimal-movement `closestInversion`);
  `METHOD_CHORD_UNIT` drives the Practice screen's "Chord path →" chips.
- `src/lib/quiz/` + `src/lib/theory/quiz.ts` + `src/lib/ear/quiz.ts` — pure quiz generators
  (11 modes) behind `/quizzes` (`/ear` is an alias route).
- `src/lib/transcribe/` — `cluster.ts` (Tier A: onsets → chords, no rhythm) and `quantize.ts`
  (Tier B: metronome-locked 8th-note grid with rests/barlines). Both pure and unit-tested.

## Static assets (public/)

- `model/` — Basic Pitch model, copied from `node_modules/@spotify/basic-pitch/model/`
- `tfjs-wasm/` — WASM binaries, copied from `node_modules/@tensorflow/tfjs-backend-wasm/dist/`
- `worklets/capture-processor.js` — AudioWorklet source (plain JS, no imports)
- `model-vosk/vosk-model-small-en-us-0.15.tar.gz` — Vosk speech model (~41 MB, from
  https://ccoreilly.github.io/vosk-browser/models/; version kept in the filename so immutable
  caching is safe)
- `model-minilm/Xenova/all-MiniLM-L6-v2/` — quantized MiniLM embedding model (~23 MB:
  config.json, tokenizer.json, tokenizer_config.json, onnx/model_quantized.onnx) from
  https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/…
- `ort-wasm/` — onnxruntime WASM runtime (plain + .asyncify pairs), copied from
  `node_modules/onnxruntime-web/dist/`. Prod loads these; dev serves them from node_modules
  instead because Vite refuses to `import()` modules out of public/ (see `embedder.ts`).

Re-copy these after upgrading the corresponding packages.

## PWA / offline (vite-plugin-pwa in vite.config.ts)

Installable, offline-capable (prod only; the dev SW is disabled because dev serves ort-wasm
from node_modules). Precache = app shell only; `globIgnores` keeps every model/WASM dir (and
the ~6 MB lazy vosk JS chunk) out of it. Runtime CacheFirst routes: hashed `/assets/`,
same-origin `/model|tfjs-wasm|ort-wasm|worklets/` (cache `piano-tutor.sw-static-<hash>` —
the name embeds a build-time content hash of those dirs, so re-copying them re-versions the
cache automatically; outdated generations are deleted at startup by
`src/lib/swCacheCleanup.ts`), and the Salamander sample host so demos play offline. Deliberately NO route for `model-vosk/` (modelLoader.ts
already Cache-API-caches it with a progress bar; an SW route would double-store 41 MB) or
`model-minilm/` (transformers.js self-caches).

## Conventions

- Svelte 5 runes everywhere; shared reactive singletons are `.svelte.ts` modules exporting an
  object with getters (see `mic.svelte.ts`).
- Detection logic must stay pure/portable (no DOM/audio types in `monoTracker.ts`,
  `polyFilter.ts`, `cluster.ts`, `quantize.ts`, `matcher.ts`) so vitest covers it without a
  browser.
- Audio-detection changes should extend the synthesized-audio tests in
  `src/tests/detection.test.ts` rather than relying on manual mic testing.
