<script lang="ts">
  import SongPlayer from '../components/SongPlayer.svelte'
  import { SONG_CATALOG } from '../lib/data/songs/catalog'
  import type { Song } from '../lib/data/songs/types'
  import { parseMidiFile } from '../lib/songs/midiImport'
  import { parseMusicXml } from '../lib/songs/musicxml'
  import { addUserSong, removeUserSong, userSongs } from '../lib/songs/userSongs.svelte'

  let selected = $state<Song | null>(null)
  let importError = $state('')
  let fileInput: HTMLInputElement | undefined = $state()

  const grades = [1, 2, 3, 4] as const
  const byGrade = (g: number) => SONG_CATALOG.filter((s) => s.grade === g)

  const STYLE_ICONS: Record<Song['style'], string> = {
    classical: '🎼',
    folk: '🎶',
    jazz: '🎷',
    blues: '🎹',
  }

  async function onFilePicked(e: Event) {
    importError = ''
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    const id = `import-${file.name.replace(/\.[^.]+$/, '')}`
    try {
      let song: Song
      if (/\.(mid|midi)$/i.test(file.name)) {
        song = parseMidiFile(await file.arrayBuffer(), id)
        song.title = file.name.replace(/\.[^.]+$/, '')
      } else if (/\.(xml|musicxml)$/i.test(file.name)) {
        song = parseMusicXml(await file.text(), id)
      } else {
        throw new Error('Unsupported file type — use .mid, .midi, .xml or .musicxml.')
      }
      addUserSong(song)
      selected = song
    } catch (err) {
      importError = err instanceof Error ? err.message : String(err)
    } finally {
      input.value = ''
    }
  }
</script>

<section>
  <h1>Songs</h1>

  {#if selected}
    {#key selected.id}
      <SongPlayer song={selected} onexit={() => (selected = null)} />
    {/key}
  {:else}
    <p class="hint">
      Real pieces, graded easy to harder. The score waits for you — the orange note is always next.
      Practice hands separately, loop a section, then put it together.
    </p>

    {#each grades as grade (grade)}
      {@const songs = byGrade(grade)}
      {#if songs.length}
        <h2 class="grade-h">Grade {grade}</h2>
        <div class="song-grid">
          {#each songs as song (song.id)}
            <button class="song-tile" onclick={() => (selected = song)}>
              <strong>{STYLE_ICONS[song.style]} {song.title}</strong>
              <span>{song.composer} · {song.measures.length} bars{song.swing ? ' · swing' : ''}</span>
            </button>
          {/each}
        </div>
      {/if}
    {/each}

    <h2 class="grade-h">Your imports</h2>
    <p class="hint">
      Bring your own sheet music: MusicXML (from MuseScore & friends) or MIDI files. Simple scores
      work best — one piano part, up to two staves.
    </p>
    <p>
      <button class="primary" onclick={() => fileInput?.click()}>📄 Import MusicXML / MIDI</button>
      <input
        bind:this={fileInput}
        type="file"
        accept=".mid,.midi,.xml,.musicxml"
        style="display: none"
        onchange={onFilePicked}
      />
    </p>
    {#if importError}
      <p class="import-error">{importError}</p>
    {/if}
    {#if userSongs.all.length}
      <div class="song-grid">
        {#each userSongs.all as song (song.id)}
          <div class="song-tile imported">
            <button class="tile-main" onclick={() => (selected = song)}>
              <strong>{song.title}</strong>
              <span>{song.composer} · {song.measures.length} bars</span>
            </button>
            <button class="delete" title="Remove" onclick={() => removeUserSong(song.id)}>✕</button>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</section>

<style>
  .grade-h {
    margin-top: 24px;
  }
  .song-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 12px;
    margin-top: 10px;
  }
  .song-tile {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
    text-align: left;
    padding: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
    cursor: pointer;
    font-size: 14px;
  }
  .song-tile:hover {
    border-color: #1d4ed8;
  }
  .song-tile span {
    color: #64748b;
    font-size: 12px;
  }
  .song-tile.imported {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    cursor: default;
  }
  .tile-main {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
    text-align: left;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 14px;
    padding: 0;
    flex: 1;
  }
  .delete {
    border: none;
    background: none;
    color: #94a3b8;
    cursor: pointer;
    font-size: 14px;
    padding: 4px 8px;
  }
  .delete:hover {
    color: #dc2626;
  }
  .import-error {
    color: #b91c1c;
    font-size: 14px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    padding: 10px 14px;
  }
</style>
