<script lang="ts">
  import gsap from 'gsap';
  import { onDestroy, onMount } from 'svelte';
  import * as THREE from 'three';
  import { withBase } from '../lib/withBase';

  export type DiceSide = {
    label: string;
    textureUrl: string;
    href: string;
  };

  export let sides: DiceSide[] = [
    { label: 'Informatique', textureUrl: withBase('/assets/images/dice-face-1.svg'), href: withBase('/informatique') },
    { label: 'Fresque 2023', textureUrl: withBase('/assets/images/dice-face-2.svg'), href: withBase('/graffiti') },
    { label: 'Playlist Boom Bap', textureUrl: withBase('/assets/images/dice-face-3.svg'), href: withBase('/hiphop') },
    { label: 'Forêt Num.', textureUrl: withBase('/assets/images/dice-face-4.svg'), href: withBase('/environnement') },
    { label: 'Tooling / Code', textureUrl: withBase('/assets/images/dice-face-5.svg'), href: withBase('/moi') },
    { label: 'Live / Jam', textureUrl: withBase('/assets/images/dice-face-6.svg'), href: withBase('/hiphop') }
  ];

  let container: HTMLDivElement | null = null;
  let labelEl: HTMLSpanElement | null = null;
  let buttonEl: HTMLButtonElement | null = null;
  let boundsEl: HTMLDivElement | null = null;

  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let cube: THREE.Mesh<THREE.BoxGeometry, THREE.Material[]> | null = null;

  let frameId: number | null = null;
  let isVisible = true;
  let isAnimating = false;

  // Floating “physics” (DOM-level). The WebGL scene only rerenders when cube animates.
  export let floating = true;
  $: floating;
  let diceSize = 240;
  const padding = 14;
  // Heavier feel: less bounce, more damping.
  const restitution = 0.56;
  const damping = 0.965;
  const angularDamping = 0.955;

  let dragging = false;
  let dragPointerId: number | null = null;
  let dragOffset = { x: 0, y: 0 };
  let dragStart = { x: 0, y: 0, t: 0 };
  let lastSample = { x: 0, y: 0, t: 0 };
  let throwVel = { x: 0, y: 0 };

  let pos = { x: -1200, y: -1200 };
  let vel = { x: 0, y: 0 };
  let physicsRaf: number | null = null;
  let lastT = 0;
  let prefersReducedMotion = false;

  let angularVel = new THREE.Vector3(0, 0, 0); // rad/s
  let throwSpeed0 = 0;

  let isReady = false;
  let lastResultFace: number | null = null;
  let resultFaceHistory: number[] = [];

  function rememberResultFace(idx: number) {
    // Keep a short history to reduce streaks.
    resultFaceHistory = [...resultFaceHistory, idx].slice(-3);
  }

  const stableQuats: THREE.Quaternion[] = [];
  const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  for (const ax of angles) {
    for (const ay of angles) {
      for (const az of angles) {
        stableQuats.push(new THREE.Quaternion().setFromEuler(new THREE.Euler(ax, ay, az, 'XYZ')));
      }
    }
  }

  let pendingLabel: string | null = null;
  let pendingHref: string | null = null;
  let resultReady = false;
  let resultShown = false;

  let auraEl: HTMLDivElement | null = null;
  let lastAuraAt = 0;

  let resizeObserver: ResizeObserver | null = null;
  let intersectionObserver: IntersectionObserver | null = null;

  // BoxGeometry material order: +X, -X, +Y, -Y, +Z, -Z
  const faceNormals = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1)
  ];

  function faceIndexFromOrientation() {
    if (!cube || !camera) return 0;
    // "Result" = face most towards the camera (what the user actually sees).
    const dir = new THREE.Vector3().subVectors(camera.position, cube.position).normalize();

    let bestIdx = 0;
    let bestDot = -Infinity;
    for (let i = 0; i < faceNormals.length; i++) {
      const n = faceNormals[i].clone().applyQuaternion(cube.quaternion);
      const d = n.dot(dir);
      if (d > bestDot) {
        bestDot = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  function faceIndexForQuaternion(q: THREE.Quaternion) {
    if (!camera) return 0;
    const dir = new THREE.Vector3().subVectors(camera.position, new THREE.Vector3(0, 0, 0)).normalize();

    let bestIdx = 0;
    let bestDot = -Infinity;
    for (let i = 0; i < faceNormals.length; i++) {
      const n = faceNormals[i].clone().applyQuaternion(q);
      const d = n.dot(dir);
      if (d > bestDot) {
        bestDot = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

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
      angularVel.add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.9, (Math.random() - 0.5) * 0.35));
    } else if (pos.x >= maxX) {
      pos.x = maxX;
      vel.x = -Math.abs(vel.x) * restitution;
      angularVel.add(new THREE.Vector3((Math.random() - 0.5) * 0.8, -0.9, (Math.random() - 0.5) * 0.35));
    }

    if (pos.y <= padding) {
      pos.y = padding;
      vel.y = Math.abs(vel.y) * restitution;
      angularVel.add(new THREE.Vector3(0.9, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.35));
    } else if (pos.y >= maxY) {
      pos.y = maxY;
      vel.y = -Math.abs(vel.y) * restitution;
      angularVel.add(new THREE.Vector3(-0.9, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.35));
    }

    // Stop when it calms down.
    const speed = Math.hypot(vel.x, vel.y);

    // Spin while moving. Near stop, ease into the chosen face.
    if (cube && isVisible) {
      isAnimating = true;
      ensureLoop();

      const ad = Math.pow(angularDamping, dt * 60);
      angularVel.multiplyScalar(ad);

      // Link tumble intensity to throw speed (natural taper as speed drops).
      const base = 0.55; // rad/s
      const s0 = Math.max(1, throwSpeed0 || speed);
      const speedRatio = clamp(speed / s0, 0, 1);
      const desiredMag = base + (14.5 * Math.pow(speedRatio, 0.85));
      const curMag = angularVel.length();
      if (curMag > 0.0001) {
        const mag = curMag + (desiredMag - curMag) * (1 - Math.pow(0.02, dt));
        angularVel.multiplyScalar(mag / curMag);
      }

      const spinSpeed = angularVel.length();
      if (spinSpeed > 0.0001) {
        const axis = angularVel.clone().normalize();
        const angle = spinSpeed * dt;
        const dq = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        cube.quaternion.multiply(dq);
      }

      // No forced snapping: the result is derived from where the dice ends.
    }

    if (speed < 12) {
      // Let it “land” into a stable pose before revealing.
      settleLanding();
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

  function goToResult(e?: Event) {
    if (e) e.preventDefault();
    if (!pendingHref || !resultShown) return;
    window.location.assign(pendingHref);
  }

  function atRest() {
    return !dragging && vel.x === 0 && vel.y === 0;
  }

  function nearestStableQuaternion(q: THREE.Quaternion) {
    // Snap to the closest axis-aligned cube orientation (multiples of 90deg).
    // This removes micro-tilt and makes the stop feel “landed”.
    const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    let best = new THREE.Quaternion();
    let bestDot = -1;
    for (const ax of angles) {
      for (const ay of angles) {
        for (const az of angles) {
          const cand = new THREE.Quaternion().setFromEuler(new THREE.Euler(ax, ay, az, 'XYZ'));
          const d = Math.abs(cand.dot(q));
          if (d > bestDot) {
            bestDot = d;
            best = cand;
          }
        }
      }
    }
    return best;
  }

  function pickStableQuaternion(from: THREE.Quaternion) {
    // Snap to a stable cube orientation, but avoid short streaks.
    // We keep the stop feeling “close to where it was going”, while letting the landing vary.
    const ranked = stableQuats
      .map((cand) => ({ cand, d: Math.abs(cand.dot(from)) }))
      .sort((a, b) => b.d - a.d);

    const top = ranked.slice(0, 16);
    const avoid = new Set<number>(resultFaceHistory.slice(-2));
    if (lastResultFace != null) avoid.add(lastResultFace);

    const filtered = top.filter((t) => !avoid.has(faceIndexForQuaternion(t.cand)));
    const poolSource = filtered.length ? filtered : top;
    const pool = poolSource.slice(0, Math.min(4, poolSource.length));
    const pick = pool[Math.floor(Math.random() * pool.length)];

    return pick?.cand ?? ranked[0]?.cand ?? from;
  }

  function settleLanding() {
    if (!cube) return;

    // Cancel any ongoing tweens that could fight the settle.
    gsap.killTweensOf(cube.rotation);
    gsap.killTweensOf(cube.position);

    // Freeze the “physics” state.
    vel.x = 0;
    vel.y = 0;
    angularVel.set(0, 0, 0);
    throwSpeed0 = 0;

    isAnimating = true;
    ensureLoop();

    const from = cube.quaternion.clone();
    const to = pickStableQuaternion(from);
    const q = from.clone();

    const proxy = { t: 0 };
    gsap.to(proxy, {
      t: 1,
      duration: 0.26,
      ease: 'power3.out',
      onUpdate: () => {
        q.copy(from).slerp(to, proxy.t);
        cube!.quaternion.copy(q);
        // tiny “plant” compression
        cube!.position.y = (1 - proxy.t) * 0.05;
        ensureLoop();
      },
      onComplete: () => {
        cube!.quaternion.copy(to);
        cube!.position.y = 0;

        isAnimating = false;
        if (!isVisible) stopLoop();
        else renderOnce();

        resultReady = true;
        maybeRevealResult();
      }
    });
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
    if (!atRest()) return;
    if (!cube) return;

    const idx = faceIndexFromOrientation();
    lastResultFace = idx;
    rememberResultFace(idx);
    pendingLabel = sides[idx]?.label ?? '...';
    pendingHref = sides[idx]?.href ?? null;
    resultShown = true;
    setResultText(pendingLabel);
    triggerAura();
  }

  function roll() {
    if (!cube || !isVisible) return;

    pendingLabel = null;
    pendingHref = null;
    resultReady = false;
    resultShown = false;
    setResultText('—');

    isAnimating = true;
    ensureLoop();

    const spins = 2 + Math.floor(Math.random() * 2);

    const rx = cube.rotation.x + Math.PI * 2 * spins + (Math.random() - 0.5) * 0.8;
    const ry = cube.rotation.y + Math.PI * 2 * (spins + 1) + (Math.random() - 0.5) * 0.8;
    const rz = cube.rotation.z + Math.PI * 2 * (spins - 1) + (Math.random() - 0.5) * 0.6;

    gsap.killTweensOf(cube.rotation);
    gsap.killTweensOf(cube.position);

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onUpdate: ensureLoop,
      onComplete: () => {
        // Stabilize into a “landed” orientation, then reveal.
        settleLanding();
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
        x: rx,
        y: ry,
        z: rz
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

    // Reset label; final result is derived from the settled orientation.
    pendingLabel = null;
    pendingHref = null;
    resultReady = false;
    resultShown = false;
    setResultText('—');

    if (cube) {
      gsap.killTweensOf(cube.rotation);
      gsap.killTweensOf(cube.position);
    }

    const vmag = Math.hypot(vel.x, vel.y);
    throwSpeed0 = Math.max(1, vmag);

    // Initial tumble is derived from throw direction + speed.
    const spin = clamp(2.4 + vmag * 0.018, 4.2, 18.5);
    // More variety: mix throw-direction torque with a random axis so outcomes don't bias.
    const throwAxis = new THREE.Vector3(vel.y / 900, -vel.x / 900, 0);
    const randAxis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, (Math.random() - 0.5) * 1.2);
    const axis = throwAxis.multiplyScalar(0.55).add(randAxis.multiplyScalar(0.85));
    if (axis.lengthSq() < 0.0001) axis.set(0.2, 1, 0.1);
    axis.normalize();
    angularVel.copy(axis.multiplyScalar(spin));

    isAnimating = true;
    startPhysics();
  }

  onMount(() => {
    prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

    computeDiceSize();
    // Spawn in the bottom-right of the "Dé 3D" frame, then roam freely.
    requestAnimationFrame(() => {
      computeDiceSize();
      const rect = boundsEl?.getBoundingClientRect();
      if (rect) {
        pos.x = rect.right - diceSize - padding;
        pos.y = rect.bottom - diceSize - padding;
      } else {
        pos.x = window.innerWidth - diceSize - padding;
        pos.y = Math.max(padding, window.innerHeight - diceSize - padding);
      }
      keepInBounds();

      // Avoid the initial top-left empty-frame flash: reveal once positioned.
      isReady = true;
    });

    setupThree();

    // Hide until WebGL canvas is appended and sized at least once.
    requestAnimationFrame(() => {
      resize();
      renderOnce();
    });

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
    <a
      class="ml-auto inline-flex items-center gap-2 text-right text-sm font-black uppercase tracking-wide text-[color:var(--acid-yellow)]"
      href={resultShown && pendingHref ? pendingHref : '#'}
      aria-disabled={resultShown && pendingHref ? 'false' : 'true'}
      tabindex={resultShown && pendingHref ? 0 : -1}
      on:click={(e) => {
        if (!(resultShown && pendingHref)) {
          e.preventDefault();
          return;
        }
        goToResult(e);
      }}
    >
      <span
        bind:this={labelEl}
        class={resultShown && pendingHref ? 'cursor-pointer underline decoration-[color:var(--acid-yellow)]/35 underline-offset-4' : ''}
      >
        —
      </span>
      <span
        aria-hidden="true"
        class={resultShown && pendingHref ? 'opacity-55 translate-y-[0.5px]' : 'opacity-0'}
      >
        ↗
      </span>
    </a>
  </div>

  <!-- keeps layout space in embedded contexts (also used as spawn reference) -->
  <div bind:this={boundsEl} class="brutal-border relative h-[320px] w-full bg-black/10" aria-hidden="true">
    <div class="pointer-events-none absolute inset-0 bg-graffiti opacity-10" aria-hidden="true"></div>
    <div class="pointer-events-none absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 text-xs font-black uppercase tracking-wide">
      Laissez vous tenter !
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
    style={`width:${diceSize}px;height:${diceSize}px;opacity:${isReady ? 1 : 0};transform:translate3d(${pos.x}px, ${pos.y}px, 0) rotate(${clamp((vel.x + vel.y) * 0.0016, -6, 6)}deg);`}
    class:cursor-grab={!dragging && !prefersReducedMotion}
    class:cursor-grabbing={dragging}
  >
    <div class="pointer-events-none absolute inset-0 noise-overlay" aria-hidden="true"></div>
    <div bind:this={container} class="absolute inset-0"></div>

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
  button {
    transition: opacity 180ms ease;
  }

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
