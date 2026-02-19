<script lang="ts">
  import gsap from 'gsap';
  import { onDestroy, onMount } from 'svelte';
  import { withBase } from '../lib/withBase';

  export let src = withBase('/assets/images/signature.gif');
  export let stroke = '#FF0000';
  export let duration = 1.8;

  let host: HTMLDivElement | null = null;
  let tl: gsap.core.Timeline | null = null;
  let isDrawing = false;

  const isSvgLike = (value: string) => /\.svg(z)?(\?.*)?$/i.test(value);
  const isGifLike = (value: string) => /\.gif(\?.*)?$/i.test(value);

  async function loadAndAnimate() {
    if (!host) return;

    isDrawing = true;

    // GIF mode: just render the file; the animation is baked in.
    // We still support "replay" by swapping src with a cache-busting query.
    if (isGifLike(src) || !isSvgLike(src)) {
      tl?.kill();
      host.replaceChildren();
      const img = document.createElement('img');
      img.decoding = 'async';
      img.loading = 'eager';
      img.alt = 'Signature animée';
      img.src = src;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      img.style.display = 'block';
      host.appendChild(img);
      isDrawing = false;
      return;
    }

    // SVG mode (kept for compatibility)
    const res = await fetch(src);
    const svgText = await res.text();

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

  <div
    class="brutal-border-red relative h-[280px] w-full bg-black/20 p-3 text-left"
    aria-label="Signature animée"
  >
    <div class="pointer-events-none absolute inset-0 bg-graffiti opacity-10" aria-hidden="true"></div>
    <div class="pointer-events-none absolute inset-0 paper-grain" aria-hidden="true"></div>

    <div bind:this={host} class="relative h-full w-full" aria-label="Signature animée"></div>

  </div>
</div>
