<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import gsap from 'gsap';

  type TimelineItem = {
    year: string;
    title: string;
    description: string;
  };

  // Données temporaires (tu remplaceras après)
  const items: TimelineItem[] = [
    {
      year: '2002',
      title: 'Naissance',
      description: "Premiers cris, premières obsessions: sons, couleurs, gestes."
    },
    {
      year: '2012',
      title: 'Carnets',
      description: 'Je remplis des pages: lettrages, textures, silhouettes. Le fil commence.'
    },
    {
      year: '2017',
      title: 'Graffiti (nuit)',
      description: "Mur froid, bombe chaude. Je comprends l'espace et le risque."
    },
    {
      year: '2019',
      title: 'Hip-hop / Boom Bap',
      description: 'Le rythme devient une boussole. Je compose, j’archive, je coupe.'
    },
    {
      year: '2022',
      title: 'Code & outils',
      description: 'Je construis mes propres outils: UI brutale, interactions, systèmes.'
    },
    {
      year: '2024',
      title: 'IA (matière)',
      description: 'Je traite l’IA comme une matière: prompts, contraintes, montage.'
    }
  ];

  let scrollerEl: HTMLDivElement | null = null;
  let svgEl: SVGSVGElement | null = null;

  let pathEl: SVGPathElement | null = null;
  let pathShadowEl: SVGPathElement | null = null;
  let pathHighlightEl: SVGPathElement | null = null;
  let pathDarkEl: SVGPathElement | null = null;
  let pathLightEl: SVGPathElement | null = null;

  let rafId: number | null = null;
  let animRaf: number | null = null;

  let prefersReducedMotion = false;
  let drift = 0;
  let boost = 0;
  let motionX = 0;
  let lastAnimT = 0;
  let lastScrollLeft = 0;

  let activeIndex: number | null = null;

  const leftPad = 220;
  const rightPad = 260;
  const spacing = 520;
  const height = 260;

  $: contentWidth = leftPad + rightPad + Math.max(1, items.length - 1) * spacing;

  function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
  }

  function buildPath(w: number, xMotion: number) {
    const y0 = 130;
    const pointCount = 18;
    const amp = 16;

    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < pointCount; i++) {
      const t = i / (pointCount - 1);
      const x = t * w;

      // wobble feels organic but stays brutal/clean
      const w1 = Math.sin((t * Math.PI * 2 + xMotion * 0.0032)) * amp;
      const w2 = Math.sin((t * Math.PI * 6 + xMotion * 0.0016) + 1.2) * (amp * 0.35);
      const w3 = Math.sin((t * Math.PI * 12 + xMotion * 0.0009) - 0.4) * (amp * 0.18);
      const y = y0 + w1 + w2 + w3;
      points.push({ x, y });
    }

    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const cur = points[i];
      const cp1x = (prev.x + cur.x) / 2;
      const cp1y = prev.y;
      const cp2x = (prev.x + cur.x) / 2;
      const cp2y = cur.y;
      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${cur.x.toFixed(2)} ${cur.y.toFixed(2)}`;
    }
    return d;
  }

  function requestTick() {
    if (rafId != null) return;
    rafId = window.requestAnimationFrame(tick);
  }

  function tick() {
    rafId = null;
    if (!svgEl || !pathEl) return;

    svgEl.setAttribute('viewBox', `0 0 ${contentWidth} ${height}`);

    const d = buildPath(contentWidth, motionX);
    pathEl.setAttribute('d', d);
    pathShadowEl?.setAttribute('d', d);
    pathHighlightEl?.setAttribute('d', d);
    pathDarkEl?.setAttribute('d', d);
    pathLightEl?.setAttribute('d', d);

    // slide texture
    const twist = (motionX * 0.22) % 32;
    pathEl.style.strokeDashoffset = String(-twist);
    pathHighlightEl && (pathHighlightEl.style.strokeDashoffset = String(-twist * 0.6));
    pathDarkEl && (pathDarkEl.style.strokeDashoffset = String(-(twist * 0.85 + 9)));
    pathLightEl && (pathLightEl.style.strokeDashoffset = String(-(twist * 0.55 - 14)));
  }

  function onScroll() {
    if (!scrollerEl) return;
    const x = scrollerEl.scrollLeft;
    const dx = x - lastScrollLeft;
    lastScrollLeft = x;

    boost = Math.min(340, boost + Math.min(340, Math.abs(dx) * 1.4));
    requestTick();
  }

  function onWheel(e: WheelEvent) {
    if (!scrollerEl) return;
    // Vertical wheel -> horizontal travel
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      scrollerEl.scrollLeft += e.deltaY;
    }
  }

  function markerX(i: number) {
    return leftPad + i * spacing;
  }

  onMount(() => {
    prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

    // Start at the end of the timeline (“Aujourd’hui”).
    // Wait a frame so layout/scrollWidth are correct.
    requestAnimationFrame(() => {
      if (!scrollerEl) return;
      scrollerEl.scrollLeft = Math.max(0, scrollerEl.scrollWidth - scrollerEl.clientWidth);
      lastScrollLeft = scrollerEl.scrollLeft;
      motionX = lastScrollLeft;
      requestTick();
    });

    const breathe = gsap.to({}, { duration: 2.1, repeat: -1, yoyo: true, onUpdate: requestTick });

    const animate = (t: number) => {
      animRaf = null;
      const dt = Math.min(0.06, Math.max(0.001, (t - (lastAnimT || t)) / 1000));
      lastAnimT = t;

      if (!prefersReducedMotion) {
        const base = 10; // px/s
        const cur = base + boost;
        drift += cur * dt;
        boost *= Math.pow(0.12, dt);
      }

      const scrollX = scrollerEl?.scrollLeft ?? 0;
      motionX = scrollX + drift;
      requestTick();

      animRaf = window.requestAnimationFrame(animate);
    };

    if (!prefersReducedMotion) {
      animRaf = window.requestAnimationFrame(animate);
    }

    requestTick();

    return () => {
      breathe.kill();
    };
  });

  onDestroy(() => {
    if (rafId != null) cancelAnimationFrame(rafId);
    if (animRaf != null) cancelAnimationFrame(animRaf);
  });
</script>

<section class="relative min-h-[calc(100vh-0px)]">
  <header class="relative z-10 mx-auto max-w-6xl px-4 pt-10">
    <div class="brutal-border bg-black/40 p-5">
      <div class="flex flex-wrap items-baseline justify-between gap-3">
        <h1 class="font-display text-5xl md:text-6xl">Frise chronologique</h1>
        <div class="font-black uppercase tracking-widest text-xs text-[color:var(--muted)]">de gauche à droite</div>
      </div>
      <p class="mt-2 font-hand text-2xl text-[color:var(--muted)]">
        Fais défiler horizontalement. Survole les marqueurs pour lire les moments.
      </p>
    </div>
  </header>

  <div class="relative z-10 mt-8">
    <div
      bind:this={scrollerEl}
      class="relative overflow-x-auto overflow-y-hidden" 
      style="scrollbar-width: thin;"
      on:scroll={onScroll}
      on:wheel={onWheel}
      aria-label="Frise chronologique défilable horizontalement"
      role="region"
      tabindex="0"
    >
      <div class="relative" style={`width:${contentWidth}px; height:${height + 240}px;`}>
        <!-- Thread SVG -->
        <svg
          bind:this={svgEl}
          class="absolute left-0 top-0"
          width={contentWidth}
          height={height}
          viewBox={`0 0 ${contentWidth} ${height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <filter id="threadShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="1" dy="2" stdDeviation="1.6" flood-color="#000" flood-opacity="0.55" />
            </filter>

            <filter id="threadGrain" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
              <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.14 0" result="a" />
              <feComposite in="a" in2="SourceGraphic" operator="in" result="grain" />
              <feBlend in="SourceGraphic" in2="grain" mode="overlay" />
            </filter>

            <filter id="patchDark" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="31" result="t" />
              <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" result="m" />
              <feComponentTransfer in="m" result="mask">
                <feFuncA type="gamma" amplitude="1" exponent="1.35" offset="-0.18" />
              </feComponentTransfer>
              <feComposite in="SourceGraphic" in2="mask" operator="in" />
            </filter>

            <filter id="patchLight" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="2" seed="57" result="t" />
              <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" result="m" />
              <feComponentTransfer in="m" result="mask">
                <feFuncA type="gamma" amplitude="1" exponent="1.15" offset="-0.10" />
              </feComponentTransfer>
              <feComposite in="SourceGraphic" in2="mask" operator="in" />
            </filter>

            <pattern id="ropeStripe" patternUnits="userSpaceOnUse" width="32" height="32" patternTransform="rotate(25)">
              <rect width="32" height="32" fill="#ee0000" />
              <path d="M-8 7 L 40 7" stroke="#9e0000" stroke-width="10" opacity="0.38" />
              <path d="M-8 18 L 40 18" stroke="#ff3a3a" stroke-width="7" opacity="0.16" />
              <path d="M-8 13 L 40 13" stroke="#ff8a8a" stroke-width="2" opacity="0.14" />
              <path d="M-8 3 L 40 3" stroke="#6e0000" stroke-width="1" opacity="0.18" stroke-dasharray="2 7" />
              <path d="M-8 28 L 40 28" stroke="#ffc2c2" stroke-width="1" opacity="0.10" stroke-dasharray="3 9" />
              <path d="M-8 23 L 40 23" stroke="#b50000" stroke-width="1" opacity="0.12" stroke-dasharray="1 5" />
            </pattern>
          </defs>

          <path
            bind:this={pathShadowEl}
            d="M 0 130 C 0 130, 200 130, 400 130"
            fill="none"
            stroke="#000000"
            stroke-width="12"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.35"
          />

          <path
            bind:this={pathEl}
            d="M 0 130 C 0 130, 200 130, 400 130"
            fill="none"
            stroke="url(#ropeStripe)"
            stroke-width="8"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.92"
            filter="url(#threadShadow)"
            stroke-dasharray="32 0"
          />

          <path
            bind:this={pathDarkEl}
            d="M 0 130 C 0 130, 200 130, 400 130"
            fill="none"
            stroke="#7a0000"
            stroke-width="8"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.16"
            filter="url(#patchDark)"
            stroke-dasharray="46 10"
          />

          <path
            bind:this={pathLightEl}
            d="M 0 130 C 0 130, 200 130, 400 130"
            fill="none"
            stroke="#ffb3b3"
            stroke-width="7"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.12"
            filter="url(#patchLight)"
            stroke-dasharray="54 14"
          />

          <path
            bind:this={pathHighlightEl}
            d="M 0 130 C 0 130, 200 130, 400 130"
            fill="none"
            stroke="#ffd0d0"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.15"
            filter="url(#threadGrain)"
          />
        </svg>

        <!-- Markers + subtle dates -->
        {#each items as item, i}
          <div class="absolute" style={`left:${markerX(i)}px; top:0; width:1px; height:${height + 220}px;`}>
            <div class="absolute left-0 top-[118px] h-[26px] w-[1px] bg-[color:var(--fg)]/20"></div>

            <button
              class="absolute left-[-12px] top-[106px] h-6 w-6 brutal-border bg-black/70"
              style="border-color: var(--red-thread); box-shadow: 5px 5px 0 0 rgba(255,0,0,0.16);"
              aria-label={`Voir: ${item.year} — ${item.title}`}
              on:mouseenter={() => (activeIndex = i)}
              on:mouseleave={() => (activeIndex = null)}
              on:focus={() => (activeIndex = i)}
              on:blur={() => (activeIndex = null)}
              type="button"
            >
              <span class="block h-full w-full" aria-hidden="true">
                <span class="mx-auto mt-[7px] block h-[8px] w-[8px] rounded-full bg-[color:var(--red-thread)]"></span>
              </span>
            </button>

            <div class="absolute left-[-32px] top-[150px] w-[70px] text-center font-black text-[10px] uppercase tracking-widest text-[color:var(--muted)]">
              {item.year}
            </div>

            {#if activeIndex === i}
              <div
                class="absolute left-[-10px] top-[188px] w-[320px] brutal-border bg-black/80 p-4"
                style="border-color: var(--fg); box-shadow: 7px 7px 0 0 rgba(246,246,246,0.14);"
                role="tooltip"
              >
                <div class="font-display text-2xl leading-none">{item.year} — {item.title}</div>
                <div class="mt-2 font-hand text-2xl leading-snug text-[color:var(--muted)]">{item.description}</div>
              </div>
            {/if}
          </div>
        {/each}

        <!-- Guidance -->
        <div class="pointer-events-none absolute left-6 top-[18px] brutal-border bg-black/55 px-4 py-3">
          <div class="font-black uppercase tracking-widest text-[11px] text-[color:var(--muted)]">hint</div>
          <div class="mt-1 font-hand text-2xl">Scroll ←</div>
        </div>

        <!-- End cap -->
        <div class="absolute right-[120px] top-[96px] brutal-border-red bg-black/65 px-4 py-3">
          <div class="font-display text-3xl leading-none">Aujourd’hui</div>
          <div class="mt-1 font-hand text-2xl text-[color:var(--muted)]">à compléter</div>
        </div>
      </div>
    </div>
  </div>
</section>
