/**
 * One-off dev tool: MIDI file(s) → catalog.ts tuple code.
 *
 *   npx vite-node scripts/midiToCatalog.ts <file.mid> [more.mid ...]
 *
 * Runs each file through the app's own parseMidiFile and prints a
 * `measures: [...]` block in the compact catalog encoding
 * ([midi, startBeat, durationBeats]), right hand first, left hand second.
 * Grade/style/sections/fingerings are hand-edited afterwards.
 */
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { parseMidiFile } from '../src/lib/songs/midiImport'

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100))

for (const file of process.argv.slice(2)) {
  const buffer = readFileSync(file)
  const song = parseMidiFile(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    basename(file, '.mid'),
  )
  console.log(`// --- ${basename(file)} · ${song.timeSignature[0]}/${song.timeSignature[1]} · ♩=${song.tempoBpm} · ${song.measures.length} bars`)
  console.log('measures: [')
  for (const measure of song.measures) {
    const tuple = (notes: typeof measure.notes) =>
      notes
        .sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi)
        .map((n) => `[${n.midi}, ${fmt(n.startBeat)}, ${fmt(n.durationBeats)}]`)
        .join(', ')
    const rh = measure.notes.filter((n) => n.hand === 'R')
    const lh = measure.notes.filter((n) => n.hand === 'L')
    console.log(`  bar([${tuple(rh)}], [${tuple(lh)}]),`)
  }
  console.log(']')
  console.log()
}
