<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import gsap from 'gsap';

  type Track = { id: string; title: string; src: string };

  const musicSrc = (filename: string) => `/assets/music/${encodeURIComponent(filename)}`;

  const DEFAULT_TRACKS: Track[] = [
    { id: '01', title: "Ain't No Half-Steppin — Big Daddy Kane", src: musicSrc("Aint No Half-Steppin - Big Daddy Kane.mp3") },
    { id: '02', title: 'Brand Nu Day', src: musicSrc('Brand Nu Day.mp3') },
    { id: '03', title: 'Check the Rhime — A Tribe Called Quest', src: musicSrc('Check the Rhime - A Tribe Called Quest.mp3') },
    { id: '04', title: 'GO! — Common', src: musicSrc('GO! - Common.mp3') },
    { id: '05', title: 'Grown Man Sport — Pete Rock', src: musicSrc('Grown Man Sport - Pete Rock.mp3') },
    { id: '06', title: 'In Due Time', src: musicSrc('In Due Time.mp3') },
    { id: '07', title: 'Make You Feel That Way — Blackalicious', src: musicSrc('Make You Feel That Way - Blackalicious.mp3') },
    { id: '08', title: 'One Love — Nas ft. Q-Tip', src: musicSrc('One Love  - Nas ft. Q-Tip.mp3') },
    { id: '09', title: 'San Francisco Knights — People Under The Stairs', src: musicSrc('San Francisco Knights - People Under The Stairs.mp3') },
    { id: '10', title: 'Thuggish Ruggish Bone — Bone Thugs-n-Harmony', src: musicSrc('Thuggish Ruggish Bone - Bone Thugs-n-Harmony.mp3') },
    { id: '11', title: 'Trying People', src: musicSrc('Trying People.mp3') },
    { id: '12', title: 'Usual Suspect (Stretch Armstrong Remix) — Big Noyd', src: musicSrc('Usual Suspect (Stretch Armstrong Remix) - Big Noyd.mp3') },
    { id: '13', title: 'What They Do — The Roots', src: musicSrc('What They Do - The Roots.mp3') },
  ];

  export let title = 'BOOM BAP DECK';
  export let tracks: Track[] = DEFAULT_TRACKS;

  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  let currentIndex = 0;
  $: currentTrack = tracks[currentIndex] ?? tracks[0];

  let inserted = true;
  let isPlaying = false;
  let current = 0;
  let duration = 0;
  let volume = 0.9;
  let errorMsg: string | null = null;

  let hostEl: HTMLDivElement | null = null;
  let stageEl: HTMLDivElement | null = null;
  let deckEl: HTMLDivElement | null = null;
  let faceFrontEl: HTMLDivElement | null = null;
  let cassetteEl: HTMLDivElement | null = null;
  let cassetteSolidEl: HTMLDivElement | null = null;
  let cassetteBtnEl: HTMLButtonElement | null = null;
  let doorEl: HTMLDivElement | null = null;
  let reelL: HTMLDivElement | null = null;
  let reelR: HTMLDivElement | null = null;
  let speakerL: HTMLDivElement | null = null;
  let speakerR: HTMLDivElement | null = null;
  let speakerConeL: HTMLDivElement | null = null;
  let speakerConeR: HTMLDivElement | null = null;
  let speakerRingL: HTMLDivElement | null = null;
  let speakerRingR: HTMLDivElement | null = null;
  let ledEl: HTMLDivElement | null = null;
  let reflectEl: HTMLDivElement | null = null;
  let progressEl: HTMLButtonElement | null = null;
  let volEl: HTMLButtonElement | null = null;

  let pageVibeEl: HTMLElement | null = null;

  let audioEl: HTMLAudioElement | null = null;
  let ctx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let srcNode: MediaElementAudioSourceNode | null = null;
  let freq: Uint8Array | null = null;
  let raf: number | null = null;

  // Beat tracking (simple + punchy)
  let energy = 0;
  let energySm = 0;
  let peak = 0;
  let peakSm = 0;
  let lastBeatAt = 0;
  let beatFlash = 0;

  const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

  function fmt(sec: number) {
    if (!Number.isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function ensureAudioGraph() {
    if (!isBrowser) return;
    if (!audioEl) return;

    if (!ctx) {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (!analyser) {
      analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.72;
      freq = new Uint8Array(analyser.frequencyBinCount);
    }

    if (!srcNode) {
      srcNode = ctx.createMediaElementSource(audioEl);
      srcNode.connect(analyser);
      analyser.connect(ctx.destination);
    }
  }

  function teardownAudioGraph() {
    try {
      srcNode?.disconnect();
    } catch {
      // ignore
    }
    try {
      analyser?.disconnect();
    } catch {
      // ignore
    }

    srcNode = null;
    analyser = null;
    freq = null;
  }

  function setTrack(i: number) {
    const n = tracks.length;
    if (!n) return;
    currentIndex = ((i % n) + n) % n;
    errorMsg = null;
    current = 0;
    duration = 0;

    if (audioEl) {
      const tr = tracks[currentIndex];
      audioEl.src = tr?.src ?? '';
      audioEl.load();
    }
  }

  function resumeAndPlay() {
    if (!inserted) return;
    if (!audioEl) return;

    errorMsg = null;
    ensureAudioGraph();
    ctx?.resume?.();
    audioEl
      .play()
      .then(() => {
        // ok
      })
      .catch((e) => {
        errorMsg = `Impossible de lire (interaction requise / fichier manquant) (${String(e)}).`;
      });
  }

  function togglePlay() {
    if (!inserted) return;
    if (!audioEl) return;
    if (isPlaying) {
      audioEl.pause();
      return;
    }
    resumeAndPlay();
  }

  const VOL_STEPS = [0.35, 0.6, 0.85, 1] as const;
  let volStepIdx = 2;
  function cycleVolume(dir: 1 | -1 = 1) {
    const n = VOL_STEPS.length;
    volStepIdx = ((volStepIdx + dir) % n + n) % n;
    volume = VOL_STEPS[volStepIdx];
    if (audioEl) audioEl.volume = volume;
  }

  function onProgressPointer(e: PointerEvent) {
    if (!audioEl) return;
    if (!Number.isFinite(duration) || duration <= 0) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const t = clamp((e.clientX - r.left) / r.width, 0, 1);
    audioEl.currentTime = t * duration;
    current = audioEl.currentTime;
  }

  function pulseBeat() {
    if (!isBrowser) return;
    if (!deckEl || !speakerL || !speakerR || !ledEl) return;
    if (!speakerConeL || !speakerConeR || !speakerRingL || !speakerRingR) return;

    gsap.killTweensOf([speakerConeL, speakerConeR, speakerRingL, speakerRingR, deckEl, ledEl]);

    // Bounce should be the "circles" (cone/ring), not the rectangular speaker frame.
    gsap.to([speakerConeL, speakerConeR], {
      scale: 1.085,
      duration: 0.075,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
      transformOrigin: '50% 50%',
    });
    gsap.to([speakerRingL, speakerRingR], {
      scale: 1.045,
      duration: 0.075,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
      transformOrigin: '50% 50%',
    });
    gsap.to(deckEl, {
      x: 'random(-2,2)',
      y: 'random(-2,2)',
      rotateZ: 'random(-0.35,0.35)',
      duration: 0.06,
      ease: 'none',
      yoyo: true,
      repeat: 1,
    });
    gsap.to(ledEl, {
      opacity: 1,
      duration: 0.06,
      ease: 'none',
      yoyo: true,
      repeat: 1,
    });

    // Whole-page vibe (performance-friendly): shake only the main content wrapper.
    if (pageVibeEl) {
      gsap.killTweensOf(pageVibeEl);
      gsap.to(pageVibeEl, {
        x: 'random(-5,5)',
        y: 'random(-4,4)',
        rotateZ: 'random(-0.18,0.18)',
        duration: 0.07,
        ease: 'none',
        yoyo: true,
        repeat: 1,
      });
    }
  }

  function animateFrame(ts: number) {
    raf = null;

    // time
    if (audioEl) {
      current = audioEl.currentTime || 0;
      duration = audioEl.duration || 0;
    }

    // spectrum -> energy
    if (analyser && freq) {
      analyser.getByteFrequencyData(freq);

      const bassBins = Math.min(18, freq.length);
      let bass = 0;
      for (let i = 0; i < bassBins; i++) bass += freq[i];
      bass /= bassBins * 255;

      const midStart = Math.min(20, freq.length - 1);
      const midEnd = Math.min(midStart + 40, freq.length);
      let mid = 0;
      for (let i = midStart; i < midEnd; i++) mid += freq[i];
      mid /= Math.max(1, midEnd - midStart) * 255;

      energy = clamp(bass * 0.75 + mid * 0.35, 0, 1);
    } else {
      // fallback if analyser not ready
      energy = isPlaying ? (0.2 + 0.8 * Math.abs(Math.sin(ts / 180))) : 0;
    }

    // smooth energy + peak
    energySm = energySm * 0.82 + energy * 0.18;
    peak = Math.max(peak * 0.92, energy);
    peakSm = peakSm * 0.9 + peak * 0.1;

    // Beat detection: transient above adaptive threshold
    const now = ts;
    const threshold = clamp(0.18 + peakSm * 0.38, 0.22, 0.62);
    const canBeat = now - lastBeatAt > 140;
    const isBeat = canBeat && energySm > threshold && energy > energySm + 0.06;

    if (isBeat) {
      lastBeatAt = now;
      beatFlash = 1;
      pulseBeat();
    } else {
      beatFlash = beatFlash * 0.86;
    }

    // Continuous vibe
    if (deckEl && faceFrontEl) {
      faceFrontEl.style.setProperty('--e', String(energySm));
      faceFrontEl.style.setProperty('--bf', String(beatFlash));
    }

    // Note: no continuous page-level CSS updates (keeps /hiphop snappy).
    if (reelL && reelR && isPlaying) {
      const rot = (ts / 9) * (0.7 + energySm);
      reelL.style.transform = `rotate(${rot}deg)`;
      reelR.style.transform = `rotate(${-rot}deg)`;
    }

    if (isPlaying) raf = requestAnimationFrame(animateFrame);
  }

  function playPause() {
    togglePlay();
  }

  function stop() {
    if (!audioEl) return;
    audioEl.pause();
    audioEl.currentTime = 0;
    current = 0;
  }

  function prev() {
    setTrack(currentIndex - 1);
    if (isPlaying) {
      resumeAndPlay();
    }
  }

  function next() {
    setTrack(currentIndex + 1);
    if (isPlaying) {
      resumeAndPlay();
    }
  }

  function seek(e: Event) {
    if (!audioEl) return;
    const t = e.target as HTMLInputElement;
    const v = Number(t.value);
    audioEl.currentTime = v;
    current = audioEl.currentTime;
  }

  function setVol(e: Event) {
    const t = e.target as HTMLInputElement;
    const v = Number(t.value);
    volume = Math.max(0, Math.min(1, v));
    if (audioEl) audioEl.volume = volume;
  }

  function toggleCassette() {
    inserted = !inserted;

    if (!cassetteEl || !cassetteBtnEl) return;
    if (!isBrowser) return;
    if (!inserted) stop();

    gsap.killTweensOf([cassetteEl, doorEl, cassetteBtnEl]);
    if (inserted) {
      gsap.to(doorEl, { rotateX: 0, duration: 0.22, ease: 'power2.out' });
      gsap.to(cassetteEl, { y: 0, z: 0, duration: 0.28, ease: 'power3.out' });
      gsap.to(cassetteBtnEl, { rotateZ: 0, duration: 0.2, ease: 'power2.out' });
    } else {
      gsap.to(doorEl, { rotateX: 58, duration: 0.22, ease: 'power2.out' });
      gsap.to(cassetteEl, { y: -34, z: 44, duration: 0.28, ease: 'power3.out' });
      gsap.to(cassetteBtnEl, { rotateZ: -2, duration: 0.2, ease: 'power2.out' });
    }
  }

  function onDeckMove(e: PointerEvent) {
    if (!stageEl || !reflectEl) return;
    const r = stageEl.getBoundingClientRect();
    const x = clamp((e.clientX - r.left) / r.width, 0, 1);
    const y = clamp((e.clientY - r.top) / r.height, 0, 1);
    reflectEl.style.setProperty('--rx', `${(x * 100).toFixed(2)}%`);
    reflectEl.style.setProperty('--ry', `${(y * 100).toFixed(2)}%`);

    // Shared lighting coordinates for CSS shading
    stageEl.style.setProperty('--lx', String(x));
    stageEl.style.setProperty('--ly', String(y));
    stageEl.style.setProperty('--rx', `${(x * 100).toFixed(2)}%`);
    stageEl.style.setProperty('--ry', `${(y * 100).toFixed(2)}%`);

    // Extra tilt for the cassette volume itself (separate from insert/eject transform)
    if (cassetteSolidEl) {
      const rx = (0.5 - y) * 16;
      const ry = (x - 0.5) * 22;
      gsap.to(cassetteSolidEl, { rotateX: rx, rotateY: ry, duration: 0.22, ease: 'power2.out' });
    }
  }

  onMount(() => {
    if (!isBrowser) return;

    pageVibeEl = document.getElementById('hiphopVibe');

    audioEl = new Audio();
    audioEl.preload = 'metadata';
    audioEl.crossOrigin = 'anonymous';
    audioEl.volume = volume;
    audioEl.addEventListener('play', () => {
      isPlaying = true;
      ensureAudioGraph();
      if (raf == null) raf = requestAnimationFrame(animateFrame);
    });
    audioEl.addEventListener('pause', () => {
      isPlaying = false;
      if (raf != null) cancelAnimationFrame(raf);
      raf = null;
    });
    audioEl.addEventListener('ended', () => {
      isPlaying = false;
      next();
    });
    audioEl.addEventListener('error', () => {
      errorMsg = 'Audio introuvable ou bloqué.';
      isPlaying = false;
    });

    // Ensure volume step matches initial
    volStepIdx = Math.max(0, VOL_STEPS.findIndex((v) => Math.abs(v - volume) < 0.01));
    if (volStepIdx < 0) volStepIdx = 2;
    audioEl.volume = volume;

    setTrack(0);

    if (cassetteSolidEl) {
      gsap.set(cassetteSolidEl, { rotateX: 8, rotateY: -12, transformOrigin: '50% 50%' });
    }

    // Idle float
    if (deckEl) {
      gsap.to(deckEl, {
        y: -6,
        duration: 2.6,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });
    }

    // Mouse tilt (stage only)
    const host = stageEl;
    if (host && deckEl) {
      const onMove = (e: PointerEvent) => {
        const r = host.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const rx = (0.5 - py) * 10;
        const ry = (px - 0.5) * 14;
        gsap.to(deckEl, { rotateX: rx, rotateY: ry, duration: 0.22, ease: 'power2.out' });
      };
      host.addEventListener('pointermove', onMove, { passive: true });
      onDestroy(() => host.removeEventListener('pointermove', onMove));
    }

    if (host) {
      host.addEventListener('pointermove', onDeckMove, { passive: true });
      onDestroy(() => host.removeEventListener('pointermove', onDeckMove));
    }
  });

  onDestroy(() => {
    if (raf != null) cancelAnimationFrame(raf);
    raf = null;
    try {
      audioEl?.pause();
    } catch {
      // ignore
    }
    audioEl = null;

    pageVibeEl = null;

    teardownAudioGraph();
    try {
      ctx?.close?.();
    } catch {
      // ignore
    }
    ctx = null;
  });
</script>

<div bind:this={hostEl} class="deck-host relative">
  <div class="mb-3 flex items-end gap-3">
    <div class="font-display text-xl tracking-wide">{title}</div>
    <div class="font-hand text-lg text-[color:var(--muted)]">13 sons • bounce au beat</div>
    <div class="ml-auto text-xs font-black uppercase tracking-wide text-[color:var(--acid-yellow)]">
      {fmt(current)} / {fmt(duration)}
    </div>
  </div>

  <div class="grid gap-5">
    <div class="relative">
      <div bind:this={stageEl} class="stage brutal-border relative overflow-hidden bg-black/55 p-4">
        <div class="pointer-events-none absolute inset-0 deck-ink" aria-hidden="true"></div>
        <div bind:this={reflectEl} class="deck-reflect" aria-hidden="true"></div>

        <div class="relative">
          <div class="mb-4 brutal-border bg-black/55 p-3">
            <div class="flex items-start gap-3">
              <div class="min-w-0">
                <div class="truncate text-sm font-black uppercase tracking-widest text-[color:var(--acid-yellow)]">
                  {currentTrack?.title ?? '—'}
                </div>
              </div>
              <div class="ml-auto flex items-center gap-2">
                <div class="led" bind:this={ledEl} aria-hidden="true"></div>
                <div class="text-xs font-black uppercase tracking-widest">{isPlaying ? 'PLAY' : 'IDLE'}</div>
              </div>
            </div>
          </div>

          {#if errorMsg}
            <div class="mt-4 brutal-border-red bg-black/55 p-3 text-xs font-black uppercase tracking-widest">
              {errorMsg}
            </div>
          {/if}

          <div class="mt-5 perspective">
            <div bind:this={deckEl} class="deck" aria-label="Boombox">
              <div class="deck__shadow" aria-hidden="true"></div>
              <div class="deck__body">
                <div class="deck__top" aria-hidden="true"></div>
                <div bind:this={faceFrontEl} class="deck__front">
                  <div class="brand">
                    <div class="brand__big">H</div>
                    <div class="brand__micro">///</div>
                  </div>

                  <div class="speakers">
                    <div class="speaker" bind:this={speakerL} aria-hidden="true">
                      <div class="speaker__cone" bind:this={speakerConeL}></div>
                      <div class="speaker__ring" bind:this={speakerRingL}></div>
                    </div>

                    <div class="center">
                      <div class="bay brutal-border">
                        <div class="bay__head">
                          <div class="bay__label">TAPE BAY</div>
                          <button
                            bind:this={cassetteBtnEl}
                            type="button"
                            class="bay__btn brutal-border-red"
                            on:click={toggleCassette}
                            aria-label={inserted ? 'Éjecter la cassette' : 'Insérer la cassette'}
                            title=""
                          >
                            <span class="bay__glyph" aria-hidden="true"></span>
                          </button>
                        </div>

                        <div class="bay__slot" aria-hidden="true">
                          <div class="bay__door" bind:this={doorEl}></div>
                          <div class="cassette" bind:this={cassetteEl} aria-hidden="true">
                            <div class="cassette__solid" bind:this={cassetteSolidEl}>
                              <div class="cassette__face cassette__face--front">
                              <div class="cassette__tag">A/B</div>
                              <button
                                type="button"
                                class="cassette__titleBtn"
                                on:click={playPause}
                                disabled={!inserted}
                                aria-label={isPlaying ? 'Pause' : 'Play'}
                              >
                                BOOM BAP TAPE
                              </button>

                              <div class="cassette__controls">
                                <button
                                  type="button"
                                  class="cbtn"
                                  on:click={prev}
                                  disabled={!inserted}
                                  aria-label="Piste précédente"
                                >
                                  <span class="g prev" aria-hidden="true"></span>
                                </button>
                                <button
                                  type="button"
                                  class="cbtn cbtn--main"
                                  on:click={playPause}
                                  disabled={!inserted}
                                  aria-label={isPlaying ? 'Pause' : 'Play'}
                                >
                                  <span class={`g ${isPlaying ? 'pause' : 'play'}`} aria-hidden="true"></span>
                                </button>
                                <button
                                  type="button"
                                  class="cbtn"
                                  on:click={next}
                                  disabled={!inserted}
                                  aria-label="Piste suivante"
                                >
                                  <span class="g next" aria-hidden="true"></span>
                                </button>
                                <button
                                  type="button"
                                  class="cbtn"
                                  on:click={stop}
                                  disabled={!inserted}
                                  aria-label="Stop"
                                >
                                  <span class="g stop" aria-hidden="true"></span>
                                </button>

                                <button
                                  bind:this={volEl}
                                  type="button"
                                  class="cbtn cbtn--knob"
                                  on:click={() => cycleVolume(1)}
                                  on:contextmenu={(e) => {
                                    e.preventDefault();
                                    cycleVolume(-1);
                                  }}
                                  disabled={!inserted}
                                  aria-label="Volume"
                                  title=""
                                >
                                  <span class="knob" aria-hidden="true"></span>
                                  <span class="knobTick" aria-hidden="true" style={`--k:${volume}`}></span>
                                </button>
                              </div>

                              <button
                                bind:this={progressEl}
                                type="button"
                                class="cassette__progress"
                                on:pointerdown={onProgressPointer}
                                disabled={!inserted}
                                aria-label="Avancer / reculer"
                                title=""
                              >
                                <span class="cassette__progFill" aria-hidden="true" style={`--p:${duration ? (current / duration) : 0}`}></span>
                              </button>

                              <div class="cassette__window">
                                <div class="cassette__reel left" bind:this={reelL}></div>
                                <div class="cassette__reel right" bind:this={reelR}></div>
                              </div>
                              </div>

                              <div class="cassette__face cassette__face--back" aria-hidden="true"></div>
                              <div class="cassette__side cassette__side--top" aria-hidden="true"></div>
                              <div class="cassette__side cassette__side--bottom" aria-hidden="true"></div>
                              <div class="cassette__side cassette__side--left" aria-hidden="true"></div>
                              <div class="cassette__side cassette__side--right" aria-hidden="true"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div class="meters brutal-border" aria-hidden="true">
                        <div class="meter"><span></span></div>
                        <div class="meter"><span></span></div>
                        <div class="meter"><span></span></div>
                        <div class="meter"><span></span></div>
                        <div class="meter"><span></span></div>
                        <div class="meter"><span></span></div>
                      </div>
                    </div>

                    <div class="speaker" bind:this={speakerR} aria-hidden="true">
                      <div class="speaker__cone" bind:this={speakerConeR}></div>
                      <div class="speaker__ring" bind:this={speakerRingR}></div>
                    </div>
                  </div>

                </div>

                <div class="deck__back" aria-hidden="true"></div>
                <div class="deck__side deck__side--left" aria-hidden="true"></div>
                <div class="deck__side deck__side--right" aria-hidden="true"></div>
                <div class="deck__side deck__side--top" aria-hidden="true"></div>
                <div class="deck__side deck__side--bottom" aria-hidden="true"></div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>

  <div class="tracknote brutal-border" aria-label="Tracklist">
    <div class="tracknote__pin" aria-hidden="true"></div>
    <div class="tracknote__title">TRACKLIST</div>
    <div class="tracknote__list">
      {#each tracks as t, i (t.id)}
        <button
          type="button"
          class={`tracknote__item ${i === currentIndex ? 'is-active' : ''}`}
          on:click={() => {
            setTrack(i);
            resumeAndPlay();
          }}
          disabled={!inserted}
          aria-label={`Choisir ${t.title}`}
          title=""
        >
          <span class="tracknote__num">{String(i + 1).padStart(2, '0')}</span>
          <span class="tracknote__txt">{t.title}</span>
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .deck-host {
    color: var(--fg);
  }

  .stage {
    --e: 0;
    --bf: 0;
  }

  .deck-ink {
    background:
      radial-gradient(circle at 20% 10%, rgba(255, 59, 212, 0.12), transparent 55%),
      radial-gradient(circle at 78% 24%, rgba(0, 209, 255, 0.10), transparent 55%),
      radial-gradient(circle at 40% 88%, rgba(255, 230, 0, 0.10), transparent 60%),
      repeating-linear-gradient(90deg, rgba(246, 246, 246, 0.04) 0 1px, transparent 1px 120px);
    filter: saturate(1.15) contrast(1.05);
  }

  .deck-reflect {
    position: absolute;
    inset: 0;
    pointer-events: none;
    mix-blend-mode: screen;
    opacity: 0.72;
    background:
      radial-gradient(circle 220px at var(--rx, 52%) var(--ry, 30%), rgba(246, 246, 246, 0.10), transparent 60%),
      radial-gradient(circle 140px at var(--rx, 52%) var(--ry, 30%), rgba(255, 230, 0, 0.12), transparent 62%),
      radial-gradient(circle 90px at var(--rx, 52%) var(--ry, 30%), rgba(0, 209, 255, 0.10), transparent 68%);
    filter: saturate(1.15) contrast(1.05);
  }

  .perspective {
    perspective: 1100px;
  }

  .deck {
    position: relative;
    transform-style: preserve-3d;
    transform: rotateX(10deg) rotateY(-10deg);
    will-change: transform;
  }

  .deck__shadow {
    position: absolute;
    left: 7%;
    right: 7%;
    top: 82%;
    height: 20%;
    background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.8), transparent 70%);
    transform: translateZ(-1px);
    filter: blur(10px);
    opacity: 0.8;
  }

  .deck__body {
    --dd: 44px; /* depth */
    --dg: 1.25px; /* tiny face gap (stylistic) */
    position: relative;
    border: 2px solid var(--fg);
    box-shadow: 10px 10px 0 0 rgba(246, 246, 246, 0.12);
    background:
      linear-gradient(180deg, rgba(246, 246, 246, 0.06), rgba(0, 0, 0, 0.25)),
      radial-gradient(circle at 12% 10%, rgba(255, 230, 0, 0.12), transparent 55%),
      radial-gradient(circle at 70% 88%, rgba(255, 0, 0, 0.08), transparent 60%);
    transform-style: preserve-3d;
  }

  .deck__top {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 22px;
    transform: translateZ(calc(var(--dd) / 2 + var(--dg)));
    background: rgba(0, 0, 0, 0.35);
    border-bottom: 2px solid rgba(246, 246, 246, 0.22);
  }

  .deck__front {
    position: relative;
    padding: 18px;
    transform: translateZ(calc(var(--dd) / 2 + var(--dg)));
  }

  .deck__back {
    position: absolute;
    inset: 0;
    transform: rotateY(180deg) translateZ(calc(var(--dd) / 2 + var(--dg)));
    background:
      linear-gradient(180deg, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.55)),
      radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.06), transparent 60%);
    border: 2px solid rgba(246, 246, 246, 0.18);
    opacity: 0.9;
    pointer-events: none;
  }

  .deck__front::before {
    content: '';
    position: absolute;
    inset: -2px;
    border: 2px solid rgba(255, 0, 0, 0.22);
    mix-blend-mode: screen;
    opacity: calc(0.25 + var(--bf) * 0.65);
    pointer-events: none;
  }

  .deck__front::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 18% 18%, rgba(0, 209, 255, 0.11), transparent 55%),
      radial-gradient(circle at 70% 40%, rgba(255, 59, 212, 0.10), transparent 55%),
      radial-gradient(circle at 50% 90%, rgba(255, 230, 0, 0.10), transparent 65%);
    opacity: calc(0.22 + var(--e) * 0.55);
    mix-blend-mode: screen;
    pointer-events: none;
  }

  .deck__side {
    position: absolute;
    background: rgba(0, 0, 0, 0.55);
    border: 2px solid var(--fg);
    opacity: 0.85;
    pointer-events: none;
  }

  .deck__side--left {
    top: 0;
    bottom: 0;
    width: var(--dd);
    left: 0;
    transform-origin: left;
    transform: rotateY(-90deg) translateZ(calc(var(--dd) / 2 - var(--dg)));
  }

  .deck__side--right {
    top: 0;
    bottom: 0;
    width: var(--dd);
    right: 0;
    transform-origin: right;
    transform: rotateY(90deg) translateZ(calc(var(--dd) / 2 - var(--dg)));
  }

  .deck__side--top {
    left: 0;
    right: 0;
    height: var(--dd);
    top: 0;
    transform-origin: top;
    transform: rotateX(90deg) translateZ(calc(var(--dd) / 2 - var(--dg)));
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(0, 0, 0, 0.45));
  }

  .deck__side--bottom {
    left: 0;
    right: 0;
    height: var(--dd);
    bottom: 0;
    transform-origin: bottom;
    transform: rotateX(-90deg) translateZ(calc(var(--dd) / 2 - var(--dg)));
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.55), rgba(255, 255, 255, 0.04));
  }

  .brand {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 14px;
  }

  .brand__big {
    font-weight: 900;
    font-size: 38px;
    letter-spacing: 0.06em;
    color: var(--acid-yellow);
    text-shadow:
      2px 0 0 rgba(255, 59, 212, 0.55),
      -2px 0 0 rgba(0, 209, 255, 0.45);
  }

  .brand__micro {
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--fg);
    opacity: 0.85;
  }

  .speakers {
    display: grid;
    gap: 14px;
    grid-template-columns: 1fr 1.1fr 1fr;
    align-items: center;
  }

  .speaker {
    --sd: 16px;
    position: relative;
    aspect-ratio: 1/1;
    border: 2px solid var(--fg);
    background:
      radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.4) 0 45%, rgba(255, 230, 0, 0.06) 46% 60%, rgba(0, 0, 0, 0.65) 61%),
      repeating-radial-gradient(circle at 50% 50%, rgba(246, 246, 246, 0.05) 0 2px, transparent 2px 10px);
    box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.35);
    transform: translateZ(10px);
    transform-style: preserve-3d;
    will-change: transform;
  }

  /* Speaker depth (side/back face) */
  .speaker::before {
    content: '';
    position: absolute;
    inset: -2px;
    transform: translateZ(calc(-1 * var(--sd)));
    background:
      linear-gradient(180deg, rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0.25)),
      repeating-linear-gradient(90deg, rgba(246, 246, 246, 0.04) 0 1px, transparent 1px 7px);
    border: 2px solid rgba(246, 246, 246, 0.16);
    opacity: 0.9;
    pointer-events: none;
  }

  /* Metallic bezel highlight that follows cursor */
  .speaker::after {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 8px;
    background:
      radial-gradient(circle 140px at var(--rx, 52%) var(--ry, 30%), rgba(255, 255, 255, 0.22), transparent 62%),
      linear-gradient(135deg, rgba(255, 255, 255, 0.10), rgba(0, 0, 0, 0.18));
    mix-blend-mode: screen;
    opacity: calc(0.12 + var(--e) * 0.18);
    pointer-events: none;
    transform: translateZ(1px);
  }

  .speaker__cone {
    position: absolute;
    inset: 14%;
    border: 2px solid rgba(246, 246, 246, 0.38);
    border-radius: 999px;
    background:
      radial-gradient(circle at 50% 50%, rgba(255, 59, 212, 0.10), transparent 55%),
      radial-gradient(circle at 50% 50%, rgba(0, 209, 255, 0.10), transparent 62%),
      radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.65));
    transform: translateZ(6px);
  }

  .speaker__ring {
    position: absolute;
    inset: 6%;
    border-radius: 999px;
    border: 2px solid rgba(255, 255, 255, 0.22);
    opacity: 0.95;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.10), rgba(0, 0, 0, 0.22)),
      radial-gradient(circle 110px at var(--rx, 52%) var(--ry, 30%), rgba(255, 230, 0, 0.12), transparent 62%);
    box-shadow:
      0 0 0 2px rgba(0, 0, 0, 0.25) inset,
      0 0 0 1px rgba(255, 255, 255, 0.12);
    mix-blend-mode: screen;
    transform: translateZ(12px);
  }

  .center {
    display: grid;
    gap: 12px;
  }

  .bay {
    background: rgba(0, 0, 0, 0.55);
    padding: 10px;
    transform: translateZ(10px);
  }

  .bay__head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  .bay__label {
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .bay__btn {
    margin-left: auto;
    padding: 8px 10px;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    background: rgba(0, 0, 0, 0.65);
    color: var(--fg);
    position: relative;
    overflow: hidden;
  }

  .bay__btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle 90px at var(--rx, 52%) var(--ry, 30%), rgba(255, 255, 255, 0.26), transparent 68%),
      linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(0, 0, 0, 0.22));
    mix-blend-mode: screen;
    opacity: 0.55;
    pointer-events: none;
  }

  .bay__glyph {
    display: inline-block;
    width: 14px;
    height: 14px;
    border-left: 2px solid rgba(246, 246, 246, 0.9);
    border-bottom: 2px solid rgba(246, 246, 246, 0.9);
    transform: rotate(45deg);
  }

  .bay__slot {
    position: relative;
    height: 124px;
    border: 2px solid rgba(246, 246, 246, 0.24);
    background:
      linear-gradient(180deg, rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.25)),
      repeating-linear-gradient(90deg, rgba(246, 246, 246, 0.03) 0 1px, transparent 1px 80px);
    overflow: hidden;
    transform-style: preserve-3d;
  }

  .bay__door {
    position: absolute;
    inset: 0;
    transform-origin: top;
    transform: rotateX(0deg);
    background: rgba(0, 0, 0, 0.18);
    border-bottom: 2px solid rgba(255, 230, 0, 0.14);
    pointer-events: none;
  }

  .cassette {
    position: absolute;
    left: 10px;
    right: 10px;
    bottom: 10px;
    transform: translateZ(0);
    transform-style: preserve-3d;
  }

  .cassette__solid {
    --cd: 18px; /* depth */
    position: relative;
    transform-style: preserve-3d;
    will-change: transform;
  }

  .cassette__face {
    border: 2px solid #000;
    background:
      linear-gradient(
        135deg,
        rgba(255, 255, 255, calc(0.14 + (1 - var(--ly, 0.5)) * 0.10)),
        rgba(0, 0, 0, calc(0.10 + var(--ly, 0.5) * 0.10))
      ),
      radial-gradient(circle at calc(var(--lx, 0.5) * 100%) calc(var(--ly, 0.5) * 100%), rgba(255, 255, 255, 0.22), transparent 58%),
      radial-gradient(circle at 18% 24%, rgba(0, 0, 0, 0.10), transparent 52%),
      radial-gradient(circle at 74% 72%, rgba(0, 0, 0, 0.09), transparent 60%),
      repeating-linear-gradient(12deg, rgba(0, 0, 0, 0.05) 0 1px, transparent 1px 9px),
      repeating-linear-gradient(-38deg, rgba(255, 255, 255, 0.10) 0 1px, transparent 1px 13px),
      rgba(255, 230, 0, 0.9);
    color: #000;
    box-shadow:
      8px 8px 0 rgba(0, 0, 0, 0.28),
      0 0 0 2px rgba(255, 255, 255, 0.06) inset;
    padding: 10px;
    position: relative;
  }

  .cassette__face--front {
    transform: translateZ(calc(var(--cd) / 2));
  }

  /* Specular highlight (more "metal-like" reflections) */
  .cassette__face--front::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    mix-blend-mode: screen;
    opacity: calc(0.28 + var(--bf, 0) * 0.16);
    background:
      radial-gradient(circle 160px at var(--rx, 52%) var(--ry, 30%), rgba(255, 255, 255, 0.22), transparent 64%),
      radial-gradient(circle 90px at var(--rx, 52%) var(--ry, 30%), rgba(0, 209, 255, 0.14), transparent 70%);
  }

  .cassette__face--front::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    mix-blend-mode: multiply;
    opacity: 0.55;
    background:
      radial-gradient(circle at 22% 30%, rgba(0, 0, 0, 0.18), transparent 55%),
      radial-gradient(circle at 60% 70%, rgba(0, 0, 0, 0.14), transparent 60%),
      linear-gradient(90deg, rgba(0, 0, 0, 0.10), transparent 20% 80%, rgba(0, 0, 0, 0.08));
  }

  .cassette__face--back {
    position: absolute;
    inset: 0;
    transform: rotateY(180deg) translateZ(calc(var(--cd) / 2));
    background:
      linear-gradient(180deg, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.35)),
      rgba(255, 230, 0, 0.72);
    box-shadow: none;
  }

  .cassette__side {
    position: absolute;
    background:
      linear-gradient(180deg, rgba(0, 0, 0, 0.28), rgba(0, 0, 0, 0.12)),
      repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.06) 0 1px, transparent 1px 6px);
    border: 2px solid #000;
  }

  .cassette__side--top,
  .cassette__side--bottom {
    left: 0;
    right: 0;
    height: var(--cd);
  }

  .cassette__side--left,
  .cassette__side--right {
    top: 0;
    bottom: 0;
    width: var(--cd);
  }

  .cassette__side--top {
    top: 0;
    transform-origin: top;
    transform: rotateX(90deg) translateZ(calc(var(--cd) / 2));
    background:
      linear-gradient(90deg, rgba(255, 255, 255, calc(0.10 + (1 - var(--ly, 0.5)) * 0.12)), rgba(0, 0, 0, 0.18));
  }

  .cassette__side--bottom {
    bottom: 0;
    transform-origin: bottom;
    transform: rotateX(-90deg) translateZ(calc(var(--cd) / 2));
    background:
      linear-gradient(90deg, rgba(0, 0, 0, 0.25), rgba(255, 255, 255, 0.06));
  }

  .cassette__side--left {
    left: 0;
    transform-origin: left;
    transform: rotateY(-90deg) translateZ(calc(var(--cd) / 2));
    background:
      linear-gradient(180deg, rgba(0, 0, 0, 0.22), rgba(255, 255, 255, 0.06));
  }

  .cassette__side--right {
    right: 0;
    transform-origin: right;
    transform: rotateY(90deg) translateZ(calc(var(--cd) / 2));
    background:
      linear-gradient(180deg, rgba(255, 255, 255, calc(0.10 + var(--lx, 0.5) * 0.10)), rgba(0, 0, 0, 0.22));
  }

  .cassette__tag {
    display: inline-block;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    border: 2px solid #000;
    padding: 4px 6px;
    background: rgba(255, 255, 255, 0.35);
  }

  .cassette__titleBtn {
    display: block;
    width: 100%;
    margin-top: 8px;
    text-align: left;
    font-size: 16px;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border: 2px solid #000;
    background: rgba(255, 255, 255, 0.35);
    padding: 8px 10px;
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.20);
    cursor: pointer;
  }

  .cassette__controls {
    margin-top: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .cbtn {
    width: 38px;
    height: 32px;
    border: 2px solid #000;
    background: rgba(255, 255, 255, 0.35);
    box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.18);
    position: relative;
    cursor: pointer;
  }

  .cbtn--main {
    width: 44px;
  }

  .cbtn--knob {
    margin-left: auto;
    width: 44px;
    height: 44px;
    border-radius: 999px;
  }

  .knob {
    position: absolute;
    inset: 7px;
    border: 2px solid #000;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.08);
  }

  .knobTick {
    --k: 0.85;
    position: absolute;
    left: 50%;
    top: 50%;
    width: 2px;
    height: 16px;
    background: #000;
    transform-origin: bottom;
    transform: translate(-50%, -100%) rotate(calc(-120deg + var(--k) * 240deg));
  }

  .g {
    position: absolute;
    inset: 0;
  }

  .g.play::before {
    content: '';
    position: absolute;
    left: 14px;
    top: 8px;
    width: 0;
    height: 0;
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
    border-left: 12px solid #000;
  }

  .g.pause::before,
  .g.pause::after {
    content: '';
    position: absolute;
    top: 8px;
    width: 5px;
    height: 16px;
    background: #000;
  }

  .g.pause::before {
    left: 12px;
  }

  .g.pause::after {
    right: 12px;
  }

  .g.stop::before {
    content: '';
    position: absolute;
    left: 12px;
    top: 9px;
    width: 14px;
    height: 14px;
    background: #000;
  }

  .g.prev::before,
  .g.prev::after,
  .g.next::before,
  .g.next::after {
    content: '';
    position: absolute;
    top: 8px;
    width: 0;
    height: 0;
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
  }

  .g.prev::before {
    left: 9px;
    border-right: 10px solid #000;
  }

  .g.prev::after {
    left: 18px;
    border-right: 10px solid #000;
    opacity: 0.65;
  }

  .g.next::before {
    right: 9px;
    border-left: 10px solid #000;
  }

  .g.next::after {
    right: 18px;
    border-left: 10px solid #000;
    opacity: 0.65;
  }

  .cassette__progress {
    margin-top: 10px;
    width: 100%;
    height: 16px;
    border: 2px solid #000;
    background: rgba(0, 0, 0, 0.06);
    position: relative;
    cursor: pointer;
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.18);
  }

  .cassette__progFill {
    --p: 0;
    position: absolute;
    inset: 0;
  }

  .cassette__progFill::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: calc(var(--p) * 100%);
    background: rgba(255, 0, 0, 0.25);
  }

  .cassette__progFill::after {
    content: '';
    position: absolute;
    left: calc(var(--p) * 100%);
    top: -2px;
    width: 10px;
    height: 20px;
    background: rgba(255, 255, 255, 0.35);
    border: 2px solid #000;
    transform: translateX(-5px);
  }

  .cassette__window {
    margin-top: 10px;
    height: 46px;
    border: 2px solid #000;
    background: rgba(0, 0, 0, 0.08);
    position: relative;
  }

  .cassette__reel {
    position: absolute;
    top: 7px;
    width: 32px;
    height: 32px;
    border-radius: 999px;
    border: 2px solid #000;
    background:
      radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.15) 0 36%, transparent 37%),
      radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.06) 0 66%, transparent 67%);
  }

  .cassette__reel.left {
    left: 10px;
  }

  .cassette__reel.right {
    right: 10px;
  }

  .meters {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 6px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.55);
    transform: translateZ(8px);
  }

  .meter {
    height: 28px;
    border: 2px solid rgba(246, 246, 246, 0.20);
    background: rgba(0, 0, 0, 0.35);
    overflow: hidden;
  }

  .meter span {
    display: block;
    height: 100%;
    width: 100%;
    transform-origin: bottom;
    transform: scaleY(calc(0.18 + var(--e) * 0.82));
    background: linear-gradient(180deg, rgba(255, 59, 212, 0.55), rgba(0, 209, 255, 0.40));
    opacity: calc(0.55 + var(--bf) * 0.45);
  }



  .led {
    width: 12px;
    height: 12px;
    border-radius: 999px;
    border: 2px solid var(--fg);
    background: var(--leaf);
    opacity: calc(0.35 + var(--bf) * 0.65);
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.35);
  }

  input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    height: 8px;
    background: rgba(246, 246, 246, 0.16);
    outline: none;
  }

  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    background: var(--red-thread);
    border: 2px solid var(--fg);
    box-shadow: 2px 2px 0 rgba(246, 246, 246, 0.18);
    cursor: pointer;
  }

  .tracknote {
    position: relative;
    margin-top: 26px;
    padding: 18px 16px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.72)),
      repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.10) 0 1px, transparent 1px 28px);
    color: #000;
    transform: rotate(-1.2deg);
  }

  .tracknote__pin {
    position: absolute;
    left: 50%;
    top: -10px;
    width: 18px;
    height: 18px;
    border-radius: 999px;
    border: 2px solid #000;
    background: var(--hot-pink);
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.20);
  }

  .tracknote__title {
    font-weight: 900;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    font-size: 12px;
  }

  .tracknote__list {
    margin-top: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px 12px;
  }

  .tracknote__item {
    border: 2px dashed rgba(0, 0, 0, 0.35);
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.55);
    cursor: pointer;
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    max-width: 100%;
  }

  .tracknote__item.is-active {
    border-style: solid;
    background: rgba(255, 230, 0, 0.55);
  }

  .tracknote__num {
    font-weight: 900;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    opacity: 0.75;
  }

  .tracknote__txt {
    font-family: inherit;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: min(420px, 70vw);
  }

  @media (max-width: 640px) {
    .speakers {
      grid-template-columns: 1fr;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .deck {
      transform: none;
    }
  }
</style>
