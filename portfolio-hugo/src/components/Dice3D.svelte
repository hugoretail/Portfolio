<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import * as THREE from 'three';
  import gsap from 'gsap';

  export type DiceSide = {
    label: string;
    textureUrl: string;
  };

  export let sides: DiceSide[] = [
    { label: 'Projet IA', textureUrl: '/assets/images/dice-face-1.svg' },
    { label: 'Fresque 2023', textureUrl: '/assets/images/dice-face-2.svg' },
    { label: 'Playlist Boom Bap', textureUrl: '/assets/images/dice-face-3.svg' },
    { label: 'Extrait Litté', textureUrl: '/assets/images/dice-face-4.svg' },
    { label: 'Tooling / Code', textureUrl: '/assets/images/dice-face-5.svg' },
    { label: 'Live / Jam', textureUrl: '/assets/images/dice-face-6.svg' }
  ];

  let container: HTMLDivElement | null = null;
  let labelEl: HTMLDivElement | null = null;
  let buttonEl: HTMLButtonElement | null = null;

  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let cube: THREE.Mesh<THREE.BoxGeometry, THREE.Material[]> | null = null;

  let frameId: number | null = null;
  let isVisible = true;
  let isAnimating = false;

  // Floating “physics” (DOM-level). The WebGL scene only rerenders when cube animates.
  export let floating = true;
  let diceSize = 240;
  const padding = 14;
  // Heavier feel: less bounce, more damping.
  const restitution = 0.56;
  const damping = 0.965;

  let dragging = false;
  let dragPointerId: number | null = null;
  let dragOffset = { x: 0, y: 0 };
  let dragStart = { x: 0, y: 0, t: 0 };
  let lastSample = { x: 0, y: 0, t: 0 };
  let throwVel = { x: 0, y: 0 };

  let pos = { x: 0, y: 0 };
  let vel = { x: 0, y: 0 };
  let physicsRaf: number | null = null;
  let lastT = 0;
  let prefersReducedMotion = false;

  let pendingLabel: string | null = null;
  let resultReady = false;
  let resultShown = false;

  let auraEl: HTMLDivElement | null = null;
  let lastAuraAt = 0;

  let resizeObserver: ResizeObserver | null = null;
  let intersectionObserver: IntersectionObserver | null = null;

  const orientations: Array<[number, number, number]> = [
    // These eulers are "good enough" for landing a face forward.
    [0, 0, 0],
    [0, Math.PI / 2, 0],
    [0, Math.PI, 0],
    [0, -Math.PI / 2, 0],
    [-Math.PI / 2, 0, 0],
    [Math.PI / 2, 0, 0]
  ];

  function renderOnce() {
    if (!renderer || !scene || !camera) return;
    renderer.render(scene, camera);
  }

  function loop() {
    frameId = null;
    if (!renderer || !scene || !camera) return;

    renderOnce();

    if ((isVisible && isAnimating) || (isVisible && renderer.info.render.frame < 2)) {
      frameId = requestAnimationFrame(loop);
    }
  }

  function ensureLoop() {
    if (frameId != null) return;
    frameId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (frameId != null) cancelAnimationFrame(frameId);
    frameId = null;
  }

  function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
  }

  function computeDiceSize() {
    const w = window.innerWidth;
    // Brutaliste, chunky, but not screen-hogging.
    diceSize = clamp(Math.floor(w * 0.22), 140, 210);
  }

  function keepInBounds() {
    const maxX = Math.max(padding, window.innerWidth - diceSize - padding);
    const maxY = Math.max(padding, window.innerHeight - diceSize - padding);
    pos.x = clamp(pos.x, padding, maxX);
    pos.y = clamp(pos.y, padding, maxY);
  }

  function startPhysics() {
    if (physicsRaf != null || prefersReducedMotion) return;
    lastT = performance.now();
    physicsRaf = requestAnimationFrame(stepPhysics);
  }

  function stopPhysics() {
    if (physicsRaf != null) cancelAnimationFrame(physicsRaf);
    physicsRaf = null;
  }

  function stepPhysics(t: number) {
    physicsRaf = null;
    const dt = Math.min(0.04, Math.max(0.001, (t - lastT) / 1000));
    lastT = t;

    pos.x += vel.x * dt;
    pos.y += vel.y * dt;

    // Exponential damping tuned for ~60fps.
    const d = Math.pow(damping, dt * 60);
    vel.x *= d;
    vel.y *= d;

    const maxX = Math.max(padding, window.innerWidth - diceSize - padding);
    const maxY = Math.max(padding, window.innerHeight - diceSize - padding);

    // Bounce on viewport edges.
    if (pos.x <= padding) {
      pos.x = padding;
      vel.x = Math.abs(vel.x) * restitution;
    } else if (pos.x >= maxX) {
      pos.x = maxX;
      vel.x = -Math.abs(vel.x) * restitution;
    }

    if (pos.y <= padding) {
      pos.y = padding;
      vel.y = Math.abs(vel.y) * restitution;
    } else if (pos.y >= maxY) {
      pos.y = maxY;
      vel.y = -Math.abs(vel.y) * restitution;
    }

    // Stop when it calms down.
    const speed = Math.hypot(vel.x, vel.y);
    if (speed < 12) {
      vel.x = 0;
      vel.y = 0;
      maybeRevealResult();
      return;
    }

    physicsRaf = requestAnimationFrame(stepPhysics);
  }

  function setupThree() {
    if (!container) return;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0.2, 2.4);

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(2, 3, 4);
    scene.add(ambient, key);

    const loader = new THREE.TextureLoader();
    const textures = sides.slice(0, 6).map((s) => loader.load(s.textureUrl, () => renderOnce()));
    const bumpUrls = sides
      .slice(0, 6)
      .map((s) => s.textureUrl.replace('/assets/images/dice-face-', '/assets/images/dice-bump-'));
    const bumpTextures = bumpUrls.map((u) => loader.load(u, () => renderOnce()));

    textures.forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 2;
    });

    bumpTextures.forEach((t) => {
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = 2;
    });

    const mats = textures.map((t, i) =>
      new THREE.MeshStandardMaterial({
        map: t,
        bumpMap: bumpTextures[i],
        bumpScale: 0.11,
        roughness: 0.78,
        metalness: 0.06
      })
    );

    const geom = new THREE.BoxGeometry(1, 1, 1);
    cube = new THREE.Mesh(geom, mats);
    cube.rotation.set(0.25, 0.4, 0);
    scene.add(cube);

    resize();
    renderOnce();
  }

  function resize() {
    if (!container || !renderer || !camera) return;

    const rect = container.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));

    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderOnce();
  }

  function setResultText(text: string) {
    if (!labelEl) return;
    labelEl.textContent = text;
  }

  function atRest() {
    return !dragging && vel.x === 0 && vel.y === 0;
  }

  function triggerAura() {
    if (!auraEl) return;
    const now = performance.now();
    if (now - lastAuraAt < 220) return;
    lastAuraAt = now;

    const sparks = Array.from(auraEl.querySelectorAll('.spark')) as HTMLSpanElement[];
    const s = diceSize;
    const cx = s / 2;
    const cy = s / 2;
    const r = s * 0.48;

    sparks.forEach((sp, i) => {
      const a = (i / sparks.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const jitter = (Math.random() - 0.5) * (s * 0.06);
      const x = cx + Math.cos(a) * (r + jitter);
      const y = cy + Math.sin(a) * (r + jitter);
      gsap.set(sp, {
        x: x - cx,
        y: y - cy,
        opacity: 0,
        scale: 0.65 + Math.random() * 0.4
      });
    });

    gsap.killTweensOf(auraEl);
    sparks.forEach((sp) => gsap.killTweensOf(sp));

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.set(auraEl, { opacity: 0 })
      .to(auraEl, { opacity: 1, duration: 0.16 }, 0)
      .to(auraEl, { opacity: 0, duration: 0.6, delay: 0.35 }, 0);

    tl.to(
      sparks,
      {
        opacity: 1,
        duration: 0.14,
        stagger: 0.02
      },
      0.04
    );
    tl.to(
      sparks,
      {
        opacity: 0,
        scale: 0.35,
        duration: 0.55,
        stagger: 0.01
      },
      0.18
    );
  }

  function maybeRevealResult() {
    if (!resultReady || resultShown) return;
    if (!pendingLabel) return;
    if (!atRest()) return;
    resultShown = true;
    setResultText(pendingLabel);
    triggerAura();
  }

  function roll() {
    if (!cube || !isVisible) return;

    const idx = Math.floor(Math.random() * Math.min(6, sides.length));
    const [rx, ry, rz] = orientations[idx];

    pendingLabel = sides[idx]?.label ?? '...';
    resultReady = false;
    resultShown = false;
    setResultText('—');

    isAnimating = true;
    ensureLoop();

    const spins = 2 + Math.floor(Math.random() * 2);

    gsap.killTweensOf(cube.rotation);
    gsap.killTweensOf(cube.position);

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onUpdate: ensureLoop,
      onComplete: () => {
        isAnimating = false;
        if (!isVisible) stopLoop();
        else renderOnce();

        resultReady = true;
        maybeRevealResult();
      }
    });

    tl.to(
      cube.position,
      {
        duration: 0.18,
        y: 0.22,
        ease: 'power2.out'
      },
      0
    );

    tl.to(
      cube.rotation,
      {
        duration: 0.95,
        x: rx + Math.PI * 2 * spins,
        y: ry + Math.PI * 2 * spins,
        z: rz + Math.PI * 2 * (spins - 1)
      },
      0
    );

    tl.to(
      cube.position,
      {
        duration: 0.22,
        y: 0,
        ease: 'bounce.out'
      },
      0.72
    );
  }

  function onClick() {
    // Click = roll in place (no throw).
    roll();
  }

  function onPointerDown(e: PointerEvent) {
    if (!buttonEl || prefersReducedMotion) return;
    dragging = true;
    dragPointerId = e.pointerId;
    buttonEl.setPointerCapture(e.pointerId);

    stopPhysics();

    const rect = buttonEl.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;

    dragStart = { x: e.clientX, y: e.clientY, t: performance.now() };
    lastSample = { x: e.clientX, y: e.clientY, t: performance.now() };
    throwVel = { x: 0, y: 0 };
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || dragPointerId !== e.pointerId) return;

    // Move dice with pointer.
    pos.x = e.clientX - dragOffset.x;
    pos.y = e.clientY - dragOffset.y;
    keepInBounds();

    // Estimate throw velocity from last delta.
    const now = performance.now();
    const dt = Math.max(8, now - lastSample.t);
    const vx = ((e.clientX - lastSample.x) / dt) * 1000;
    const vy = ((e.clientY - lastSample.y) / dt) * 1000;
    throwVel.x = vx;
    throwVel.y = vy;
    lastSample = { x: e.clientX, y: e.clientY, t: now };
  }

  function onPointerUp(e: PointerEvent) {
    if (!buttonEl || !dragging || dragPointerId !== e.pointerId) return;

    dragging = false;
    dragPointerId = null;
    try {
      buttonEl.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 6) {
      // Treat as click.
      onClick();
      return;
    }

    // Throw: clamp velocity for “heavy” feel.
    vel.x = clamp(throwVel.x * 0.85, -980, 980);
    vel.y = clamp(throwVel.y * 0.85, -980, 980);
    startPhysics();
    roll();
  }

  onMount(() => {
    prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

    computeDiceSize();
    // Start bottom-left.
    pos.x = padding;
    pos.y = Math.max(padding, window.innerHeight - diceSize - padding);

    setupThree();

    resizeObserver = new ResizeObserver(() => {
      computeDiceSize();
      keepInBounds();
      resize();
    });
    if (container) resizeObserver.observe(container);

    intersectionObserver = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        isVisible = Boolean(e?.isIntersecting);
        if (!isVisible && !isAnimating) stopLoop();
        if (isVisible) {
          renderOnce();
        }
      },
      { threshold: 0.15 }
    );

    if (buttonEl) intersectionObserver.observe(buttonEl);

    const onResize = () => {
      computeDiceSize();
      keepInBounds();
    };

    const onVisibility = () => {
      if (document.hidden) stopPhysics();
    };

    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (intersectionObserver) intersectionObserver.disconnect();
      if (resizeObserver) resizeObserver.disconnect();
      stopLoop();
      stopPhysics();

      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);

      if (renderer) {
        renderer.dispose();
        renderer.domElement?.remove();
      }

      cube?.geometry.dispose();
      if (Array.isArray(cube?.material)) {
        cube?.material.forEach((m: any) => {
          if (m.map) m.map.dispose?.();
          if (m.bumpMap) m.bumpMap.dispose?.();
          m.dispose?.();
        });
      }

      scene = null;
      camera = null;
      cube = null;
      renderer = null;
    };
  });

  onDestroy(() => {
    if (intersectionObserver) intersectionObserver.disconnect();
    if (resizeObserver) resizeObserver.disconnect();
    stopLoop();
    stopPhysics();
  });
