<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import gsap from 'gsap';

  let pathEl: SVGPathElement | null = null;
  let pathShadowEl: SVGPathElement | null = null;
  let pathHighlightEl: SVGPathElement | null = null;
  let svgEl: SVGSVGElement | null = null;

  let rafId: number | null = null;
  let animRaf: number | null = null;
  let resizeObserver: ResizeObserver | null = null;

  let prefersReducedMotion = false;
  let motionY = 0;
  let drift = 0;
  let boost = 0;
  let lastAnimT = 0;
  let lastScrollY = 0;

  const pointCount = 9;

  const knotCount = 6;
  const knotPhases = Array.from({ length: knotCount }, (_, i) => 0.8 + i * 0.77);
  const knotWiggles = Array.from({ length: knotCount }, () => (Math.random() - 0.5) * 12);
  const knotSizes = Array.from({ length: knotCount }, () => 2.8 + Math.random() * 1.8);

  let knotShadowEls: SVGCircleElement[] = [];
  let knotEls: SVGCircleElement[] = [];

  function storeRef<T extends Element>(node: T, params: [T[], number]) {
    const [arr, index] = params;
    arr[index] = node;
    return {
      destroy() {
        if (arr[index] === node) arr[index] = undefined as any;
      }
    };
  }

  function buildPath(height: number, scrollY: number, width: number) {
    // Anchor the thread near the left, but keep it in-bounds on small screens.
    const xCenter = Math.max(18, Math.min(width * 0.12, 68));

    // Scroll-driven wobble: subtle, organic, not “neon wave”.
    const amplitude = Math.min(22, 6 + (scrollY % 700) / 55);

    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < pointCount; i++) {
      const t = i / (pointCount - 1);
      const y = t * height;
      const wobble = Math.sin(t * Math.PI * 2 + scrollY * 0.01) * amplitude;
      const x = xCenter + wobble;
      points.push({ x, y });
    }

    // Catmull-Rom-ish smoothing via cubic segments
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

  function tick() {
    rafId = null;
    if (!pathEl || !svgEl) return;

    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);

    // Keep path units in real pixels -> no weird stretching / pointy artifacts.
    svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const d = buildPath(height, motionY, width);
    pathEl.setAttribute('d', d);
    pathShadowEl?.setAttribute('d', d);
    pathHighlightEl?.setAttribute('d', d);

    // Fake rope twist: slide the stripe pattern as you scroll.
    const twist = (motionY * 0.25) % 32;
    pathEl.style.strokeDashoffset = String(-twist);
    pathHighlightEl && (pathHighlightEl.style.strokeDashoffset = String(-twist * 0.6));

    // Knots + micro snags
    const xCenter = Math.max(18, Math.min(width * 0.12, 68));
    const amplitude = Math.min(22, 6 + (motionY % 700) / 55);

    for (let i = 0; i < knotCount; i++) {
      const t = (0.09 + (i / knotCount) * 0.88 + Math.sin(motionY * 0.00035 + knotPhases[i]) * 0.015) % 1;
      const y = t * height;
      const wobble = Math.sin(t * Math.PI * 2 + motionY * 0.01) * amplitude;
      const x = xCenter + wobble + knotWiggles[i];

      const r = knotSizes[i];
      knotShadowEls[i]?.setAttribute('cx', x.toFixed(2));
      knotShadowEls[i]?.setAttribute('cy', y.toFixed(2));
      knotShadowEls[i]?.setAttribute('r', (r + 1.6).toFixed(2));

      knotEls[i]?.setAttribute('cx', x.toFixed(2));
      knotEls[i]?.setAttribute('cy', y.toFixed(2));
      knotEls[i]?.setAttribute('r', (r + 0.4).toFixed(2));
    }
  }

  function requestTick() {
    if (rafId != null) return;
    rafId = window.requestAnimationFrame(tick);
  }

  onMount(() => {
    prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    lastScrollY = window.scrollY || 0;
    motionY = lastScrollY;

    const onScroll = () => {
      const y = window.scrollY || 0;
      const dy = y - lastScrollY;
      lastScrollY = y;
      // boost: scroll makes it move faster temporarily
      boost = Math.min(5200, boost + Math.min(5200, Math.abs(dy) * 22));
      requestTick();
    };
    const onResize = () => requestTick();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    // Soft “breath” so it feels alive even without scroll
    const breathe = gsap.to({}, {
      duration: 2.2,
      repeat: -1,
      yoyo: true,
      onUpdate: requestTick
    });

    const animate = (t: number) => {
      animRaf = null;
      const dt = Math.min(0.06, Math.max(0.001, (t - (lastAnimT || t)) / 1000));
      lastAnimT = t;

      if (!prefersReducedMotion) {
        // gentle base drift + scroll-driven boost
        const base = 26; // px/s
        const cur = base + boost;
        drift += cur * dt;
        // decay boost quickly so scroll "pushes" the motion
        boost *= Math.pow(0.07, dt);
      }

      motionY = (window.scrollY || 0) + drift;
      requestTick();

      animRaf = window.requestAnimationFrame(animate);
    };

    if (!prefersReducedMotion) {
      animRaf = window.requestAnimationFrame(animate);
    }

    resizeObserver = new ResizeObserver(() => requestTick());
    if (svgEl) resizeObserver.observe(svgEl);

    requestTick();

    return () => {
      breathe.kill();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (resizeObserver) resizeObserver.disconnect();
      if (rafId != null) cancelAnimationFrame(rafId);
      if (animRaf != null) cancelAnimationFrame(animRaf);
    };
  });

  onDestroy(() => {
    if (resizeObserver) resizeObserver.disconnect();
    if (rafId != null) cancelAnimationFrame(rafId);
    if (animRaf != null) cancelAnimationFrame(animRaf);
  });
