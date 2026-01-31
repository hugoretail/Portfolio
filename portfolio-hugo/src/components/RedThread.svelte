<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import gsap from 'gsap';

  export let href = '/frise';

  let pathEl: SVGPathElement | null = null;
  let pathShadowEl: SVGPathElement | null = null;
  let pathHighlightEl: SVGPathElement | null = null;
  let pathDarkEl: SVGPathElement | null = null;
  let pathLightEl: SVGPathElement | null = null;
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
    pathDarkEl?.setAttribute('d', d);
    pathLightEl?.setAttribute('d', d);

    // Fake rope twist: slide the stripe pattern as you scroll.
    const twist = (motionY * 0.25) % 32;
    pathEl.style.strokeDashoffset = String(-twist);
    pathHighlightEl && (pathHighlightEl.style.strokeDashoffset = String(-twist * 0.6));

    // Slide paint patches at a different rate so the thread looks “alive”.
    pathDarkEl && (pathDarkEl.style.strokeDashoffset = String(-(twist * 0.85 + 9)));
    pathLightEl && (pathLightEl.style.strokeDashoffset = String(-(twist * 0.55 - 14)));
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
      // Keep it subtle: scroll should *nudge* the drift, not rocket it.
      boost = Math.min(260, boost + Math.min(260, Math.abs(dy) * 1.2));
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
        const base = 9; // px/s
        const cur = base + boost;
        drift += cur * dt;
        // decay boost quickly so scroll "pushes" the motion
        boost *= Math.pow(0.12, dt);
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

<!-- Click zone (kept slim so it doesn't block UI) -->
<a
  class="fixed left-0 top-0 z-30 h-full"
  href={href}
  aria-label="Ouvrir la frise chronologique"
  style="width: clamp(72px, 12vw, 96px);"
></a>

<!-- Visual thread (never intercepts pointer events) -->
<div class="pointer-events-none fixed inset-0 z-20">
  <svg
    bind:this={svgEl}
    class="h-full w-full"
    pointer-events="none"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
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

      <linearGradient id="threadShade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#7a0000" stop-opacity="0.18" />
        <stop offset="0.55" stop-color="#ff2a2a" stop-opacity="0.12" />
        <stop offset="1" stop-color="#ffb3b3" stop-opacity="0.10" />
      </linearGradient>

      <filter id="threadFiber" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed="9" result="t" />
        <feDisplacementMap in="SourceGraphic" in2="t" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
      </filter>

      <!-- Masked paint patches for tonal variation (no circles, just texture) -->
      <filter id="patchDark" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="31" result="t" />
        <!-- Use turbulence as alpha mask -->
        <feColorMatrix in="t" type="matrix" values="
          0 0 0 0 0
          0 0 0 0 0
          0 0 0 0 0
          1 0 0 0 0" result="m" />
        <feComponentTransfer in="m" result="mask">
          <feFuncA type="gamma" amplitude="1" exponent="1.35" offset="-0.18" />
        </feComponentTransfer>
        <feComposite in="SourceGraphic" in2="mask" operator="in" />
      </filter>

      <filter id="patchLight" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="2" seed="57" result="t" />
        <feColorMatrix in="t" type="matrix" values="
          0 0 0 0 0
          0 0 0 0 0
          0 0 0 0 0
          1 0 0 0 0" result="m" />
        <feComponentTransfer in="m" result="mask">
          <feFuncA type="gamma" amplitude="1" exponent="1.15" offset="-0.10" />
        </feComponentTransfer>
        <feComposite in="SourceGraphic" in2="mask" operator="in" />
      </filter>

      <!-- Rope-ish stripes (subtle torsion) -->
      <pattern id="ropeStripe" patternUnits="userSpaceOnUse" width="32" height="32" patternTransform="rotate(25)">
        <rect width="32" height="32" fill="#ee0000" />
        <!-- core twist -->
        <path d="M-8 7 L 40 7" stroke="#9e0000" stroke-width="10" opacity="0.38" />
        <path d="M-8 18 L 40 18" stroke="#ff3a3a" stroke-width="7" opacity="0.16" />
        <path d="M-8 13 L 40 13" stroke="#ff8a8a" stroke-width="2" opacity="0.14" />
        <!-- micro fibers / irregular ink passes -->
        <path d="M-8 3 L 40 3" stroke="#6e0000" stroke-width="1" opacity="0.18" stroke-dasharray="2 7" />
        <path d="M-8 28 L 40 28" stroke="#ffc2c2" stroke-width="1" opacity="0.10" stroke-dasharray="3 9" />
        <path d="M-8 23 L 40 23" stroke="#b50000" stroke-width="1" opacity="0.12" stroke-dasharray="1 5" />
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

    <!-- darker patches (paint density) -->
    <path
      bind:this={pathDarkEl}
      d="M 40 0 C 40 0, 40 1000, 40 1000"
      fill="none"
      stroke="#7a0000"
      stroke-width="7"
      stroke-linecap="round"
      stroke-linejoin="round"
      opacity="0.18"
      filter="url(#patchDark)"
      stroke-dasharray="46 10"
    />

    <!-- lighter patches (catching light) -->
    <path
      bind:this={pathLightEl}
      d="M 40 0 C 40 0, 40 1000, 40 1000"
      fill="none"
      stroke="#ffb3b3"
      stroke-width="6"
      stroke-linecap="round"
      stroke-linejoin="round"
      opacity="0.14"
      filter="url(#patchLight)"
      stroke-dasharray="54 14"
    />

    <!-- subtle inner shading / variation to avoid flat red -->
    <path
      d="M 40 0 C 40 0, 40 1000, 40 1000"
      fill="none"
      stroke="url(#threadShade)"
      stroke-width="5"
      stroke-linecap="round"
      stroke-linejoin="round"
      opacity="0.22"
      filter="url(#threadFiber)"
    />

    <path
      bind:this={pathHighlightEl}
      d="M 40 0 C 40 0, 40 1000, 40 1000"
      fill="none"
      stroke="#ffd0d0"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      opacity="0.16"
      filter="url(#threadGrain)"
    />
  </svg>
</div>
