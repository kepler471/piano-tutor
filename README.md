# 🎹 Piano Tutor

A piano practice companion that runs in your browser and **listens to your playing through the
microphone** — no MIDI cable needed. Built for beginners learning on an acoustic or electric
piano.

Play a note and watch it light up on the on-screen keyboard. Play a scale and the app follows
you note by note, checking your fingering. Play a chord and it tells you what you played — and
what you missed.

![Scales screen: C major with sheet music, fingering, and keyboard](docs/screenshots/scales.png)

## Features

### 📚 Reference library

- **All 36 scales** — major, natural minor, and harmonic minor in every key — with sheet music,
  correct key signatures, and standard fingering (ABRSM/Hanon convention) for each hand, shown
  on both the staff and the keyboard.
- **Every common chord** — major, minor, diminished, augmented triads and dominant/major/minor
  7ths, in all 12 roots and every inversion — with notation and fingering.
- Everything is **playable**: hear any scale or chord on a sampled grand piano (block or
  arpeggiated).

### 🎤 Listening (the fun part)

- **Instant note detection** for melodies and scales — keys light up as you play, and the Note
  Detector screen doubles as a tuner (note name, frequency, cents offset).
- **Chord detection** via [Spotify's Basic Pitch](https://github.com/spotify/basic-pitch)
  neural network, running entirely in your browser (no audio ever leaves your machine). About a
  second behind real time — perfect for "did I play that chord right?".
- **Check my chord**: pick any chord in the library, play it, and get told exactly which chord
  tones were missing or extra.

![Chords screen: C7 first inversion with fingering and keyboard](docs/screenshots/chords.png)

### ✍️ Transcription

- **Free Play** writes everything you play onto a staff as you play it, and names the chords it
  recognizes.
- **Record with metronome**: one bar of count-in, play in time, and your playing is quantized
  into real notation — quarter and eighth notes, rests, and barlines.

### 🏋️ Guided practice

Classic beginner methods with live feedback — the next note is highlighted, the target key and
finger are shown in green, wrong notes flash red but the lesson patiently waits ("wait, don't
fail"):

- **Five-finger positions** in C, G, and F
- **Hanon No. 1** (the famous finger-independence exercise, first 8 bars)
- **Scale routine** with correct thumb crossings
- **I–IV–V–I cadence drills** — chord progressions with hand-friendly voicings (uses chord
  detection)
- **Sight-reading** — randomly generated melodies you've never seen, new one every time

Completed segments are saved to a local practice history on the Home screen.

![Lesson player: Hanon No. 1 with the next note highlighted](docs/screenshots/lesson.png)

## Getting started

```bash
npm install
npm run dev        # → http://localhost:5173
```

Then:

1. Allow **microphone access** when prompted (audio is processed locally, never uploaded).
2. Put your phone/laptop mic reasonably close to the piano.
3. Start with **Practice → Five-finger position in C**.

Playback uses piano samples fetched from the network on first use; everything else works
offline once loaded.

### Tips for good detection

- Play **one note at a time** in melody mode; switch to **Chords** mode (Free Play) or chord
  lessons for polyphonic playing.
- **No sustain pedal** during lessons — overlapping decays smear detection.
- If detection seems off, open **Note Detector** and play single notes to see exactly what the
  app hears.

## Commands

| Command         | What it does                                  |
| --------------- | --------------------------------------------- |
| `npm run dev`   | Dev server with hot reload                    |
| `npm test`      | Unit tests (theory, fingering, detection, quantization) |
| `npm run check` | Type checking (svelte-check + tsc)            |
| `npm run build` | Production build to `dist/` — deployable to any static host |

## How it works

| Concern          | Approach |
| ---------------- | -------- |
| Melody detection | [pitchy](https://github.com/ianprime0509/pitchy) (McLeod pitch method) polled from the mic ~60×/s, with clarity thresholds and hysteresis to suppress octave flicker from piano harmonics |
| Chord detection  | Basic Pitch CNN on TensorFlow.js (WASM backend) in a Web Worker — sliding 2 s window every 0.5 s over a ring buffer, with de-duplication and harmonic-ghost filtering |
| Sheet music      | [VexFlow](https://vexflow.com/) — scores built programmatically with fingering annotations, rests, barlines, and live per-note highlighting |
| Music theory     | [tonal](https://github.com/tonaljs/tonal) computes all scale/chord spellings; fingerings are hand-authored data (they're pedagogy, not math) |
| Playback         | [Tone.js](https://tonejs.github.io/) sampler with Salamander grand piano samples |

The mic is opened with browser voice-processing (echo cancellation, noise suppression, auto
gain) **disabled** — those filters are built for speech and destroy piano transients.

Detection logic is pure TypeScript with no browser dependencies, so the test suite runs
synthesized piano tones through the exact same code path the microphone feeds — the C major
scale test literally plays a scale into the detector and asserts every note.

## Browser support

Any evergreen browser. Safari note: audio can only start from a click, so everything is gated
behind the "Start listening" button. No special server headers are required — the build is
plain static files.

## Roadmap ideas

- Two-octave scale fingerings and arpeggio lessons
- MusicXML export of transcriptions
- A4 calibration and adjustable detection thresholds
- Grand-staff (both hands) lesson rendering
