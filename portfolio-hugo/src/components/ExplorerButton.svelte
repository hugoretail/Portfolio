<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';

  export let href = '/graffiti';
  export let label = 'Explorer';

  let el: HTMLAnchorElement | null = null;
  let aura: HTMLSpanElement | null = null;

  onMount(() => {
    if (!el) return;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

    let idleTl: gsap.core.Tween | gsap.core.Timeline | null = null;
    if (!prefersReducedMotion && aura) {
      idleTl = gsap
        .timeline({ repeat: -1, defaults: { ease: 'sine.inOut' } })
        .to(aura, { duration: 2.8, rotate: 8, scale: 1.02, opacity: 0.88 }, 0)
        .to(aura, { duration: 2.8, rotate: -8, scale: 0.98, opacity: 0.62 }, 2.8);
    }

    const onEnter = () => {
      gsap.to(el, { duration: 0.18, y: -2, rotate: -0.6, ease: 'power2.out' });
      gsap.to(el, { duration: 0.18, boxShadow: '10px 10px 0 rgba(255,0,0,0.22)', ease: 'power2.out' });

      if (aura && !prefersReducedMotion) {
        gsap.to(aura, { duration: 0.18, scale: 1.06, opacity: 0.92, ease: 'power2.out' });
      }
    };

    const onLeave = () => {
      gsap.to(el, { duration: 0.18, y: 0, rotate: 0, ease: 'power2.out' });
      gsap.to(el, { duration: 0.18, boxShadow: '6px 6px 0 rgba(255,0,0,0.18)', ease: 'power2.out' });

      if (aura && !prefersReducedMotion) {
        gsap.to(aura, { duration: 0.24, scale: 1.0, opacity: 0.72, ease: 'power2.out' });
      }
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);

    return () => {
      idleTl?.kill();
      el?.removeEventListener('mouseenter', onEnter);
      el?.removeEventListener('mouseleave', onLeave);
    };
  });
</script>

<span class="explorer-wrap">
  <span class="aura" bind:this={aura} aria-hidden="true">
    <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 0.85 0 0 0  0 0 0.85 0 0  0 0 0 0.8 0"
            result="tint"
          />
          <feMerge>
            <feMergeNode in="tint" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#softGlow)" opacity="0.9">
        <path
          d="M70 7 C78 16 87 25 96 29 C108 34 123 31 131 22 C129 34 122 47 114 55 C106 63 97 70 94 80 C91 89 95 100 104 111 C91 107 79 99 73 90 C67 82 67 71 61 61 C55 52 44 45 29 43 C39 35 52 31 62 33 C73 36 80 44 88 46 C96 49 106 45 118 36 C115 49 108 60 99 66 C90 71 79 71 72 76 C64 82 61 94 65 117 C56 107 51 95 52 85 C54 73 62 65 63 57 C64 48 58 39 41 27 C56 26 69 29 77 35 C86 42 89 54 95 58 C101 62 111 59 127 47 C122 60 114 70 104 74 C95 78 84 74 76 79 C67 85 63 98 70 133 C63 124 58 113 58 103 C58 91 65 81 66 72 C66 62 60 52 43 40"
          stroke="rgba(255,80,180,0.85)"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M70 14 C74 26 73 38 70 46 C67 55 60 60 55 66 C49 73 46 82 49 96 C38 87 33 76 34 66 C35 55 44 48 49 42 C55 36 57 28 52 14 C61 18 67 22 70 27 C74 33 74 40 76 44 C79 49 86 52 101 44 C93 54 84 60 76 61 C69 62 64 57 60 60 C56 62 55 69 60 84"
          stroke="rgba(80,255,210,0.6)"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.85"
        />
        <circle cx="70" cy="70" r="48" stroke="rgba(255,0,0,0.25)" stroke-width="1.2" />
      </g>
    </svg>
  </span>

  <a
    bind:this={el}
    href={href}
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
    inset: -22px;
    z-index: 0;
    pointer-events: none;
    opacity: 0.72;
    transform-origin: 50% 50%;
  }

  .aura svg {
    width: 100%;
    height: 100%;
  }

  @media (prefers-reduced-motion: reduce) {
    .aura {
      opacity: 0.55;
      transform: none !important;
    }
  }
</style>
