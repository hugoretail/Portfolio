<script lang="ts">
  import gsap from 'gsap';
  import { onMount } from 'svelte';
  import { withBase } from '../lib/withBase';

  export let href = '/graffiti';
  export let label = 'Explorer';

  let el: HTMLAnchorElement | null = null;
  let aura: HTMLSpanElement | null = null;

  type Orb = { r: number; s: number; d: number; delay: number; o: number; hue: number };
  let orbs: Orb[] = [];

  onMount(() => {
    if (!el) return;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

    // Create subtle orbiting lights around the button.
    if (!prefersReducedMotion) {
      const count = 6;
      const mk = (): Orb => {
        const r = 36 + Math.random() * 34;
        const s = 3 + Math.random() * 5;
        const d = 5.6 + Math.random() * 6.2;
        const delay = -Math.random() * d;
        const o = 0.34 + Math.random() * 0.40;
        const hue = Math.random() < 0.75 ? 0 : 330; // mostly red, occasional magenta
        return { r, s, d, delay, o, hue };
      };
      orbs = Array.from({ length: count }, mk);
    } else {
      orbs = [];
    }

    // Soft, subtle idle emphasis on the button itself.
    let breatheTl: gsap.core.Tween | null = null;
    if (!prefersReducedMotion) {
      breatheTl = gsap.to(el, {
        duration: 3.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        boxShadow: '10px 10px 0 rgba(255,0,0,0.18)'
      });
    }

    const onEnter = () => {
      gsap.to(el, { duration: 0.18, y: -2, rotate: -0.6, ease: 'power2.out' });
      gsap.to(el, { duration: 0.18, boxShadow: '10px 10px 0 rgba(255,0,0,0.22)', ease: 'power2.out' });

      if (aura && !prefersReducedMotion) {
        gsap.to(aura, { duration: 0.18, opacity: 1, ease: 'power2.out' });
      }
    };

    const onLeave = () => {
      gsap.to(el, { duration: 0.18, y: 0, rotate: 0, ease: 'power2.out' });
      gsap.to(el, { duration: 0.18, boxShadow: '6px 6px 0 rgba(255,0,0,0.18)', ease: 'power2.out' });

      if (aura && !prefersReducedMotion) {
        gsap.to(aura, { duration: 0.24, opacity: 0.78, ease: 'power2.out' });
      }
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);

    return () => {
      breatheTl?.kill();
      el?.removeEventListener('mouseenter', onEnter);
      el?.removeEventListener('mouseleave', onLeave);
    };
  });
</script>

<span class="explorer-wrap">
  <span class="aura" bind:this={aura} aria-hidden="true">
    <span class="orbits">
      {#each orbs as o (o)}
        <span
          class="orb"
          style={`--r:${o.r}px; --s:${o.s}px; --d:${o.d}s; --delay:${o.delay}s; --o:${o.o}; --h:${o.hue}deg;`}
        ></span>
      {/each}
    </span>
  </span>

  <a
    bind:this={el}
    href={withBase(href)}
    class="brutal-border-red relative z-10 inline-flex items-center gap-3 bg-[color:var(--bg)] px-5 py-3 text-base font-black uppercase tracking-widest"
    aria-label={label}
  >
    <span class="text-[color:var(--red-thread)]">↳</span>
    <span>{label}</span>
  </a>
</span>

<style>
  .explorer-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .aura {
    position: absolute;
    inset: -40px;
    z-index: 0;
    pointer-events: none;
    opacity: 0.78;
    transform-origin: 50% 50%;
    border-radius: 999px;
  }

  .aura::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: radial-gradient(circle at 50% 50%, rgba(255,0,0,0.14), rgba(255,0,0,0) 62%);
    filter: blur(10px);
    opacity: 0.65;
    transform: scale(0.95);
    animation: glowBreathe 3.8s ease-in-out infinite;
  }

  .orbits {
    position: absolute;
    inset: 0;
    border-radius: 999px;
  }

  .orb {
    position: absolute;
    left: 50%;
    top: 50%;
    width: var(--s);
    height: var(--s);
    margin-left: calc(var(--s) * -0.5);
    margin-top: calc(var(--s) * -0.5);
    border-radius: 999px;
    opacity: var(--o);
    background:
      radial-gradient(circle at 35% 35%, rgba(255,255,255,0.55), rgba(255,255,255,0.00) 60%),
      radial-gradient(circle, hsla(var(--h), 100%, 55%, 0.95), hsla(var(--h), 100%, 55%, 0.00) 70%);
    filter: blur(0.6px);
    box-shadow:
      0 0 12px hsla(var(--h), 100%, 55%, 0.26),
      0 0 28px hsla(var(--h), 100%, 55%, 0.14);
    transform: rotate(0deg) translateX(var(--r));
    animation: orbit var(--d) linear infinite;
    animation-delay: var(--delay);
  }

  @keyframes orbit {
    from { transform: rotate(0deg) translateX(var(--r)); }
    to { transform: rotate(360deg) translateX(var(--r)); }
  }

  @keyframes glowBreathe {
    0%, 100% {
      opacity: 0.52;
      transform: scale(0.94);
    }
    50% {
      opacity: 0.78;
      transform: scale(1.04);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .aura {
      opacity: 0.55;
      transform: none !important;
    }

    .aura::before {
      animation: none !important;
      opacity: 0.42;
      transform: none !important;
    }

    .orb {
      animation: none !important;
    }
  }
</style>
