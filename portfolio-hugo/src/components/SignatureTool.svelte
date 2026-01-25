<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  type Color = { name: string; value: string };

  const colors: Color[] = [
    { name: 'Rose fluo', value: '#FF3BD4' },
    { name: 'Bleu électrique', value: '#00D1FF' },
    { name: 'Jaune vif', value: '#FFE600' }
  ];

  let wrapper: HTMLDivElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;

  let activeColor = colors[0].value;
  let isDrawing = false;
  let last: { x: number; y: number } | null = null;

  let resizeObserver: ResizeObserver | null = null;

  function setupCanvas() {
    if (!canvas) return;
    const c = canvas;

    const rect = c.getBoundingClientRect();
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));

    c.width = Math.max(1, Math.floor(rect.width * dpr));
    c.height = Math.max(1, Math.floor(rect.height * dpr));

    ctx = c.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = activeColor;
  }

  function getPoint(evt: PointerEvent) {
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }

  function start(evt: PointerEvent) {
    if (!canvas || !ctx) return;
    isDrawing = true;
    last = getPoint(evt);
    canvas.setPointerCapture(evt.pointerId);
  }

  function move(evt: PointerEvent) {
    if (!ctx || !isDrawing || !last) return;
    const p = getPoint(evt);

    ctx.strokeStyle = activeColor;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    last = p;
  }

  function end(evt: PointerEvent) {
    if (!canvas) return;
    isDrawing = false;
    last = null;
    try {
      canvas.releasePointerCapture(evt.pointerId);
    } catch {
      // ignore
    }
  }

  function clear() {
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
  }

  function downloadPng() {
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'hugo-signature.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  onMount(() => {
    setupCanvas();

    resizeObserver = new ResizeObserver(() => {
      // Keep the drawing crisp on resize, but do not attempt to preserve strokes.
      setupCanvas();
    });

    if (wrapper) resizeObserver.observe(wrapper);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
    };
  });

  onDestroy(() => {
    if (resizeObserver) resizeObserver.disconnect();
  });
</script>

<div class="relative z-10 w-full">
  <div class="mb-2 flex flex-wrap items-center gap-2">
    <div class="font-display text-xl tracking-wide">Signature</div>
    <div class="ml-auto flex items-center gap-2">
      {#each colors as c}
        <button
          type="button"
          class="h-9 w-9 rounded-full brutal-border-red transition-transform hover:-translate-y-0.5"
          style={`background:${c.value}`}
          aria-label={`Couleur : ${c.name}`}
          on:click={() => (activeColor = c.value)}
        >
          <span class="sr-only">{c.name}</span>
        </button>
      {/each}

      <button
        type="button"
        class="brutal-border-red flex items-center gap-2 bg-black/40 px-3 py-2 text-sm font-semibold uppercase tracking-wide transition-transform hover:-translate-y-0.5"
        aria-label="Effacer la signature"
        on:click={clear}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M9 3h6v3H9V3Z" fill="currentColor" />
          <path
            d="M8 8c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v11c0 1.1-.9 2-2 2h-4c-1.1 0-2-.9-2-2V8Z"
            fill="currentColor"
          />
          <path d="M6 11h2v2H6v-2Zm0 4h2v2H6v-2Zm0-8h2v2H6V7Z" fill="currentColor" />
        </svg>
        Effacer
      </button>

      <button
        type="button"
        class="brutal-border-red flex items-center gap-2 bg-[color:var(--acid-yellow)] px-3 py-2 text-sm font-extrabold uppercase tracking-wide text-black transition-transform hover:-translate-y-0.5"
        aria-label="Exporter en PNG"
        on:click={downloadPng}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M9 3h6v3H9V3Z" fill="currentColor" />
          <path
            d="M8 8c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v11c0 1.1-.9 2-2 2h-4c-1.1 0-2-.9-2-2V8Z"
            fill="currentColor"
          />
          <path d="M6 11h2v2H6v-2Zm0 4h2v2H6v-2Zm0-8h2v2H6V7Z" fill="currentColor" />
        </svg>
        Export PNG
      </button>
    </div>
  </div>

  <div bind:this={wrapper} class="brutal-border-red relative h-[280px] w-full bg-transparent">
    <canvas
      bind:this={canvas}
      class="h-full w-full touch-none"
      aria-label="Zone de signature"
      on:pointerdown={start}
      on:pointermove={move}
      on:pointerup={end}
      on:pointercancel={end}
      on:pointerleave={end}
    />
    <div class="pointer-events-none absolute bottom-2 left-2 font-hand text-lg text-[color:var(--muted)]">
      « un trait, une trace, un fil rouge »
    </div>
  </div>
</div>
