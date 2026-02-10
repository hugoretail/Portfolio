<script lang="ts">
  import gsap from 'gsap';
  import { onDestroy, onMount } from 'svelte';
  import { withBase } from '../lib/withBase';

  export let src = withBase('/assets/images/signature.svgz');
  export let stroke = '#FF0000';
  export let duration = 1.8;

  let host: HTMLDivElement | null = null;
  let tl: gsap.core.Timeline | null = null;

  let lastReplayAt = 0;
  let isDrawing = false;

  function isGzip(buf: ArrayBuffer) {
    if (buf.byteLength < 2) return false;
    const u = new Uint8Array(buf);
    return u[0] === 0x1f && u[1] === 0x8b;
  }

  async function loadSvgText(url: string) {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();

    if (isGzip(buf)) {
      if (typeof DecompressionStream === 'undefined') {
        throw new Error('SVGZ gzip not supported by this browser');
      }
      const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
      return await new Response(stream).text();
    }

    return new TextDecoder('utf-8').decode(buf);
  }

  async function loadAndAnimate() {
    if (!host) return;

    isDrawing = true;

    let svgText = '';
    try {
      svgText = await loadSvgText(src);
    } catch {
      // Fallback: if someone passes a .svgz but the browser can't decompress it,
      // try the uncompressed neighbor (.svg).
      if (src.endsWith('.svgz')) {
        const fallback = src.slice(0, -1);
        svgText = await loadSvgText(fallback);
      } else {
        throw new Error('Failed to load signature SVG');
      }
    }

    host.innerHTML = svgText;

    const svg = host.querySelector('svg');
    if (!svg) return;

    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const strokes = Array.from(svg.querySelectorAll('path, polyline, line, circle, rect')) as SVGGraphicsElement[];

    // Force “handwritten” style: strokes only.
    strokes.forEach((el) => {
      // Try to keep only stroke drawing.
      el.setAttribute('fill', 'none');
      el.setAttribute('stroke', stroke);
      el.setAttribute('stroke-linecap', 'round');
      el.setAttribute('stroke-linejoin', 'round');

      const len = (el as any).getTotalLength?.() as number | undefined;
      if (typeof len === 'number' && Number.isFinite(len)) {
        el.style.strokeDasharray = `${len}`;
        el.style.strokeDashoffset = `${len}`;
      }
    });

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

    tl?.kill();
    tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    if (prefersReduced) {
      strokes.forEach((el) => (el.style.strokeDashoffset = '0'));
      isDrawing = false;
      return;
    }

    // Draw sequentially, like a real signature.
    strokes.forEach((el, i) => {
      const len = Number.parseFloat(el.style.strokeDasharray || '0');
      if (!Number.isFinite(len) || len <= 0) return;
      tl!.to(
        el,
        {
          strokeDashoffset: 0,
          duration: duration * 0.55
        },
        i === 0 ? 0 : `>-0.25`
      );
    });

    // Tiny “ink settle”
    tl.to(svg, { duration: 0.25, opacity: 1 }, '<');

    tl.eventCallback('onComplete', () => {
      isDrawing = false;
    });
  }

  function replay() {
    const now = performance.now();
    if (isDrawing) return;
    if (now - lastReplayAt < 650) return;
    lastReplayAt = now;
    loadAndAnimate();
  }

  onMount(() => {
    loadAndAnimate();
  });

  onDestroy(() => {
    tl?.kill();
  });
</script>

<div class="relative z-10 w-full">
  <div class="mb-2 flex items-center gap-3">
    <div class="font-display text-xl tracking-wide">Signature</div>
    <div class="font-hand text-lg text-[color:var(--muted)]">Kamen</div>
  </div>

  <button
    type="button"
    class="brutal-border-red relative h-[280px] w-full bg-black/20 p-3 text-left"
    aria-label="Signature animée (survol = rejouer)"
    on:pointerenter={replay}
    on:focus={replay}
  >
    <div class="pointer-events-none absolute inset-0 bg-graffiti opacity-10" aria-hidden="true"></div>
    <div class="pointer-events-none absolute inset-0 paper-grain" aria-hidden="true"></div>

    <div bind:this={host} class="relative h-full w-full" aria-label="Signature animée"></div>


  </button>
</div>
