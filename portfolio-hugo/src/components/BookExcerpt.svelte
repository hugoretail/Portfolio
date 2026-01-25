<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';

  export let title = 'Extrait';
  export let left = "Je marche avec un fil rouge\nentre la mousse et le béton.";
  export let right = "Une phrase taguée\nreste plus longtemps qu’un bruit.";

  let open = false;
  let pageEl: HTMLDivElement | null = null;

  function toggle() {
    open = !open;
    if (!pageEl) return;
    gsap.to(pageEl, {
      duration: 0.6,
      rotateY: open ? -165 : -8,
      ease: 'power2.inOut'
    });
  }

  onMount(() => {
    if (!pageEl) return;
    gsap.set(pageEl, { rotateY: -8, transformOrigin: 'left center' });
  });
</script>

<div class="relative z-10 w-full">
  <div class="mb-2 flex items-end gap-3">
    <div class="font-display text-xl tracking-wide">Littérature</div>
    <div class="font-hand text-lg text-[color:var(--muted)]">(clic = page)</div>
  </div>

  <button
    type="button"
    class="brutal-border relative block w-full bg-white p-4 text-left text-black"
    aria-label="Tourner la page"
    on:click={toggle}
  >
    <div class="absolute inset-0 opacity-10 bg-graffiti" aria-hidden="true"></div>

    <div class="relative grid gap-3 md:grid-cols-2" style="perspective: 900px">
      <div class="min-h-[180px] p-3">
        <div class="text-sm font-black uppercase tracking-widest">{title}</div>
        <pre class="mt-3 whitespace-pre-wrap font-hand text-xl leading-snug">{left}</pre>
      </div>

      <div class="relative min-h-[180px]">
        <div
          bind:this={pageEl}
          class="brutal-border-red absolute inset-0 bg-[color:var(--acid-yellow)] p-3"
          style="transform-style: preserve-3d"
        >
          <div class="text-sm font-black uppercase tracking-widest">Page</div>
          <pre class="mt-3 whitespace-pre-wrap font-hand text-xl leading-snug">{right}</pre>
        </div>
      </div>
    </div>

    <div class="relative mt-3 text-xs font-black uppercase tracking-widest text-[color:var(--red-thread)]">
      Tourne la page — pas de CV, juste des traces.
    </div>
  </button>
</div>
