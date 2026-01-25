<script lang="ts">
  import { onDestroy } from 'svelte';

  export let src = '/assets/music/boom-bap-sample.mp3';
  export let title = 'Boom Bap 90–2000';

  let audioEl: HTMLAudioElement | null = null;
  let isPlaying = false;
  let current = 0;
  let duration = 0;
  let raf: number | null = null;

  function fmt(sec: number) {
    if (!Number.isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function tick() {
    raf = null;
    if (!audioEl) return;
    current = audioEl.currentTime;
    duration = audioEl.duration || 0;
    if (isPlaying) raf = requestAnimationFrame(tick);
  }

  function playPause() {
    if (!audioEl) return;

    if (audioEl.paused) {
      audioEl.play();
      isPlaying = true;
      if (raf == null) raf = requestAnimationFrame(tick);
    } else {
      audioEl.pause();
      isPlaying = false;
      if (raf != null) cancelAnimationFrame(raf);
      raf = null;
    }
  }

  function seek(e: Event) {
    if (!audioEl) return;
    const t = e.target as HTMLInputElement;
    const v = Number(t.value);
    audioEl.currentTime = v;
    current = v;
  }

  function onEnded() {
    isPlaying = false;
    if (raf != null) cancelAnimationFrame(raf);
    raf = null;
  }

  onDestroy(() => {
    if (raf != null) cancelAnimationFrame(raf);
  });
</script>

<div class="relative z-10 w-full">
  <div class="mb-2 flex items-end gap-3">
    <div class="font-display text-xl tracking-wide">Hip-Hop</div>
    <div class="font-hand text-lg text-[color:var(--muted)]">cassette player</div>
    <div class="ml-auto text-xs font-black uppercase tracking-wide text-[color:var(--acid-yellow)]">{fmt(current)} / {fmt(duration)}</div>
  </div>

  <div class="brutal-border relative bg-[color:var(--acid-yellow)] p-4 text-black">
    <div class="absolute inset-0 opacity-15 bg-graffiti" aria-hidden="true"></div>

    <div class="relative grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <div class="text-lg font-black uppercase tracking-widest">{title}</div>
        <div class="mt-1 font-hand text-lg">Tape-loops, poussière, boom & bap.</div>
      </div>

      <button
        type="button"
        class="brutal-border-red inline-flex items-center justify-center bg-black px-5 py-3 text-sm font-black uppercase tracking-widest text-white"
        aria-label={isPlaying ? 'Mettre en pause' : 'Lire'}
        on:click={playPause}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>

      <div class="md:col-span-2">
        <input
          class="w-full"
          type="range"
          min="0"
          max={duration || 0}
          step="0.01"
          value={current}
          aria-label="Position de lecture"
          on:input={seek}
        />
        <div class="mt-2 text-xs font-black uppercase tracking-widest">
          Astuce : remplace {src} par tes propres extraits.
        </div>
      </div>
    </div>

    <audio
      bind:this={audioEl}
      src={src}
      preload="metadata"
      on:ended={onEnded}
      on:loadedmetadata={() => (duration = audioEl?.duration || 0)}
    />

    <div class="cassette" aria-hidden="true">
      <div class="reel left"></div>
      <div class="reel right"></div>
    </div>
  </div>
</div>

<style>
  input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    height: 8px;
    background: rgba(0, 0, 0, 0.25);
    outline: none;
  }

  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    background: #ff0000;
    border: 2px solid #000;
    box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.35);
    cursor: pointer;
  }

  .cassette {
    position: absolute;
    right: 18px;
    top: 18px;
    width: 120px;
    height: 64px;
    border: 2px solid #000;
    background: rgba(255, 255, 255, 0.35);
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.22);
  }

  .reel {
    position: absolute;
    top: 12px;
    width: 38px;
    height: 38px;
    border-radius: 999px;
    border: 2px solid #000;
    background: rgba(0, 0, 0, 0.12);
  }

  .reel.left {
    left: 12px;
  }

  .reel.right {
    right: 12px;
  }
</style>
