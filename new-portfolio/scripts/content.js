export const roomStops = [
  {
    id: "atelier",
    label: "Atelier",
    theme: "ink",
    anchor: "atelier",
    camera: {
      position: [-5.2, 1.9, 3.9],
      lookAt: [-5.1, 1.2, 0.45]
    },
    tooltip: "Atelier"
  },
  {
    id: "graffiti",
    label: "Mur",
    theme: "spray",
    anchor: "graffiti",
    camera: {
      position: [-0.2, 2.35, 4.5],
      lookAt: [-0.2, 2.15, -1.25]
    },
    tooltip: "Street art"
  },
  {
    id: "code",
    label: "Lab",
    theme: "holo",
    anchor: "code",
    camera: {
      position: [2.2, 2.1, 4.6],
      lookAt: [2, 1.5, -0.9]
    },
    tooltip: "Projets tech"
  },
  {
    id: "contact",
    label: "Signal",
    theme: "signal",
    anchor: "contact",
    camera: {
      position: [4.2, 2, 4.2],
      lookAt: [4.1, 1.2, 1.2]
    },
    tooltip: "Contact"
  }
];

export const panelContent = {
  atelier: {
    id: "atelier",
    theme: "ink",
    eyebrow: "À propos",
    title: "BUT Informatique · Parcours Créatif",
    intro:
      "Je termine ma 3e année de BUT Informatique à l'IUT de Gradignan (Université de Bordeaux). Je cherche les ponts entre code, graffiti et narrations interactives.",
    highlights: [
      { label: "Expertise", value: "Créative Coding · UX · 3D" },
      { label: "Langages", value: "TypeScript, Python, GLSL" },
      { label: "Valeurs", value: "Expériences inclusives et tangibles" }
    ],
    timeline: [
      {
        year: "2025",
        detail: "PFE · Expériences interactives pour une expo street art (Three.js, WebAudio)."
      },
      {
        year: "2024",
        detail: "Chef de projet sur une plateforme interne à l'IUT (architecture cloud + CI/CD)."
      },
      {
        year: "2023",
        detail: "Semestre à Osaka : ateliers graffiti + coding dojo collaboratifs."
      }
    ],
    projects: [
      {
        title: "Atelier vivant",
        description:
          "Installation mixant spray physique et projection générative. Tracking temps-réel via OpenCV.",
        tags: ["Processing", "OpenCV", "Arduino"],
        link: { label: "Timelapse", url: "https://youtu.be/dQw4w9WgXcQ" }
      }
    ]
  },
  graffiti: {
    id: "graffiti",
    theme: "spray",
    eyebrow: "Graffiti",
    title: "Mur des prototypes",
    intro:
      "Chaque fresque est pensée comme une interface : flèches, typographies compressées, matières réactives à la lumière UV.",
    highlights: [
      { label: "Techniques", value: "Flops, blockletters, chrome abstrait" },
      { label: "Terrains", value: "Bordeaux · Lisbonne · Osaka" },
      { label: "Expos", value: "Collectif MurMur, Transfert" }
    ],
    projects: [
      {
        title: "Wall of Latency",
        description:
          "Fresque évolutive : des capteurs mesurent la foule et déclenchent des projections glitch sur la peinture humide.",
        tags: ["TouchDesigner", "ESP32"],
        link: { label: "Voir les croquis", url: "https://www.behance.net" }
      },
      {
        title: "Metro Bloom",
        description:
          "Série de collages lumineux posés dans le tram bordelais pendant les heures bleues.",
        tags: ["Collage", "Néon"],
        link: { label: "Process", url: "https://www.instagram.com" }
      }
    ]
  },
  code: {
    id: "code",
    theme: "holo",
    eyebrow: "Projets tech",
    title: "Creative Tech Lab",
    intro:
      "Je code des outils immersifs pour événements culturels et produits pédagogiques. J'aime combiner pipelines CI/CD et poésie visuelle.",
    highlights: [
      { label: "Stack favori", value: "Three.js · Vite · GSAP · FastAPI" },
      { label: "Focus", value: "Accessibilité, i18n, perf" },
      { label: "Soft skills", value: "Leadership étudiant, vulgarisation" }
    ],
    projects: [
      {
        title: "GraffXR",
        description:
          "Application webVR pour spray virtuel avec physique simulée. Mode multi pour jams à distance.",
        tags: ["Three.js", "WebXR", "Node"],
        link: { label: "Prototype", url: "https://github.com/hugoretail" }
      },
      {
        title: "Chronicles API",
        description:
          "API FastAPI pour exposer portfolios multilingues, branchée à un CMS headless custom.",
        tags: ["FastAPI", "PostgreSQL", "Azure"],
        link: { label: "Repo privé", url: "https://linkedin.com/in/hugoretail" }
      }
    ]
  },
  contact: {
    id: "contact",
    theme: "signal",
    eyebrow: "Contact",
    title: "Signal Room",
    intro:
      "Un mail, un café à Bordeaux, ou un live painting ? Je suis partant.",
    highlights: [
      { label: "Mail", value: "hugo.retail@gmail.com" },
      { label: "LinkedIn", value: "@hugoretail" },
      { label: "Instagram", value: "@nezko.graff" }
    ],
    projects: [],
    timeline: [
      { year: "Disponibilités", detail: "Stage/Premier job · Juillet 2025" }
    ],
    links: [
      { label: "Envoyer un message", url: "mailto:hugo.retail@gmail.com" },
      { label: "LinkedIn", url: "https://linkedin.com/in/hugoretail" },
      { label: "Instagram", url: "https://instagram.com/nezko.graff" }
    ]
  }
};
