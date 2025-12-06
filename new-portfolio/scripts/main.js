import { gsap } from "https://cdn.skypack.dev/gsap";
import { panelContent, roomStops } from "./content.js";
import { PanelManager } from "./panels.js";
import { GraffitiStudioScene } from "./scene.js";

const canvas = document.getElementById("room-canvas");
const overlay = document.getElementById("entry-overlay");
const enterButton = document.getElementById("enter-room");
const tooltip = document.getElementById("tooltip");
const fallback = document.getElementById("webgl-fallback");
const panelLayer = document.getElementById("panel-layer");
const panelToggle = document.getElementById("panel-toggle");

const panelManager = new PanelManager(panelLayer);
let graffitiScene = null;
let currentStop = null;
let panelsHidden = true;
let overlayDismissed = false;

const leafShapes = [
  "polygon(48% 0%, 64% 4%, 80% 14%, 92% 30%, 100% 52%, 92% 78%, 72% 100%, 30% 100%, 10% 82%, 0% 54%, 6% 30%, 18% 14%, 34% 4%)",
  "polygon(50% 0%, 70% 6%, 88% 22%, 98% 40%, 100% 60%, 90% 82%, 64% 100%, 36% 100%, 10% 80%, 0% 58%, 4% 36%, 16% 18%, 34% 6%)",
  "polygon(46% 0%, 60% 6%, 76% 18%, 88% 32%, 98% 52%, 94% 74%, 78% 94%, 56% 100%, 34% 100%, 18% 92%, 6% 76%, 0% 52%, 8% 30%, 22% 14%, 38% 4%)",
  "polygon(50% 0%, 68% 8%, 84% 18%, 96% 36%, 100% 56%, 92% 78%, 74% 98%, 50% 100%, 26% 98%, 8% 78%, 0% 56%, 4% 34%, 16% 18%, 32% 8%)",
  "polygon(48% 0%, 66% 6%, 82% 18%, 94% 34%, 100% 56%, 94% 78%, 78% 96%, 54% 100%, 30% 96%, 12% 78%, 4% 56%, 8% 32%, 20% 16%, 34% 6%)"
];

const leafPalettes = [
  { dark: "#1f3c2b", mid: "#2d563b", light: "#43764f", spot: "rgba(187, 219, 190, 0.22)", vein: "rgba(227, 255, 233, 0.55)" },
  { dark: "#233629", mid: "#304f3a", light: "#47704f", spot: "rgba(205, 233, 199, 0.2)", vein: "rgba(216, 246, 226, 0.5)" },
  { dark: "#213824", mid: "#2f5633", light: "#3e7444", spot: "rgba(178, 214, 188, 0.18)", vein: "rgba(211, 243, 221, 0.58)" },
  { dark: "#1d3528", mid: "#2d503c", light: "#3f6d50", spot: "rgba(195, 231, 206, 0.24)", vein: "rgba(232, 255, 231, 0.6)" }
];

init();

function releaseOverlayLock() {
  document.body.classList.remove("overlay-locked");
}

function init() {
  setupOverlay();
  stylizeOverlayDecor();
  setupPanelToggle();
  if (!hasWebGLSupport()) {
    fallback.hidden = false;
    overlay.remove();
    releaseOverlayLock();
    return;
  }

  graffitiScene = new GraffitiStudioScene({
    canvas,
    stops: roomStops,
    onSelect: handleSceneSelect,
    onHover: handleSceneHover
  });
}

function setupOverlay() {
  if (!overlay) return;
  overlay.addEventListener("click", () => {
    enterWorkshop();
  });
  enterButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    enterWorkshop();
  });
}

function stylizeOverlayDecor() {
  if (!overlay) return;
  requestAnimationFrame(() => {
    scatterOverlayFlowers();
    enrichOverlayLeaves();
  });
}

function scatterOverlayFlowers() {
  const flowers = overlay.querySelectorAll(".overlay__flower");
  if (!flowers.length) return;
  flowers.forEach((flower, index) => {
    const computed = getComputedStyle(flower);
    const baseLeft = parseFloat(computed.getPropertyValue("--flower-left")) || (index / flowers.length) * 100;
    const left = Math.min(97, Math.max(3, baseLeft + randomInRange(-2.8, 2.8)));
    flower.style.setProperty("--flower-left", `${left}%`);

    const baseHeight = parseFloat(computed.getPropertyValue("--flower-height")) || 120;
    const height = Math.max(80, baseHeight + randomInRange(-15, 12));
    flower.style.setProperty("--flower-height", `${height}px`);

    const baseDuration = parseFloat(computed.getPropertyValue("--flower-sway-duration")) || 6;
    const swayDuration = Math.max(4.8, baseDuration * randomInRange(0.85, 1.25));
    flower.style.setProperty("--flower-sway-duration", `${swayDuration.toFixed(2)}s`);

    flower.style.setProperty("--flower-delay", `${randomInRange(-2.7, -0.2).toFixed(2)}s`);
    flower.style.setProperty("--leaf-tilt", `${randomInRange(-8, 6)}deg`);

    const existingGlint = flower.querySelector(".overlay__flower-glint");
    if (existingGlint) existingGlint.remove();

    const dew = document.createElement("span");
    dew.className = "overlay__flower-glint";
    dew.style.setProperty("--dew-shift-x", `${randomInRange(-12, 12)}px`);
    dew.style.setProperty("--dew-shift-y", `${randomInRange(-10, 8)}px`);
    dew.style.setProperty("--dew-size", `${randomInRange(8, 15)}px`);
    dew.style.setProperty("--dew-duration", `${randomInRange(4.5, 7.8).toFixed(2)}s`);
    dew.style.setProperty("--dew-delay", `${randomInRange(0, 6).toFixed(2)}s`);
    dew.style.setProperty("--dew-rotation", `${randomInRange(-20, 20)}deg`);
    flower.appendChild(dew);
  });
}

