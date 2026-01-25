<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';

  export let href = '/graffiti';
  export let label = 'Explorer';

  let el: HTMLAnchorElement | null = null;

  onMount(() => {
    if (!el) return;

    const onEnter = () => {
      gsap.to(el, { duration: 0.18, y: -2, rotate: -0.6, ease: 'power2.out' });
      gsap.to(el, { duration: 0.18, boxShadow: '10px 10px 0 rgba(255,0,0,0.22)', ease: 'power2.out' });
    };

    const onLeave = () => {
      gsap.to(el, { duration: 0.18, y: 0, rotate: 0, ease: 'power2.out' });
      gsap.to(el, { duration: 0.18, boxShadow: '6px 6px 0 rgba(255,0,0,0.18)', ease: 'power2.out' });
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);

    return () => {
      el?.removeEventListener('mouseenter', onEnter);
      el?.removeEventListener('mouseleave', onLeave);
    };
  });
</script>

<a
  bind:this={el}
  href={href}
  class="brutal-border-red inline-flex items-center gap-3 bg-[color:var(--bg)] px-5 py-3 text-base font-black uppercase tracking-widest"
  aria-label={label}
>
  <span class="text-[color:var(--red-thread)]">↳</span>
  <span>{label}</span>
</a>
