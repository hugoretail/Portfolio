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

init();

function releaseOverlayLock() {
  document.body.classList.remove("overlay-locked");
}

function init() {
  setupOverlay();
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
  enterButton?.addEventListener("click", () => {
    if (!graffitiScene) {
      overlay.remove();
      releaseOverlayLock();
      return;
    }
    gsap.to(overlay, {
      autoAlpha: 0,
      duration: 0.9,
      ease: "power3.out",
      onComplete: () => {
        overlay.remove();
        releaseOverlayLock();
      }
    });
    hidePanels();
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