function enrichOverlayLeaves() {
  const leaves = overlay.querySelectorAll(".overlay__leaf");
  if (!leaves.length) return;
  leaves.forEach((leaf) => {
    const shape = leafShapes[Math.floor(Math.random() * leafShapes.length)];
    const palette = leafPalettes[Math.floor(Math.random() * leafPalettes.length)];
    leaf.style.setProperty("--leaf-shape", shape);
    leaf.style.setProperty("--leaf-tone-dark", palette.dark);
    leaf.style.setProperty("--leaf-tone-mid", palette.mid);
    leaf.style.setProperty("--leaf-tone-light", palette.light);
    leaf.style.setProperty("--leaf-spot-color", palette.spot);
    leaf.style.setProperty("--leaf-vein-color", palette.vein);
    leaf.style.setProperty("--leaf-scale", randomInRange(0.5, 0.85).toFixed(2));
    leaf.style.setProperty("--leaf-drift", `${randomInRange(-150, 150)}px`);
    leaf.style.setProperty("--leaf-duration", `${randomInRange(9, 15).toFixed(2)}s`);
    leaf.style.setProperty("--leaf-delay", `${randomInRange(-12, 0).toFixed(2)}s`);
    leaf.style.setProperty("--leaf-wander", `${randomInRange(8, 22)}px`);
    leaf.style.setProperty("--leaf-gloss-delay", `${randomInRange(0, 5).toFixed(2)}s`);
    leaf.style.setProperty("--leaf-gloss-strength", randomInRange(0.2, 0.5).toFixed(2));
    leaf.style.setProperty("--leaf-vein-shift", `${randomInRange(-10, 10)}deg`);
  });
}

function enterWorkshop() {
  if (overlayDismissed || !overlay) return;
  overlayDismissed = true;

  const removeOverlay = () => {
    overlay.remove();
    releaseOverlayLock();
  };

  if (!graffitiScene) {
    removeOverlay();
    return;
  }

  hidePanels();
  gsap.to(overlay, {
    autoAlpha: 0,
    duration: 0.9,
    ease: "power3.out",
    onComplete: removeOverlay
  });
}

function setupPanelToggle() {
  panelLayer?.classList.toggle("panel-layer--hidden", panelsHidden);
  updatePanelToggle();
  panelToggle?.addEventListener("click", () => {
    panelsHidden ? showPanels() : hidePanels();
  });
}

function activateStop(id, options = { focusScene: false }) {
  if (!panelContent[id]) {
    panelManager.render(null);
    currentStop = null;
    if (panelToggle) panelToggle.hidden = true;
    return;
  }
  currentStop = id;
  panelManager.render(panelContent[id]);
  if (panelToggle) panelToggle.hidden = false;
  if (panelsHidden) {
    showPanels();
  }
  if (options.focusScene) {
    graffitiScene?.focusStop(id);
  }
}

function handleSceneSelect(stopId) {
  if (!stopId) {
    panelManager.render(null);
    currentStop = null;
    hidePanels();
    if (panelToggle) panelToggle.hidden = true;
    return;
  }
  activateStop(stopId, { focusScene: false });
}

function handleSceneHover(payload) {
  if (!payload) {
    tooltip.hidden = true;
    return;
  }
  tooltip.hidden = false;
  tooltip.textContent = payload.stop?.tooltip || payload.stop?.label || "Station";
  tooltip.style.left = `${payload.x + 12}px`;
  tooltip.style.top = `${payload.y + 12}px`;
}

function hasWebGLSupport() {
  try {
    const testCanvas = document.createElement("canvas");
    return Boolean(window.WebGL2RenderingContext && testCanvas.getContext("webgl2"));
  } catch (error) {
    return false;
  }
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!currentStop) return;
    event.preventDefault();
    handleSceneSelect(null);
    graffitiScene?.resetFocus();
    return;
  }
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
  event.preventDefault();
  const direction = event.key === "ArrowRight" ? 1 : -1;
  cycleStops(direction);
});

function cycleStops(direction) {
  const index = roomStops.findIndex((stop) => stop.id === currentStop);
  const fallbackIndex = direction > 0 ? 0 : roomStops.length - 1;
  const activeIndex = index >= 0 ? index : fallbackIndex;
  let nextIndex = activeIndex + direction;
  nextIndex = Math.max(0, Math.min(roomStops.length - 1, nextIndex));
  if (nextIndex === activeIndex) return;
  activateStop(roomStops[nextIndex].id, { focusScene: true });
}

function hidePanels() {
  panelsHidden = true;
  panelLayer.classList.add("panel-layer--hidden");
  updatePanelToggle();
}

function showPanels() {
  panelsHidden = false;
  panelLayer.classList.remove("panel-layer--hidden");
  updatePanelToggle();
}

function updatePanelToggle() {
  if (!panelToggle) return;
  panelToggle.setAttribute("aria-pressed", String(!panelsHidden));
  panelToggle.textContent = panelsHidden ? "Afficher infos" : "Masquer infos";
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}
