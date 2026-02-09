<script lang="ts">
  import gsap from 'gsap';
  import { onDestroy, onMount } from 'svelte';

  type PointItem = {
    kind: 'point';
    date: string; // YYYY | YYYY-MM | YYYY-MM-DD
    title: string;
    description: string;
  };

  type RangeItem = {
    kind: 'range';
    start: string; // YYYY-MM | YYYY-MM-DD
    end: string; // YYYY-MM | YYYY-MM-DD
    title: string;
    description: string;
    ongoing?: boolean;
  };

  // “Aujourd’hui” (page statique) : février 2026
  const TODAY = '2026-02-08';

  // Début de frise : naissance (ce n'est pas un événement, juste l'origine)
  const ORIGIN = '2005-01-01';

  const pointItems: PointItem[] = [
    {
      kind: 'point',
      date: '2022-12-01',
      title: 'Diplôme BAFA',
      description: "Brevet d’Aptitude aux Fonctions d’Animateur."
    },
    {
      kind: 'point',
      date: '2023-02-15',
      title: 'Animateur BAFA — ALSH',
      description: "Vacances d’Hiver 2023 · École Jules-Ferry, Gujan-Mestras."
    },
    {
      kind: 'point',
      date: '2023-04-15',
      title: 'Animateur BAFA — ALSH',
      description: "Vacances d’Avril 2023 · Centre de Pardies, Biganos."
    },
    {
      kind: 'point',
      date: '2023-06-01',
      title: 'Permis B',
      description: 'Obtention du permis B.'
    },
    {
      kind: 'point',
      date: '2023-07-01',
      title: 'Baccalauréat Général (TB)',
      description: 'Lycée de la Mer, Gujan-Mestras.'
    },
    {
      kind: 'point',
      date: '2023-07-15',
      title: 'Animateur BAFA — ALSH',
      description: 'Juillet 2023 · Centre de Pardies, Biganos.'
    },
    {
      kind: 'point',
      date: '2023-08-15',
      title: 'Animateur BAFA — ALSH',
      description: 'Août 2023 · Mairie de Gujan-Mestras.'
    },
    {
      kind: 'point',
      date: '2024-07-08',
      title: 'Animateur BAFA — ALSH',
      description: '8 → 26 juillet 2024 · Sports Vacances, Mairie de Gujan-Mestras.'
    },
    {
      kind: 'point',
      date: '2024-08-01',
      title: 'Coach E‑Sport (BAFA)',
      description: 'Août 2024 · Sports Elite Jeunes, Vichy.'
    },
    {
      kind: 'point',
      date: '2024-09-01',
      title: 'Fresque participative — Campulsations',
      description:
        "Artiste sur une fresque participative (CROUS, Pessac). Avec Love Is Wall, en partenariat avec Vibrations Urbaines (street de Pessac). Fresque réalisée avec l’artiste Corbeaux Suave."
    },
    {
      kind: 'point',
      date: '2025-09-01',
      title: 'Fresque participative — Campulsations (bis)',
      description:
        "Septembre 2025 · Avec Love Is Wall, en partenariat avec Vibrations Urbaines. Fresque réalisée avec l’artiste Corbeaux Suave."
    }
  ];

  const rangeItems: RangeItem[] = [
    {
      kind: 'range',
      start: '2023-09-01',
      end: '2026-07-01',
      title: 'BUT Informatique (IUT)',
      description: 'Université de Bordeaux · Septembre 2023 → Juillet 2026 · Tuteur pédagogique pour les étudiants de première année.'
    },
    {
      kind: 'range',
      start: '2025-04-01',
      end: '2025-06-30',
      title: 'Programmeur NLP',
      description: 'Avril → Juin 2025 · Université de Tsukuba, Japon.'
    },
    {
      kind: 'range',
      start: '2025-06-01',
      end: TODAY,
      title: 'Ambassadeur des Transitions',
      description: 'Depuis juin 2025 · (jusqu’à aujourd’hui).',
      ongoing: true
    },
    {
      kind: 'range',
      start: '2025-12-01',
      end: TODAY,
      title: 'Ambassadeur Étudiant Engagé',
      description: 'Université de Bordeaux · Depuis décembre 2025 · (jusqu’à aujourd’hui).',
      ongoing: true
    },
    {
      kind: 'range',
      start: '2026-04-01',
      end: '2026-06-30',
      title: 'Stage NLP — Tsukuba (à venir)',
      description: "Avril → Juin 2026 · Laboratoire du professeur Inui (Université de Tsukuba, Japon)."
    }
  ];

  // Merge + sort for tooltip indexing
  const points = [...pointItems].sort((a, b) => parseDate(a.date).t - parseDate(b.date).t);
  const ranges = [...rangeItems].sort((a, b) => parseDate(a.start).t - parseDate(b.start).t);

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
  let scrollLeft = 0;

  let activeIndex: number | null = null;
  let activeRangeIndex: number | null = null;

  let pointHideTimer: ReturnType<typeof setTimeout> | null = null;
  let rangeHideTimer: ReturnType<typeof setTimeout> | null = null;
  const HOVER_HIDE_DELAY = 140;

  type ScrollerBox = { left: number; top: number; width: number; height: number };
  let scrollerBox: ScrollerBox | null = null;

  function updateScrollerBox() {
    if (!scrollerEl) return;
    const r = scrollerEl.getBoundingClientRect();
    scrollerBox = { left: r.left, top: r.top, width: r.width, height: r.height };
  }

  function setActivePoint(i: number) {
    if (pointHideTimer) {
      clearTimeout(pointHideTimer);
      pointHideTimer = null;
    }
    activeIndex = i;
  }

  function scheduleClearPoint(i: number) {
    if (pointHideTimer) clearTimeout(pointHideTimer);
    pointHideTimer = setTimeout(() => {
      if (activeIndex === i) activeIndex = null;
    }, HOVER_HIDE_DELAY);
  }

  function setActiveRange(i: number) {
    if (rangeHideTimer) {
      clearTimeout(rangeHideTimer);
      rangeHideTimer = null;
    }
    activeRangeIndex = i;
  }

  function scheduleClearRange(i: number) {
    if (rangeHideTimer) clearTimeout(rangeHideTimer);
    rangeHideTimer = setTimeout(() => {
      if (activeRangeIndex === i) activeRangeIndex = null;
    }, HOVER_HIDE_DELAY);
  }

  const leftPad = 220;
  const rightPad = 140;
  let pxPerMonth = 18;
  const height = 260;
  const threadY = 160;

  let scrollerWidth = 1200;
  let ro: ResizeObserver | null = null;

  type ParsedDate = { y: number; m: number; d: number; t: number; monthIndex: number };

  function parseDate(s: string): ParsedDate {
    const parts = s.split('-').map((p) => p.trim());
    const y = Number(parts[0]);
    const m = parts.length >= 2 ? Number(parts[1]) : 1;
    const d = parts.length >= 3 ? Number(parts[2]) : 1;

    const safeY = Number.isFinite(y) ? y : 1970;
    const safeM = Number.isFinite(m) ? clamp(m, 1, 12) : 1;
    const safeD = Number.isFinite(d) ? clamp(d, 1, 31) : 1;

    const monthIndex = safeY * 12 + (safeM - 1);
    const t = Date.UTC(safeY, safeM - 1, safeD);
    return { y: safeY, m: safeM, d: safeD, t, monthIndex };
  }

  const minDate = parseDate(ORIGIN);
  const maxDate = (() => {
    const candidates: ParsedDate[] = [parseDate(TODAY)];
    for (const p of points) candidates.push(parseDate(p.date));
    for (const r of ranges) {
      candidates.push(parseDate(r.start));
      candidates.push(parseDate(r.end));
    }
    return candidates.reduce((a, b) => (a.t > b.t ? a : b));
  })();

  const monthSpan = Math.max(1, maxDate.monthIndex - minDate.monthIndex + 1);

  const END_PAD = 70;

  $: lastVisualX = (() => {
    pxPerMonth;
    let m = xForDate(TODAY);

    for (const p of points) {
      m = Math.max(m, xForDate(p.date));
    }

    for (const r of ranges) {
      const sx = xForDate(r.start);
      const ex = xForDate(r.end);
      const w = Math.max(120, ex - sx);
      m = Math.max(m, sx + w);
    }

    return m;
  })();

  $: contentWidth = Math.max(leftPad + 480, lastVisualX + END_PAD);

  function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
  }

  function buildPath(w: number, xMotion: number) {
    const y0 = threadY;
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

  function threadYAtX(x: number, w: number, xMotion: number) {
    const t = w <= 0 ? 0 : clamp(x / w, 0, 1);
    const amp = 16;
    const w1 = Math.sin(t * Math.PI * 2 + xMotion * 0.0032) * amp;
    const w2 = Math.sin(t * Math.PI * 6 + xMotion * 0.0016 + 1.2) * (amp * 0.35);
    const w3 = Math.sin(t * Math.PI * 12 + xMotion * 0.0009 - 0.4) * (amp * 0.18);
    return threadY + w1 + w2 + w3;
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
    scrollLeft = x;
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

  function xForDate(s: string) {
    const p = parseDate(s);
    const monthOffset = p.monthIndex - minDate.monthIndex;
    const dayOffset = ((clamp(p.d, 1, 31) - 1) / 30) * pxPerMonth;
    return leftPad + monthOffset * pxPerMonth + dayOffset;
  }

  function formatMonthLabel(s: string) {
    const p = parseDate(s);
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    return `${months[p.m - 1]} ${p.y}`;
  }

  function formatRangeLabel(start: string, end: string, ongoing?: boolean) {
    const a = formatMonthLabel(start);
    const b = ongoing ? "Aujourd'hui" : formatMonthLabel(end);
    return `${a} → ${b}`;
  }

  type PointLayout = {
    x: number;
    lane: number;
    dotTop: number;
    tipTop: number;
  };

  type RangeLayout = {
    sx: number;
    w: number;
    top: number;
    lane: number;
  };

  const POINT_MIN_GAP = 78;
  const RANGE_MIN_GAP = 16;
  const DOT_H = 24;
  const ABOVE_STEP = 30;
  const RANGE_STEP = 76;
  const RANGE_Y0 = threadY + 54;

  function dotTopFor(lane: number) {
    // Always above the thread.
    return threadY - DOT_H - 12 - lane * ABOVE_STEP;
  }

  function tipTopFor(dotTop: number) {
    // Tooltip above the dot, clamped inside the scroller.
    return Math.max(10, dotTop - 176);
  }

  $: pointLayout = (() => {
    pxPerMonth;
    const lastXByLane: number[] = [];
    const layouts: PointLayout[] = [];

    const findLane = (x: number, lastXByLane: number[]) => {
      for (let l = 0; l < lastXByLane.length; l++) {
        if (x - lastXByLane[l] >= POINT_MIN_GAP) return l;
      }
      return -1;
    };

    for (const p of points) {
      const x = xForDate(p.date);
      let lane = findLane(x, lastXByLane);
      if (lane === -1) {
        lastXByLane.push(-Infinity);
        lane = lastXByLane.length - 1;
      }
      lastXByLane[lane] = x;

      const dotTop = Math.max(18, dotTopFor(lane));
      const tipTop = tipTopFor(dotTop);
      layouts.push({ x, lane, dotTop, tipTop });
    }

    return layouts;
  })();

  $: rangeLayout = (() => {
    pxPerMonth;
    const laneLastEnd: number[] = [];
    const layouts: RangeLayout[] = [];

    for (const r of ranges) {
      const sx = xForDate(r.start);
      const ex = xForDate(r.end);
      const w = Math.max(120, ex - sx);

      let lane = -1;
      for (let l = 0; l < laneLastEnd.length; l++) {
        if (sx - laneLastEnd[l] >= RANGE_MIN_GAP) {
          lane = l;
          break;
        }
      }
      if (lane === -1) {
        laneLastEnd.push(-Infinity);
        lane = laneLastEnd.length - 1;
      }

      laneLastEnd[lane] = sx + w;
      const top = RANGE_Y0 + lane * RANGE_STEP;
      layouts.push({ sx, w, top, lane });
    }

    return layouts;
  })();

  $: maxRangeLane = rangeLayout.reduce((m, r) => Math.max(m, r.lane), 0);
  $: scrollerInnerH = Math.max(height + 240, RANGE_Y0 + (maxRangeLane + 1) * RANGE_STEP + 140);

  type AxisTick = { x: number; label: string; show: boolean };
  $: axisTicks = (() => {
    pxPerMonth;
    const ticks: AxisTick[] = [];
    let lastLabelX = -Infinity;
    const minY = minDate.y;
    const maxY = maxDate.y;
    for (let y = minY; y <= maxY; y++) {
      const x = xForDate(`${y}-01-01`);
      const show = x - lastLabelX >= 72;
      if (show) lastLabelX = x;
      ticks.push({ x, label: String(y), show });
    }
    return ticks;
  })();

  const TIP_W = 360;
  const TIP_H_POINT = 168;
  const TIP_H_RANGE = 178;

  $: pointTip = (() => {
    if (typeof window === 'undefined') return null;
    if (activeIndex == null || !scrollerBox) return null;
    const lay = pointLayout[activeIndex];
    const x = lay?.x ?? xForDate(points[activeIndex].date);
    const dotTop = lay?.dotTop ?? 106;
    const vx = scrollerBox.left + (x - scrollLeft);
    const vy = scrollerBox.top + dotTop;

    const left = clamp(vx - 10, 12, window.innerWidth - TIP_W - 12);
    const top = clamp(vy + 36, 12, window.innerHeight - TIP_H_POINT - 12);
    return { left, top };
  })();

  $: rangeTip = (() => {
    if (typeof window === 'undefined') return null;
    if (activeRangeIndex == null || !scrollerBox) return null;
    const lay = rangeLayout[activeRangeIndex];
    const sx = lay?.sx ?? xForDate(ranges[activeRangeIndex].start);
    const w = lay?.w ?? Math.max(120, xForDate(ranges[activeRangeIndex].end) - sx);
    const top0 = lay?.top ?? 10;

    const vx = scrollerBox.left + (sx + w / 2 - scrollLeft);
    const vy = scrollerBox.top + top0;

    const left = clamp(vx - TIP_W / 2, 12, window.innerWidth - TIP_W - 12);

    const tryAbove = vy - (TIP_H_RANGE + 16);
    const tryBelow = vy + 86;
    const top = tryAbove >= 12 ? tryAbove : clamp(tryBelow, 12, window.innerHeight - TIP_H_RANGE - 12);
    return { left, top };
  })();

  function recomputeScale() {
    // Make 2005→2026 readable without creating a super long strip.
    // Aim for ~3 screens of scroll, clamped.
    const target = clamp(scrollerWidth * 4.6, 2600, 9800);
    const px = target / monthSpan;

    // Ensure years always have enough breathing room.
    // (e.g. 2022→2023 should never feel “compressed”)
    const minYearWidth = 320; // px
    const minPxPerMonthForYears = minYearWidth / 12;

    pxPerMonth = clamp(Math.max(px, minPxPerMonthForYears), 7, 34);
    requestTick();
  }

  onMount(() => {
    prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

    if (scrollerEl) {
      scrollerWidth = scrollerEl.clientWidth || scrollerWidth;
      recomputeScale();

      ro = new ResizeObserver((entries) => {
        const cr = entries[0]?.contentRect;
        if (!cr) return;
        scrollerWidth = cr.width || scrollerWidth;
        recomputeScale();
        updateScrollerBox();
      });
      ro.observe(scrollerEl);
    }

    // Start at the end of the timeline (“Aujourd’hui”).
    // Wait a frame so layout/scrollWidth are correct.
    requestAnimationFrame(() => {
      if (!scrollerEl) return;
      scrollerEl.scrollLeft = Math.max(0, scrollerEl.scrollWidth - scrollerEl.clientWidth);
      lastScrollLeft = scrollerEl.scrollLeft;
      scrollLeft = lastScrollLeft;
      motionX = lastScrollLeft;
      updateScrollerBox();
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

    const onResize = () => updateScrollerBox();
    window.addEventListener('resize', onResize);

    requestTick();

    return () => {
      breathe.kill();
      window.removeEventListener('resize', onResize);
    };
  });

  onDestroy(() => {
    if (rafId != null) cancelAnimationFrame(rafId);
    if (animRaf != null) cancelAnimationFrame(animRaf);
    ro?.disconnect();
  });

  $: todayX = xForDate(TODAY) + pxPerMonth * 0;
  $: todayCapLeft = clamp(todayX, 12, Math.max(12, contentWidth - 240));
</script>

<section class="relative h-screen flex flex-col">
  <header class="relative z-10 mx-auto max-w-6xl px-4 pt-10">
    <div class="brutal-border bg-black/40 p-5">
      <div class="flex flex-wrap items-baseline justify-between gap-3">
        <h1 class="font-display text-5xl md:text-6xl">Frise chronologique</h1>
      </div>
    </div>
  </header>

  <div class="relative z-10 mt-8 flex-1 min-h-0">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      bind:this={scrollerEl}
      class="relative h-full overflow-x-auto"
      style="scrollbar-width: thin;"
      on:scroll={(e) => {
        onScroll();
        updateScrollerBox();
      }}
      on:wheel={onWheel}
      aria-label="Frise chronologique défilable horizontalement"
      role="region"
      tabindex="0"
    >
      <div class="relative" style={`width:${contentWidth}px; height:${scrollerInnerH}px;`}>
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

          {#each axisTicks as t}
            {@const yy = threadYAtX(t.x, contentWidth, motionX)}
            <line x1={t.x} y1={yy - 8} x2={t.x} y2={yy + 8} stroke="rgba(246,246,246,0.22)" stroke-width="1" />
            {#if t.show}
              <text
                x={t.x}
                y={threadY + 44}
                text-anchor="middle"
                fill="rgba(246,246,246,0.65)"
                font-size="12"
                font-weight="800"
                letter-spacing="3"
              >
                {t.label}
              </text>
            {/if}
          {/each}
        </svg>

        <!-- Ranges (périodes) -->
        {#each ranges as r, ri}
          {@const lay = rangeLayout[ri]}
          {@const sx = lay?.sx ?? xForDate(r.start)}
          {@const ex = xForDate(r.end)}
          {@const w = lay?.w ?? Math.max(120, ex - sx)}
          {@const showDates = w >= 240}
          <button
            class="absolute z-[5] range-chip brutal-border bg-black/60 px-3 py-2 text-left"
            style={`left:${sx}px; top:${lay?.top ?? 10}px; width:${w}px; border-color: var(--acid-yellow); box-shadow: 7px 7px 0 rgba(0,0,0,0.6);`}
            aria-label={`Période: ${r.title}`}
            on:mouseenter={() => setActiveRange(ri)}
            on:mouseleave={() => scheduleClearRange(ri)}
            on:focus={() => setActiveRange(ri)}
            on:blur={() => (activeRangeIndex = null)}
            type="button"
          >
            <div class="flex items-baseline justify-between gap-3">
              <div class="min-w-0 flex-1 truncate font-black uppercase tracking-widest text-[11px] text-[color:var(--acid-yellow)]">{r.title}</div>
              {#if showDates}
                <div class="shrink-0 whitespace-nowrap font-black uppercase tracking-widest text-[11px] text-[color:var(--muted)]">{formatRangeLabel(r.start, r.end, r.ongoing)}</div>
              {/if}
            </div>
            <div
              class="relative mt-2 h-[6px] w-full"
              style="background: rgba(255,230,0,0.35);"
            >
              {#if r.ongoing}
                <div
                  class="absolute right-[-10px] top-1/2 h-0 w-0 -translate-y-1/2"
                  style="border-left: 10px solid rgba(255,230,0,0.75); border-top: 6px solid transparent; border-bottom: 6px solid transparent;"
                  aria-hidden="true"
                ></div>
              {:else}
                <div
                  class="absolute right-0 top-0 h-full w-[3px]"
                  style="background: rgba(255,230,0,0.55);"
                  aria-hidden="true"
                ></div>
              {/if}
            </div>
          </button>
        {/each}

        <!-- Points (événements) -->
        {#each points as item, i}
          {@const lay = pointLayout[i]}
          {@const x = lay?.x ?? xForDate(item.date)}
          <div class="absolute" style={`left:${x}px; top:0; width:1px; height:${height + 220}px;`}>
            <div
              class="absolute left-0 w-[1px]"
              style={`top:${(lay?.dotTop ?? 106) + 24}px; height:${Math.max(0, threadY - ((lay?.dotTop ?? 106) + 24))}px; background: rgba(246,246,246,0.20);`}
            ></div>

            <button
              class="absolute left-[-12px] h-6 w-6 brutal-border bg-black/70"
              style={`top:${lay?.dotTop ?? 106}px; border-color: var(--red-thread); box-shadow: 5px 5px 0 0 rgba(255,0,0,0.16);`}
              aria-label={`Voir: ${formatMonthLabel(item.date)} — ${item.title}`}
              on:mouseenter={() => setActivePoint(i)}
              on:mouseleave={() => scheduleClearPoint(i)}
              on:focus={() => setActivePoint(i)}
              on:blur={() => (activeIndex = null)}
              type="button"
            >
              <span class="block h-full w-full" aria-hidden="true">
                <span class="mx-auto mt-[7px] block h-[8px] w-[8px] rounded-full bg-[color:var(--red-thread)]"></span>
              </span>
            </button>
          </div>
        {/each}

        {#if activeRangeIndex != null && rangeTip}
          {@const r = ranges[activeRangeIndex as number]}
          <div
            class="fixed z-[60] w-[360px] brutal-border bg-black/90 p-4"
            style={`left:${rangeTip.left}px; top:${rangeTip.top}px; border-color: var(--fg); box-shadow: 7px 7px 0 0 rgba(246,246,246,0.14);`}
            role="tooltip"
            on:mouseenter={() => setActiveRange(activeRangeIndex as number)}
            on:mouseleave={() => scheduleClearRange(activeRangeIndex as number)}
          >
            <div class="font-display text-3xl leading-none">{r.title}</div>
            <div class="mt-1 font-black uppercase tracking-widest text-[12px] text-[color:var(--muted)]">
              {formatRangeLabel(r.start, r.end, r.ongoing)}
            </div>
            <div class="mt-2 font-hand text-2xl leading-snug text-[color:var(--muted)]">{r.description}</div>
          </div>
        {/if}

        {#if activeIndex != null && pointTip}
          {@const p = points[activeIndex as number]}
          <div
            class="fixed z-[60] w-[360px] brutal-border bg-black/90 p-4"
            style={`left:${pointTip.left}px; top:${pointTip.top}px; border-color: var(--fg); box-shadow: 7px 7px 0 0 rgba(246,246,246,0.14);`}
            role="tooltip"
            on:mouseenter={() => setActivePoint(activeIndex as number)}
            on:mouseleave={() => scheduleClearPoint(activeIndex as number)}
          >
            <div class="font-display text-3xl leading-none">{formatMonthLabel(p.date)} — {p.title}</div>
            <div class="mt-2 font-hand text-2xl leading-snug text-[color:var(--muted)]">{p.description}</div>
          </div>
        {/if}

        <!-- Aujourd'hui (positionné sur la date) -->
        <div class="absolute top-[96px] brutal-border-red bg-black/65 px-4 py-3" style={`left:${todayCapLeft}px;`}>
          <div class="font-display text-3xl leading-none">Aujourd’hui</div>
          <div class="mt-1 font-hand text-2xl text-[color:var(--muted)]">{formatMonthLabel(TODAY)}</div>
        </div>

        <!-- Start cap -->
        <div class="absolute left-[70px] top-[96px] brutal-border bg-black/65 px-4 py-3">
          <div class="font-display text-3xl leading-none">2005</div>
          <div class="mt-1 font-hand text-2xl text-[color:var(--muted)]">Naissance</div>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  /* Keep range buttons a constant height so stacking never overlaps. */
  :global(.range-chip) {
    height: 62px;
    overflow: hidden;
  }
</style>
