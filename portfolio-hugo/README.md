# Portfolio Hugo — Astro + Svelte + Three.js + GSAP + Tailwind

Portfolio brutaliste (street-art + nature + interactions minimalistes mais percutantes).

## Démarrer

```bash
npm install
npm run dev
```

- Dev: `http://localhost:4321`
- Build: `npm run build`
- Preview build: `npm run preview`

## Structure

- [src/pages/index.astro](src/pages/index.astro) : accueil
- [src/pages/graffiti.astro](src/pages/graffiti.astro)
- [src/pages/hiphop.astro](src/pages/hiphop.astro)
- [src/pages/informatique.astro](src/pages/informatique.astro)
- [src/pages/ia.astro](src/pages/ia.astro) (redirection)
- [src/pages/litterature.astro](src/pages/litterature.astro)

Composants clés :

- [src/components/SignatureTool.svelte](src/components/SignatureTool.svelte) : signature canvas (effacer / couleurs / export PNG)
- [src/components/Dice3D.svelte](src/components/Dice3D.svelte) : dé Three.js (clic = lancer, résultat aléatoire)
- [src/components/RedThread.svelte](src/components/RedThread.svelte) : fil rouge SVG (ondulation au scroll)
- [src/components/QRCode.svelte](src/components/QRCode.svelte) : QR stylisé (QR généré via `qrcode.react` monté en React)

Assets :

- `public/assets/images/` : fonds + textures + placeholders
- `public/assets/music/` : extraits audio (voir `public/assets/music/README.md`)

## Modifier les contenus

### 1) Playlist QR code

Remplace `LIEN_SPOTIFY_PLAYLIST` par ton lien réel dans :

- [src/pages/index.astro](src/pages/index.astro)
- [src/pages/hiphop.astro](src/pages/hiphop.astro)

### 2) Dé 3D

Dans [src/components/Dice3D.svelte](src/components/Dice3D.svelte), modifie :

- `sides`: labels et textures (`textureUrl`)
- place tes vraies textures dans `public/assets/images/` (idéalement `webp`/`png`)

### 3) Signature

Dans [src/components/SignatureTool.svelte](src/components/SignatureTool.svelte) :

- adapte la palette graffiti (couleurs)
- l’export PNG reste transparent (fond canvas)

### 4) Hip-Hop (audio)

Ajoute un fichier `public/assets/music/boom-bap-sample.mp3` (ou change la prop `src` dans [src/pages/hiphop.astro](src/pages/hiphop.astro)).

## Ajouter une nouvelle section

1. Crée une page dans `src/pages/` (ex: `photo.astro`)
2. Ajoute un lien dans [src/components/SiteNav.astro](src/components/SiteNav.astro)
3. Reprends la structure des sections existantes (fond fort + texte court + une interaction)

## Notes perf

- `Dice3D` stoppe le rendu quand le canvas n’est pas visible (IntersectionObserver).
- Les images “texture” sont préchargées dans [src/layouts/BaseLayout.astro](src/layouts/BaseLayout.astro).

