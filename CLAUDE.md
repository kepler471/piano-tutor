# Piano Tutor

Browser-based piano learning app for a beginner with a non-MIDI electric piano. The app listens
through the microphone: fast monophonic pitch detection (pitchy/MPM) for instant feedback, and
polyphonic detection (Spotify Basic Pitch on TF.js WASM, in a Web Worker) for chords and
transcription.

## Commands

- `npm run dev` — Vite dev server (port 5173)
- `npm test` — vitest unit tests (`src/tests/`)
- `npm run check` — svelte-check + tsc
- `npm run build` — production build to `dist/` (static hosting, no server config needed)

## Stack

Svelte 5 (runes) + TypeScript + Vite · `vexflow@5` (notation) · `tonal` (theory) · `pitchy`
(mono pitch) · `@spotify/basic-pitch` + `@tensorflow/tfjs-backend-wasm` (poly pitch) · `tone`
(playback: Salamander piano samples + metronome).

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
    (voice processing destroys piano transients).
  - `monoTracker.ts` — pure detection logic (pitchy + clarity threshold + 3-frame hysteresis to
    kill octave flicker). Same code path runs live (`monoPitch.svelte.ts`, rAF + AnalyserNode)
    and in tests against synthesized audio (`src/tests/detection.test.ts`).
  - `basicPitch.worker.ts` — sliding-window inference (2 s window / 0.5 s hop) over a ring
    buffer; dedup by (midi, onset ±0.3 s); `polyFilter.ts` drops harmonic ghosts (amplitude
    floor 0.4 + octave/12th suppression — thresholds verified against synthetic chords).
  - `polyPitch.svelte.ts` — main-thread facade; streams mic audio via an AudioWorklet
    (`public/worklets/capture-processor.js` — served from public because addModule needs a real
    URL) resampled to 22050 Hz (`resample.ts`).
  - `playback.ts` sets `isPlaying` during demos; both detectors ignore the mic then (+300 ms
    tail) to avoid hearing the speakers. The metronome (`metronome.ts`) intentionally does NOT
    set it.
- `src/lib/practice/` — `matcher.ts` is a pure cursor matcher ("wait, don't fail": wrong notes
  flash but never advance); `history.svelte.ts` persists completions to localStorage.
- `src/lib/data/lessons/` — practice content (five-finger, Hanon No. 1, scale routine, I–IV–V–I
  cadences (poly), generated sight-reading melodies).
- `src/lib/transcribe/` — `cluster.ts` (Tier A: onsets → chords, no rhythm) and `quantize.ts`
  (Tier B: metronome-locked 8th-note grid with rests/barlines). Both pure and unit-tested.

## Static assets (public/)

- `model/` — Basic Pitch model, copied from `node_modules/@spotify/basic-pitch/model/`
- `tfjs-wasm/` — WASM binaries, copied from `node_modules/@tensorflow/tfjs-backend-wasm/dist/`
- `worklets/capture-processor.js` — AudioWorklet source (plain JS, no imports)

Re-copy these after upgrading the corresponding packages.

## Conventions

- Svelte 5 runes everywhere; shared reactive singletons are `.svelte.ts` modules exporting an
  object with getters (see `mic.svelte.ts`).
- Detection logic must stay pure/portable (no DOM/audio types in `monoTracker.ts`,
  `polyFilter.ts`, `cluster.ts`, `quantize.ts`, `matcher.ts`) so vitest covers it without a
  browser.
- Audio-detection changes should extend the synthesized-audio tests in
  `src/tests/detection.test.ts` rather than relying on manual mic testing.
