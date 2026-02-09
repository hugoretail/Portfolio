<script lang="ts">
  import { onDestroy, onMount } from 'svelte';

  // LIGHT by default: few strokes + CSS dash animation.
  export let density = 5;
  export let tint: 'fire' | 'mono' = 'fire';
  export let randomize = true;
  export let regenOnCycleEnd = true;
  // One shared cycle for all strokes (calmer + allows safe regeneration on boundary)
  export let cycleSeconds = 26;

  let hostA: HTMLDivElement | null = null;
  let hostB: HTMLDivElement | null = null;
  let activeLayer: 'a' | 'b' = 'a';
  let regenTimer: number | null = null;

  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  function mulberry32(seed: number) {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pickPalette(mode: 'fire' | 'mono') {
    if (mode === 'mono') {
      return ['rgba(246,246,246,0.30)', 'rgba(246,246,246,0.18)', 'rgba(185,185,185,0.22)'];
    }
    return [
      'rgba(255,0,0,0.28)',
      'rgba(255,59,212,0.16)',
      'rgba(0,209,255,0.16)',
      'rgba(255,230,0,0.12)',
      'rgba(246,246,246,0.16)'
    ];
  }

  function makePathFromPoints(points: Array<{ x: number; y: number }>) {
    if (points.length < 2) return '';
    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const cur = points[i];
      const cp1x = (prev.x + cur.x) / 2;
      const cp1y = prev.y;
      const cp2x = (prev.x + cur.x) / 2;
      const cp2y = cur.y;
      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${cur.x.toFixed(2)} ${cur.y.toFixed(2)}`;
    }
    return d;
  }

  function dist2(a: { x: number; y: number }, b: { x: number; y: number }) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function pickAnchors(rand: () => number, count: number, W: number, H: number) {
    // Dart-throwing: avoids visible "zones" while still reducing collisions.
    const anchors: Array<{ x: number; y: number }> = [];
    const minD = 140;
    const minD2 = minD * minD;
    const triesPer = 18;

    for (let i = 0; i < count; i++) {
      let best: { x: number; y: number } | null = null;
      let bestScore = -1;

      for (let t = 0; t < triesPer; t++) {
        const p = { x: 40 + rand() * (W - 80), y: 40 + rand() * (H - 80) };
        let score = Infinity;
        for (const a of anchors) score = Math.min(score, dist2(p, a));
        if (anchors.length === 0) score = minD2;
        if (score > bestScore) {
          bestScore = score;
          best = p;
        }
      }

      if (best) anchors.push(best);
    }

    return anchors;
  }

  function wrapX(x: number, W: number) {
    // True wrap (not clamp) to enable "exit left, appear right" tricks.
    let xx = x;
    while (xx < 0) xx += W;
    while (xx > W) xx -= W;
    return xx;
  }

  function makeWrapWalk(rand: () => number, start: { x: number; y: number }, W: number, H: number) {
    // Random walk that occasionally exits the screen and re-enters on the other side.
    const points: Array<{ x: number; y: number; move?: boolean }> = [];
    let x = start.x;
    let y = start.y;
    points.push({ x, y });

    const steps = 9 + Math.floor(rand() * 10);
    for (let i = 0; i < steps; i++) {
      const a = (rand() * Math.PI * 2);
      const len = 80 + rand() * 180;
      let nx = x + Math.cos(a) * len;
      let ny = y + Math.sin(a) * len;

      // Occasionally force a "screen-edge" move.
      if (rand() < 0.25) {
        const goLeft = rand() < 0.5;
        nx = goLeft ? -20 - rand() * 140 : W + 20 + rand() * 140;
        ny = clamp(ny, 40, H - 40);
      }

      const wrapped = nx < 0 || nx > W;
      nx = wrapped ? wrapX(nx, W) : clamp(nx, 40, W - 40);
      ny = clamp(ny, 40, H - 40);

      if (wrapped) {
        // Break path: teleport re-entry feels like a screen wrap.
        points.push({ x: nx, y: ny, move: true });
      } else {
        points.push({ x: nx, y: ny });
      }

      x = nx;
      y = ny;
    }

    // Build d with hard breaks for wrap segments.
    let d = '';
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i === 0 || p.move) {
        d += `M ${p.x.toFixed(2)} ${p.y.toFixed(2)} `;
      } else {
        d += `L ${p.x.toFixed(2)} ${p.y.toFixed(2)} `;
      }
    }
    return d.trim();
  }

  function makeGlitchBracket(rand: () => number, start: { x: number; y: number }, W: number, H: number) {
    // A "UI bracket" / HUD shape with micro jitter.
    const x = clamp(start.x, 60, W - 60);
    const y = clamp(start.y, 60, H - 60);
    const w = 70 + rand() * 160;
    const h = 40 + rand() * 120;
    const j = () => (rand() - 0.5) * 6;
    const x2 = clamp(x + w, 40, W - 40);
    const y2 = clamp(y + h, 40, H - 40);
    return (
      `M ${(x + j()).toFixed(2)} ${(y + j()).toFixed(2)} L ${(x2 + j()).toFixed(2)} ${(y + j()).toFixed(2)} ` +
      `M ${(x + j()).toFixed(2)} ${(y + j()).toFixed(2)} L ${(x + j()).toFixed(2)} ${(y2 + j()).toFixed(2)} ` +
      `M ${(x2 + j()).toFixed(2)} ${(y2 + j()).toFixed(2)} L ${(x2 + j()).toFixed(2)} ${(y + h * 0.45 + j()).toFixed(2)} ` +
      `M ${(x2 + j()).toFixed(2)} ${(y2 + j()).toFixed(2)} L ${(x + w * 0.55 + j()).toFixed(2)} ${(y2 + j()).toFixed(2)}`
    );
  }

  function makeCalligraphySwash(rand: () => number, start: { x: number; y: number }, W: number, H: number) {
    // One or two elegant cubic swashes (more "calligraphy" than geometry).
    const sx = clamp(start.x, 80, W - 80);
    const sy = clamp(start.y, 80, H - 80);

    const len = 320 + rand() * 420;
    const tilt = (rand() - 0.5) * 0.75;
    const ex = clamp(sx + Math.cos(tilt) * len, 60, W - 60);
    const ey = clamp(sy + Math.sin(tilt) * len * 0.35, 60, H - 60);

    const amp = 90 + rand() * 140;
    const c1x = clamp(sx + len * 0.18, 40, W - 40);
    const c1y = clamp(sy - amp, 40, H - 40);
    const c2x = clamp(sx + len * 0.62, 40, W - 40);
    const c2y = clamp(sy + amp * (0.65 + rand() * 0.35), 40, H - 40);

    let d = `M ${sx.toFixed(2)} ${sy.toFixed(2)} C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${ex.toFixed(2)} ${ey.toFixed(2)}`;

    if (rand() < 0.55) {
      // Add a second trailing flourish.
      const ex2 = clamp(ex + (rand() - 0.5) * 260, 60, W - 60);
      const ey2 = clamp(ey + (rand() - 0.5) * 180, 60, H - 60);
      const c3x = clamp(ex + (rand() - 0.5) * 240, 40, W - 40);
      const c3y = clamp(ey + (rand() - 0.5) * 240, 40, H - 40);
      const c4x = clamp(ex2 + (rand() - 0.5) * 240, 40, W - 40);
      const c4y = clamp(ey2 + (rand() - 0.5) * 240, 40, H - 40);
      d += ` C ${c3x.toFixed(2)} ${c3y.toFixed(2)}, ${c4x.toFixed(2)} ${c4y.toFixed(2)}, ${ex2.toFixed(2)} ${ey2.toFixed(2)}`;
    }

    return d;
  }

  function makeFlourishLoop(rand: () => number, start: { x: number; y: number }, W: number, H: number) {
    // A small loop / infinity-ish flourish.
    const cx = clamp(start.x, 120, W - 120);
    const cy = clamp(start.y, 120, H - 120);
    const rx = 80 + rand() * 140;
    const ry = 40 + rand() * 90;
    const j = () => (rand() - 0.5) * 10;
    return (
      `M ${(cx - rx + j()).toFixed(2)} ${(cy + j()).toFixed(2)} ` +
      `C ${(cx - rx * 0.2 + j()).toFixed(2)} ${(cy - ry + j()).toFixed(2)}, ${(cx - rx * 0.2 + j()).toFixed(2)} ${(cy + ry + j()).toFixed(2)}, ${(cx + j()).toFixed(2)} ${(cy + j()).toFixed(2)} ` +
      `C ${(cx + rx * 0.2 + j()).toFixed(2)} ${(cy - ry + j()).toFixed(2)}, ${(cx + rx * 0.2 + j()).toFixed(2)} ${(cy + ry + j()).toFixed(2)}, ${(cx + rx + j()).toFixed(2)} ${(cy + j()).toFixed(2)}`
    );
  }

  function generateSvg(seed = 1337) {
    const rand = mulberry32(seed);
    const colors = pickPalette(tint);
    const W = 1000;
    const H = 600;

    const cycleSec = clamp(cycleSeconds, 10, 34);

    const count = clamp(Math.round(density), 4, 10);
    const strokes: Array<{
      d: string;
      stroke: string;
      w: number;
      w0: number;
      w1: number;
      w2: number;
      alpha: number;
      i: number;
      dur: number;
      phase: number;
      cap: 'round' | 'butt' | 'square';
      join: 'round' | 'bevel' | 'miter';
      miter: number;
      gap: number;
      filter: '' | 'soft' | 'softer';
      ghosts: Array<{ dx: number; dy: number; wMul: number; aMul: number; phaseJitter: number }>;
    }> = [];

    const anchors = pickAnchors(rand, count, W, H);
    const kindsCount = 14;
    for (let i = 0; i < count; i++) {
      // fully random motif choice (prevents repeated patterns)
      const kind = Math.floor(rand() * kindsCount);
      const stroke = colors[Math.floor(rand() * colors.length)];
      // Wider width range + occasional very thick marker strokes.
      const wBase = 1.4 + rand() * 2.6 + (kind === 1 ? 0.6 : 0);
      const w = clamp(wBase + (rand() < 0.14 ? 1.3 + rand() * 1.8 : 0), 1.2, 5.2);
      const alpha = 0.30 + rand() * 0.32;

      // Calm + consistent: single shared duration. De-sync via phase only.
      const dur = cycleSec;
      const phase = rand() * dur;

      // Stroke feel randomness: caps/joins/miter + broken ink segments.
      const cap = ((): 'round' | 'butt' | 'square' => {
        const r = rand();
        if (r < 0.62) return 'round';
        if (r < 0.82) return 'square';
        return 'butt';
      })();

      const join = ((): 'round' | 'bevel' | 'miter' => {
        const r = rand();
        if (r < 0.50) return 'round';
        if (r < 0.82) return 'bevel';
        return 'miter';
      })();

      const miter = clamp(2 + rand() * 8, 2, 10);

      // Keep the draw animation intact by always using a dash of 1000.
      // Add an optional gap to create "broken" ink / interrupted strokes.
      const gap = rand() < 0.26 ? Math.floor(30 + rand() * 220) : 0;

      // Occasional subtle blur to simulate ink bleed (keep rare for perf).
      const filter: '' | 'soft' | 'softer' = rand() < 0.10 ? (rand() < 0.65 ? 'soft' : 'softer') : '';

      // Brush ghosts: 0-2 low-opacity duplicates with slight offset.
      const ghosts: Array<{ dx: number; dy: number; wMul: number; aMul: number; phaseJitter: number }> = [];
      if (rand() < 0.34) {
        const n = rand() < 0.50 ? 1 : 2;
        for (let g = 0; g < n; g++) {
          const dir = rand() * Math.PI * 2;
          const mag = 0.6 + rand() * 2.2;
          ghosts.push({
            dx: Math.cos(dir) * mag,
            dy: Math.sin(dir) * mag,
            wMul: 0.75 + rand() * 0.55,
            aMul: 0.22 + rand() * 0.26,
            phaseJitter: (rand() - 0.5) * (dur * 0.08)
          });
        }
      }

      let d = '';

      const a = anchors[i] ?? { x: 40 + rand() * (W - 80), y: 40 + rand() * (H - 80) };
      const zx = a.x;
      const zy = a.y;

      if (kind === 0) {
        // thread / cable
        const points: Array<{ x: number; y: number }> = [];
        const x0 = clamp(10 + rand() * 340, 10, 360);
        const n = 9 + Math.floor(rand() * 4);
        for (let k = 0; k < n; k++) {
          const t = k / (n - 1);
          points.push({
            x: x0 + Math.sin(t * Math.PI * (3 + rand() * 4) + rand() * 2) * (10 + rand() * 34),
            y: t * H
          });
        }
        d = makePathFromPoints(points);
      } else if (kind === 1) {
        // graffiti tag strokes (angular-ish)
        const points: Array<{ x: number; y: number }> = [];
        const cx = zx;
        const cy = zy;
        points.push({ x: cx, y: cy });

        let x = cx;
        let y = cy;
        const n = 6 + Math.floor(rand() * 4);
        for (let k = 0; k < n; k++) {
          const a = (Math.floor(rand() * 8) / 8) * Math.PI * 2;
          const len = 70 + rand() * 140;
          x = clamp(x + Math.cos(a) * len, 40, W - 40);
          y = clamp(y + Math.sin(a) * len, 40, H - 40);
          points.push({ x, y });
        }
        d = makePathFromPoints(points);
      } else if (kind === 2) {
        // circuit rectilinear path
        const points: Array<{ x: number; y: number }> = [];
        let x = zx;
        let y = zy;
        points.push({ x, y });

        const steps = 7 + Math.floor(rand() * 4);
        for (let k = 0; k < steps; k++) {
          const horizontal = k % 2 === 0;
          const len = 60 + rand() * 140;
          if (horizontal) x = clamp(x + (rand() > 0.5 ? 1 : -1) * len, 40, W - 40);
          else y = clamp(y + (rand() > 0.5 ? 1 : -1) * len, 40, H - 40);
          points.push({ x, y });
        }
        d = makePathFromPoints(points);
      } else if (kind === 3) {
        // leaf vein / fan
        const points: Array<{ x: number; y: number }> = [];
        const baseX = zx;
        const baseY = zy;
        const hh = 90 + rand() * 170;
        const angle = (-Math.PI / 2) + (rand() - 0.5) * 0.8;
        const dx = Math.cos(angle) * hh;
        const dy = Math.sin(angle) * hh;

        points.push({ x: baseX, y: baseY });
        const n = 6;
        for (let k = 1; k <= n; k++) {
          const t = k / n;
          points.push({
            x: baseX + dx * t + Math.sin(t * 8 + rand()) * (8 + rand() * 10),
            y: baseY + dy * t + Math.cos(t * 6 + rand()) * (6 + rand() * 10)
          });
        }
        d = makePathFromPoints(points);
      } else if (kind === 4) {
        // dice / frames
        const x0 = zx;
        const y0 = zy;
        const s = 70 + rand() * 120;
        const x = clamp(x0, 40, W - s - 40);
        const y = clamp(y0, 40, H - s - 40);
        // slightly "broken" frame
        const inset = 8 + rand() * 18;
        const x2 = x + s;
        const y2 = y + s;
        d = `M ${x.toFixed(2)} ${y.toFixed(2)} L ${x2.toFixed(2)} ${y.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x.toFixed(2)} ${y2.toFixed(2)} Z ` +
          `M ${(x + inset).toFixed(2)} ${(y + inset).toFixed(2)} L ${(x2 - inset).toFixed(2)} ${(y + inset).toFixed(2)} L ${(x2 - inset).toFixed(2)} ${(y2 - inset).toFixed(2)} L ${(x + inset).toFixed(2)} ${(y2 - inset).toFixed(2)} Z`;
      } else if (kind === 5) {
        // scribble spiral
        const cx = zx;
        const cy = zy;
        const turns = 1.5 + rand() * 2.2;
        const steps = 18 + Math.floor(rand() * 14);
        const r0 = 6 + rand() * 20;
        const r1 = 60 + rand() * 90;
        let dd = `M ${(cx + r0).toFixed(2)} ${cy.toFixed(2)}`;
        for (let k = 1; k <= steps; k++) {
          const t = k / steps;
          const ang = t * Math.PI * 2 * turns + (rand() - 0.5) * 0.18;
          const r = r0 + (r1 - r0) * t + (rand() - 0.5) * 6;
          const px = clamp(cx + Math.cos(ang) * r, 40, W - 40);
          const py = clamp(cy + Math.sin(ang) * r, 40, H - 40);
          dd += ` L ${px.toFixed(2)} ${py.toFixed(2)}`;
        }
        d = dd;
      } else if (kind === 6) {
        // barcode / brutal scan marks
        const x = clamp(zx - 120, 40, W - 280);
        const y = clamp(zy - 60, 40, H - 120);
        const w0 = 220 + rand() * 180;
        const h0 = 90 + rand() * 60;
        const bars = 10 + Math.floor(rand() * 14);
        let dd = '';
        for (let b = 0; b < bars; b++) {
          const bx = x + (b / bars) * w0;
          const bw = 1 + Math.floor(rand() * 3);
          dd += `M ${bx.toFixed(2)} ${y.toFixed(2)} L ${bx.toFixed(2)} ${(y + h0).toFixed(2)} `;
          dd += `M ${(bx + bw).toFixed(2)} ${y.toFixed(2)} L ${(bx + bw).toFixed(2)} ${(y + h0).toFixed(2)} `;
        }
        d = dd.trim();
      } else if (kind === 7) {
        // wrap-walk: exits left and reappears right (screen trick)
        d = makeWrapWalk(rand, { x: zx, y: zy }, W, H);
      } else if (kind === 8) {
        // HUD / bracket
        d = makeGlitchBracket(rand, { x: zx, y: zy }, W, H);
      } else if (kind === 9) {
        // "pixel burst" (diagonal-ish micro lines)
        const cx = zx;
        const cy = zy;
        const rays = 9 + Math.floor(rand() * 10);
        const r0 = 8 + rand() * 16;
        const r1 = 70 + rand() * 120;
        let dd = '';
        for (let k = 0; k < rays; k++) {
          const t = k / (rays - 1);
          const ang = lerp(-Math.PI * 0.85, Math.PI * 0.15, t) + (rand() - 0.5) * 0.15;
          const x1 = clamp(cx + Math.cos(ang) * r0, 40, W - 40);
          const y1 = clamp(cy + Math.sin(ang) * r0, 40, H - 40);
          const x2 = clamp(cx + Math.cos(ang) * r1, 40, W - 40);
          const y2 = clamp(cy + Math.sin(ang) * r1, 40, H - 40);
          dd += `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} `;
        }
        d = dd.trim();
      } else if (kind === 10) {
        // "cursor / caret" strokes
        const x = clamp(zx, 60, W - 60);
        const y = clamp(zy, 60, H - 60);
        const h = 40 + rand() * 120;
        const w1 = 16 + rand() * 26;
        d = `M ${x.toFixed(2)} ${(y - h * 0.5).toFixed(2)} L ${x.toFixed(2)} ${(y + h * 0.5).toFixed(2)} ` +
          `M ${(x - w1).toFixed(2)} ${(y + h * 0.5).toFixed(2)} L ${(x + w1).toFixed(2)} ${(y + h * 0.5).toFixed(2)}`;
      } else if (kind === 11) {
        // knot + cross (tiny local signature)
        const x = zx;
        const y = zy;
        const r = 18 + rand() * 28;
        const aa = rand() * Math.PI * 2;
        const x1 = clamp(x + Math.cos(aa) * r, 40, W - 40);
        const y1 = clamp(y + Math.sin(aa) * r, 40, H - 40);
        const x2 = clamp(x - Math.cos(aa) * r, 40, W - 40);
        const y2 = clamp(y - Math.sin(aa) * r, 40, H - 40);
        d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} ` +
          `M ${x1.toFixed(2)} ${y2.toFixed(2)} L ${x2.toFixed(2)} ${y1.toFixed(2)}`;
      } else if (kind === 12) {
        // calligraphy swash
        d = makeCalligraphySwash(rand, { x: zx, y: zy }, W, H);
      } else {
        // elegant flourish / loop
        d = makeFlourishLoop(rand, { x: zx, y: zy }, W, H);
      }

      if (!d) continue;
      // Animate thickness over time for some strokes (during draw/hold/erase).
      const wiggle = rand() < 0.62;
      const w0 = wiggle ? clamp(w * (0.65 + rand() * 0.18), 1.0, 6.2) : w;
      const w1 = wiggle ? clamp(w * (1.10 + rand() * 0.45), 1.0, 7.0) : w;
      const w2 = wiggle ? clamp(w * (0.80 + rand() * 0.25), 1.0, 6.2) : w;

      strokes.push({ d, stroke, w, w0, w1, w2, alpha, i, dur, phase, cap, join, miter, gap, filter, ghosts });
    }

    const paths = strokes
      .map((s) => {
        const dashArray = s.gap > 0 ? `1000 ${s.gap}` : `1000`;
        const base = `
          <path
            class=\"stroke\"
            style=\"--i:${s.i};--dur:${s.dur.toFixed(2)}s;--phase:${s.phase.toFixed(2)}s;--w0:${s.w0.toFixed(2)}px;--w1:${s.w1.toFixed(2)}px;--w2:${s.w2.toFixed(2)}px\"
            d=\"${s.d}\"
            pathLength=\"1000\"
            stroke-dasharray=\"${dashArray}\"
            fill=\"none\"
            stroke=\"${s.stroke}\"
            stroke-linecap=\"${s.cap}\"
            stroke-linejoin=\"${s.join}\"
            stroke-miterlimit=\"${s.miter.toFixed(1)}\"
            stroke-opacity=\"${s.alpha.toFixed(3)}\"${s.filter ? `\n            filter=\"url(#${s.filter})\"` : ''}
          />`;

        const ghosts = s.ghosts
          .map((g, gi) => {
            const ph = (s.phase + g.phaseJitter + s.dur * 10) % s.dur;
            const gw = s.w * g.wMul;
            const gw0 = clamp(gw * 0.85, 0.8, 6.0);
            const gw1 = clamp(gw * 1.10, 0.8, 6.8);
            const gw2 = clamp(gw * 0.95, 0.8, 6.2);
            return `
          <path
            class=\"stroke stroke-ghost\"
            style=\"--i:${s.i}-${gi};--dur:${s.dur.toFixed(2)}s;--phase:${ph.toFixed(2)}s;--w0:${gw0.toFixed(2)}px;--w1:${gw1.toFixed(2)}px;--w2:${gw2.toFixed(2)}px\"
            d=\"${s.d}\"
            pathLength=\"1000\"
            stroke-dasharray=\"${Math.floor(s.gap * 0.6) > 0 ? `1000 ${Math.floor(s.gap * 0.6)}` : '1000'}\"
            fill=\"none\"
            stroke=\"${s.stroke}\"
            stroke-linecap=\"${s.cap}\"
            stroke-linejoin=\"${s.join}\"
            stroke-miterlimit=\"${s.miter.toFixed(1)}\"
            stroke-opacity=\"${(s.alpha * g.aMul).toFixed(3)}\"
            transform=\"translate(${g.dx.toFixed(2)} ${g.dy.toFixed(2)})\"${s.filter ? `\n            filter=\"url(#${s.filter})\"` : ''}
          />`;
          })
          .join('');

        return base + ghosts;
      })
      .join('\n');

    // Shared cycle boundary -> regeneration won't "cut" mid-erase.
    const cycleMs = Math.ceil(cycleSec * 1000);
    const svg = `
      <svg class=\"bg\" viewBox=\"0 0 1000 600\" preserveAspectRatio=\"none\" aria-hidden=\"true\">
        <defs>
          <filter id=\"soft\" x=\"-10%\" y=\"-10%\" width=\"120%\" height=\"120%\" color-interpolation-filters=\"sRGB\">
            <feGaussianBlur stdDeviation=\"0.55\" />
          </filter>
          <filter id=\"softer\" x=\"-10%\" y=\"-10%\" width=\"120%\" height=\"120%\" color-interpolation-filters=\"sRGB\">
            <feGaussianBlur stdDeviation=\"1.05\" />
          </filter>
        </defs>
        <rect width=\"1000\" height=\"600\" fill=\"transparent\" />
        ${paths}
      </svg>
    `;
    return { svg, cycleMs };
  }

  function renderInto(target: HTMLDivElement, seed: number) {
    const { svg, cycleMs } = generateSvg(seed);
    target.innerHTML = svg;
    return cycleMs;
  }

  onMount(() => {
    if (!isBrowser) return;
    if (!hostA || !hostB) return;
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

    const renderOnce = () => {
      const seed = randomize ? Math.floor(Math.random() * 1_000_000_000) : 1337;
      const next = activeLayer === 'a' ? 'b' : 'a';
      const target = next === 'a' ? hostA! : hostB!;
      const cycleMs = renderInto(target, seed);

      // Flip layer on the next frame to avoid a one-frame flash.
      requestAnimationFrame(() => {
        activeLayer = next;
      });

      if (!regenOnCycleEnd || prefersReduced) return;
      if (regenTimer) window.clearTimeout(regenTimer);
      regenTimer = window.setTimeout(() => {
        renderOnce();
      }, cycleMs);
    };

    // First paint: render both fast, then activate one.
    const seed0 = randomize ? Math.floor(Math.random() * 1_000_000_000) : 1337;
    renderInto(hostA, seed0);
    activeLayer = 'a';

    if (!prefersReduced) {
      // Schedule regen based on the active SVG's cycle.
      if (regenOnCycleEnd) {
        const { cycleMs } = generateSvg(seed0);
        regenTimer = window.setTimeout(() => {
          renderOnce();
        }, cycleMs);
      }
    }
  });

  onDestroy(() => {
    if (!isBrowser) return;
    if (regenTimer) window.clearTimeout(regenTimer);
  });
</script>

<div class="wrap pointer-events-none fixed inset-0 z-0" aria-hidden="true">
  <div class="host">
    <div class="layer" class:is-active={activeLayer === 'a'} bind:this={hostA}></div>
    <div class="layer" class:is-active={activeLayer === 'b'} bind:this={hostB}></div>
  </div>
  <div class="vignette"></div>
</div>

<style>
  :global(svg.bg) {
    /* We use pathLength="1000" so these are stable and cheap */
    --dash: 1000;
  }

  :global(svg.bg .stroke) {
    stroke-dashoffset: var(--dash);
    stroke-width: var(--w1, 3px);
    animation:
      drawErase var(--dur, 7.6s) cubic-bezier(0.3, 0, 0.2, 1) infinite,
      widthWiggle var(--dur, 7.6s) cubic-bezier(0.3, 0, 0.2, 1) infinite;
    /* Phase (negative delay) keeps all strokes aligned on shared cycle boundaries */
    animation-delay: calc(-1 * var(--phase, 0s)), calc(-1 * var(--phase, 0s));
    will-change: stroke-dashoffset;
  }

  :global(svg.bg .stroke.stroke-ghost) {
    /* keep ghosts subtle even when base strokes are strong */
    opacity: 0.85;
  }

  @media (prefers-reduced-motion: reduce) {
    :global(svg.bg .stroke) {
      animation: none;
      stroke-dashoffset: 0;
      stroke-width: var(--w1, 3px);
    }
  }

  @keyframes drawErase {
    0% {
      stroke-dashoffset: var(--dash);
    }
    /* draw */
    40% {
      stroke-dashoffset: 0;
    }
    /* hold */
    60% {
      stroke-dashoffset: 0;
    }
    /* erase: exact reverse of draw (no jump, no fade) */
    100% {
      stroke-dashoffset: var(--dash);
    }
  }

  @keyframes widthWiggle {
    0% {
      stroke-width: var(--w0, var(--w1, 3px));
    }
    40% {
      stroke-width: var(--w1, 3px);
    }
    60% {
      stroke-width: var(--w1, 3px);
    }
    100% {
      stroke-width: var(--w2, var(--w1, 3px));
    }
  }

  .wrap {
    opacity: 0.96;
    mix-blend-mode: normal;
  }

  .host {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .layer {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity 900ms cubic-bezier(0.2, 0, 0.2, 1);
  }

  .layer.is-active {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .layer {
      transition: none;
    }
  }

  .host :global(svg.bg) {
    width: 100%;
    height: 100%;
    opacity: 0.74;
  }

  .vignette {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 30% 25%, rgba(0, 0, 0, 0.15), transparent 55%),
      radial-gradient(circle at 70% 80%, rgba(0, 0, 0, 0.22), transparent 60%),
      radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.62));
    pointer-events: none;
  }
</style>
