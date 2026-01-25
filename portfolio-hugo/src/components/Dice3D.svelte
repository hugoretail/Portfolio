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

  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let cube: THREE.Mesh<THREE.BoxGeometry, THREE.Material[]> | null = null;

  let frameId: number | null = null;
  let isVisible = true;
  let isAnimating = false;

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

    textures.forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 2;
    });

    const mats = textures.map(
      (t) =>
        new THREE.MeshStandardMaterial({
          map: t,
          roughness: 0.65,
          metalness: 0.15
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

  function roll() {
    if (!cube || !isVisible) return;

    const idx = Math.floor(Math.random() * Math.min(6, sides.length));
    const [rx, ry, rz] = orientations[idx];

    setResultText(sides[idx]?.label ?? '...');

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

  onMount(() => {
    setupThree();

    resizeObserver = new ResizeObserver(() => resize());
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

    if (container) intersectionObserver.observe(container);

    return () => {
      if (intersectionObserver) intersectionObserver.disconnect();
      if (resizeObserver) resizeObserver.disconnect();
      stopLoop();

      if (renderer) {
        renderer.dispose();
        renderer.domElement?.remove();
      }

      cube?.geometry.dispose();
      if (Array.isArray(cube?.material)) {
        cube?.material.forEach((m: any) => {
          if (m.map) m.map.dispose?.();
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
  });
</script>

<div class="relative z-10 w-full">
  <div class="mb-2 flex items-center gap-3">
    <div class="font-display text-xl tracking-wide">Dé 3D</div>
    <div class="font-hand text-lg text-[color:var(--muted)]">(clic = lancer)</div>
    <div bind:this={labelEl} class="ml-auto text-right text-sm font-black uppercase tracking-wide text-[color:var(--acid-yellow)]">
      —
    </div>
  </div>

  <button
    type="button"
    class="brutal-border relative block h-[320px] w-full bg-black/30 text-left"
    aria-label="Lancer le dé 3D"
    on:click={roll}
  >
    <div class="pointer-events-none absolute inset-0 noise-overlay" aria-hidden="true"></div>
    <div bind:this={container} class="absolute inset-0" />
    <div class="pointer-events-none absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 text-xs font-black uppercase tracking-wide">
      Clique pour tirer un thème
    </div>
  </button>
</div>