</script>

<div class="relative z-10 w-full">
  <div class="mb-2 flex items-center gap-3">
    <div class="font-display text-xl tracking-wide">Dé 3D</div>
    <div class="font-hand text-lg text-[color:var(--muted)]">(drag = lancer · clic = tourner)</div>
    <div bind:this={labelEl} class="ml-auto text-right text-sm font-black uppercase tracking-wide text-[color:var(--acid-yellow)]">
      —
    </div>
  </div>

  <!-- keeps layout space in embedded contexts -->
  <div class="brutal-border relative h-[320px] w-full bg-black/10" aria-hidden="true">
    <div class="pointer-events-none absolute inset-0 bg-graffiti opacity-10" aria-hidden="true"></div>
    <div class="pointer-events-none absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 text-xs font-black uppercase tracking-wide">
      Le dé flotte dans l'écran.
    </div>
  </div>

  <button
    bind:this={buttonEl}
    type="button"
    class="brutal-border fixed left-0 top-0 z-20 bg-black/30 text-left select-none touch-none"
    aria-label="Lancer le dé 3D"
    on:click={() => {
      if (prefersReducedMotion) onClick();
    }}
    on:pointerdown={onPointerDown}
    on:pointermove={onPointerMove}
    on:pointerup={onPointerUp}
    on:pointercancel={onPointerUp}
    style={`width:${diceSize}px;height:${diceSize}px;transform:translate3d(${pos.x}px, ${pos.y}px, 0) rotate(${clamp((vel.x + vel.y) * 0.0016, -6, 6)}deg);`}
    class:cursor-grab={!dragging && !prefersReducedMotion}
    class:cursor-grabbing={dragging}
  >
    <div class="pointer-events-none absolute inset-0 noise-overlay" aria-hidden="true"></div>
    <div bind:this={container} class="absolute inset-0" />

    <div bind:this={auraEl} class="pointer-events-none absolute inset-0 opacity-0" aria-hidden="true">
      <div class="aura"></div>
      <span class="spark"></span>
      <span class="spark"></span>
      <span class="spark"></span>
      <span class="spark"></span>
      <span class="spark"></span>
      <span class="spark"></span>
      <span class="spark"></span>
      <span class="spark"></span>
    </div>
  </button>
</div>

<style>
  .aura {
    position: absolute;
    inset: -10px;
    border-radius: 18px;
    background:
      radial-gradient(closest-side, rgba(255, 0, 0, 0.18), rgba(255, 0, 0, 0) 70%),
      radial-gradient(closest-side, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0) 74%);
    filter: blur(0.2px);
  }

  .spark {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 6px;
    height: 6px;
    margin-left: -3px;
    margin-top: -3px;
    border-radius: 999px;
    background: rgba(255, 80, 80, 0.9);
    box-shadow:
      0 0 10px rgba(255, 0, 0, 0.55),
      0 0 24px rgba(255, 0, 0, 0.25);
    opacity: 0;
    transform: translate3d(0, 0, 0);
  }
</style>