</script>

<div class="pointer-events-none fixed inset-0 z-0">
  <svg
    bind:this={svgEl}
    class="h-full w-full"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <defs>
      <filter id="threadShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="1" dy="2" stdDeviation="1.6" flood-color="#000" flood-opacity="0.55" />
      </filter>

      <!-- Rope-ish stripes (subtle torsion) -->
      <pattern id="ropeStripe" patternUnits="userSpaceOnUse" width="32" height="32" patternTransform="rotate(25)">
        <rect width="32" height="32" fill="#ff0000" />
        <path d="M-8 8 L 40 8" stroke="#d40000" stroke-width="10" opacity="0.45" />
        <path d="M-8 20 L 40 20" stroke="#ff3a3a" stroke-width="6" opacity="0.18" />
      </pattern>
    </defs>

    <path
      bind:this={pathShadowEl}
      d="M 40 0 C 40 0, 40 1000, 40 1000"
      fill="none"
      stroke="#000000"
      stroke-width="10"
      stroke-linecap="round"
      stroke-linejoin="round"
      opacity="0.35"
    />

    <path
      bind:this={pathEl}
      d="M 40 0 C 40 0, 40 1000, 40 1000"
      fill="none"
      stroke="url(#ropeStripe)"
      stroke-width="7"
      stroke-linecap="round"
      stroke-linejoin="round"
      opacity="0.9"
      filter="url(#threadShadow)"
      stroke-dasharray="32 0"
    />

    <path
      bind:this={pathHighlightEl}
      d="M 40 0 C 40 0, 40 1000, 40 1000"
      fill="none"
      stroke="#ff9a9a"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      opacity="0.35"
      stroke-dasharray="16 8"
    />

    <!-- knots (subtle) -->
    <g opacity="0.9" aria-hidden="true">
      {#each Array(knotCount) as _, i}
        <circle
          use:storeRef={ [knotShadowEls, i] }
          cx="40"
          cy="40"
          r="4"
          fill="#000000"
          opacity="0.28"
        />
      {/each}

      {#each Array(knotCount) as _, i}
        <circle
          use:storeRef={ [knotEls, i] }
          cx="40"
          cy="40"
          r="3"
          fill="#ff1a1a"
          opacity="0.55"
        />
      {/each}
    </g>
  </svg>
</div>
