# NeoGraff

Immersive graffiti-inspired portfolio built with vanilla HTML/CSS + ES modules (Three.js + GSAP).

## Prerequisites
- Modern browser with WebGL 2 enabled (Chrome/Edge/Firefox/Safari).
- Any static file server (Node.js `npx serve`, Python `http.server`, VS Code Live Server, etc.).

## Run Locally
```bash
# From repo root
cd new-portfolio
npx serve -l 4173
# or python -m http.server 4173
```
Visit `http://localhost:4173`.

## Smoke Test Checklist
1. **Arrival cinematic** – Overlay fades in, text animates, spray particles orbit in background.
2. **Enter yard** – Click “Enter the Yard” (or press Enter/Space) → overlay dissolves, regain pointer control.
3. **3D navigation** – Hover totems for tooltip labels, click one to focus camera + scale mesh.
4. **HUD jumps** – Use header buttons; each jumps camera + loads themed panel.
5. **Panel reveal** – Spray/holo/ink overlays animate in, chips + project cards render, links open in new tab.
6. **Responsive** – Shrink width < 860px; HUD stacks, canvas becomes hero, scroll to panels.

If WebGL is unavailable, a fallback message stays on screen. Monitor browser console for errors when iterating.
