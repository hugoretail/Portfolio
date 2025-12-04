# NeoGraff Portfolio Concept

## Narrative Flow
1. **Arrival Cinematic** – Fullscreen canvas renders a graffiti nebula. Spray-can particles assemble the logo before dissolving into the scene.
2. **Free-Roam Hub** – A stylized "floating alley" with 3D sculptures (planets/totems). Each sculpture anchors a portfolio chapter (About, Graffiti, Computer Science, Contact, Extras).
3. **Contextual Reveal** – Clicking a sculpture triggers a themed animation:
   - Graffiti nodes spray-paint a wall panel with neon drips.
   - Computer-science nodes light up with holographic grids.
   - About/Contact nodes ripple like ink on water.

## Visual + Interaction Pillars
- **3D Layer:** Three.js scene with dyed ambient fog, gradient skybox, and animated light swings.
- **2D Layer:** Glassmorphic UI floating above the canvas, using bespoke spray-brush SVG clips for reveals.
- **Motion Language:** GSAP timelines, easing inspired by aerosol bursts vs. precise circuit flickers.
- **Sound Hooks (optional later):** howler.js stingers for spray or synth blips.

## Content Mapping
| Node | Theme | Highlights |
| --- | --- | --- |
| About | Spray totem | Degree, ethos, quick bio |
| Graffiti Wall | Paint burst | Gallery slider, creative statement |
| Computer Science | Hologram cube | Featured projects, stack badges |
| Street Art | Drip column | Work-in-progress storyboard |
| Contact | Portal glyph | Links, CTA |

## Tech Stack
- Plain HTML for structure, CSS for art direction.
- JavaScript ES modules powered by Three.js + GSAP; NO build step required.
- Responsive layout with fallback for no WebGL (message prompting to enable experiences).

## File Structure Skeleton
```
new-portfolio/
  index.html
  assets/
    images/
    svg/
  scripts/
    main.js
    scene.js
    panels.js
    content.js
  styles/
    main.css
```

## Next Implementation Steps
1. Scaffold folders + base HTML shell with canvas + overlay layers.
2. Implement `GraffitiScene` class (lights, camera rails, interactive meshes).
3. Build `PanelManager` with spray/holo themes and content injection from `content.js`.
4. Fine-tune responsive + motion cues, add accessibility hooks.
