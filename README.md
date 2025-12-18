# Portfoloi — Laboratoire de portfolios

Ce dépôt me sert d’atelier pour concevoir plusieurs versions de portfolio et expérimenter des technos front. L’objectif est double :

- Tester des idées d’UX/UI et d’animations sur des projets courts.
- Évaluer des stacks (Three.js, shaders, loaders GLTF, GSAP, etc.) avant de les utiliser « en prod » sur mon site.

## Structure du dépôt

- `new-portfolio/` — Expérimentation 3D avec Three.js (scène interactive style « pièce / studio »).
- `old/` — Ancienne version statique (HTML/CSS/JS simples) avec système de traductions.

## new-portfolio (Three.js)

Expérimentation autour d’une scène 3D temps réel :

- Three.js (module) + GLTFLoader pour charger des modèles et assets.
- Matériaux PBR (textures couleur/normal/roughness/AO) pour sol, murs, plafond.
- GSAP pour les transitions caméra (focus sur des « stops »/ancres).
- Mode debug caméra (OrbitControls) toggle avec la touche `M`.
- Petits détails « scène de vie » (lumières directionnelles/spot, fog, ombres douces).

### Lancer localement

Comme le projet importe des modules ES et des assets, ouvrez-le via un serveur local.

Option rapide (Node 18+) :

```bash
npx serve new-portfolio -l 3000
# ou
npx http-server ./new-portfolio -p 3000 -c-1
```

VS Code : extension « Live Server », puis ouvrir `new-portfolio/index.html`.

## Inspirations / crédits

- https://github.com/andrewwoan/abigail-bloom-portolio-bokoko33
- https://github.com/patriciogonzalezvivo/patriciogonzalezvivo.com
- https://github.com/Samsy/aw-2025-portfolio
- https://github.com/jordan-breton/jordan-breton.com
- Modèles/Textures : https://polyhaven.com/models • https://ambientcg.com

## Idées à intégrer

- Logos / modèles Sketchfab :
	- https://sketchfab.com/3d-models/rayman-raving-rabbids-ds-logo-a79f4f0e755a4116a060baf831b1560c
	- https://sketchfab.com/3d-models/rayman-rrr-doing-the-toothless-dance-5cbc08d30da840abbd21251fb0d8b32e
	- https://sketchfab.com/3d-models/world-map-color-3d-scan-4f949e05000141649cba5a3b368eb725

## Roadmap courte

- Optimiser les textures (taille/aniso) et le budget draw calls.
- Ajout d’un mini système de navigation entre projets depuis la scène.
- Post-process discret (bloom léger, vignette) selon perf.