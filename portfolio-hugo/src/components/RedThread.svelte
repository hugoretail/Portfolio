<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import gsap from 'gsap';

  let pathEl: SVGPathElement | null = null;
  let svgEl: SVGSVGElement | null = null;

  let rafId: number | null = null;
  let resizeObserver: ResizeObserver | null = null;

  const pointCount = 9;

  function buildPath(height: number, scrollY: number, width: number) {
    const xCenter = Math.max(20, Math.min(60, width * 0.06));
    const amplitude = Math.min(26, 10 + (scrollY % 600) / 30);

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

    const rect = svgEl.getBoundingClientRect();
    const height = Math.max(window.innerHeight, rect.height);
    const width = Math.max(1, rect.width);

    const d = buildPath(height, window.scrollY, width);
    pathEl.setAttribute('d', d);
  }

  function requestTick() {
    if (rafId != null) return;
    rafId = window.requestAnimationFrame(tick);
  }

  onMount(() => {
    const onScroll = () => requestTick();
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

    resizeObserver = new ResizeObserver(() => requestTick());
    if (svgEl) resizeObserver.observe(svgEl);

    requestTick();

    return () => {
      breathe.kill();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (resizeObserver) resizeObserver.disconnect();
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  });

  onDestroy(() => {
    if (resizeObserver) resizeObserver.disconnect();
    if (rafId != null) cancelAnimationFrame(rafId);
  });
</script>

<div class="pointer-events-none fixed inset-0 z-0">
  <svg
    bind:this={svgEl}
    class="h-full w-full"
    viewBox="0 0 120 1000"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <path
      bind:this={pathEl}
      d="M 40 0 C 40 0, 40 1000, 40 1000"
      fill="none"
      stroke="#FF0000"
      stroke-width="4"
      stroke-linecap="round"
      stroke-linejoin="round"
      opacity="0.9"
    />
  </svg>
</div>
