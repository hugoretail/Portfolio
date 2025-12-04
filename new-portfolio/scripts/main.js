import { gsap } from "https://cdn.skypack.dev/gsap@3.12.5";
import { graffitiNodes } from "./content.js";
import { PanelManager } from "./panels.js";
import { GraffitiScene } from "./scene.js";

const canvas = document.getElementById("graffiti-canvas");
const overlay = document.getElementById("entry-overlay");
const enterButton = document.getElementById("enter-scene");
const navButtons = document.querySelectorAll("[data-node]");
const panelLayer = document.getElementById("panel-layer");
const tooltip = document.getElementById("tooltip");

if (overlay) {
    overlay.classList.add("active");
    const inner = overlay.querySelector(".overlay__inner");
    if (inner) {
        gsap.fromTo(inner, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, ease: "power3.out" });
    }
}

if (!isWebGLAvailable()) {
    if (overlay) {
        overlay.classList.add("active");
        overlay.innerHTML = "<div class='overlay__inner'><h1>WebGL unavailable</h1><p>Your browser/device cannot render WebGL. Try on another device to explore NeoGraff.</p></div>";
    }
} else {
    const panelManager = new PanelManager(panelLayer);
    const scene = new GraffitiScene(canvas, graffitiNodes, handleSelect, tooltip);

    const dismissOverlay = () => {
        if (!overlay?.classList.contains("active")) return;
        gsap.to(overlay, {
            duration: 0.8,
            opacity: 0,
            ease: "power3.inOut",
            onComplete: () => overlay.classList.remove("active")
        });
    };

    enterButton?.addEventListener("click", dismissOverlay);
    window.addEventListener("keydown", event => {
        if ((event.key === "Enter" || event.key === " ") && overlay?.classList.contains("active")) {
            dismissOverlay();
        }
    });

    navButtons.forEach(btn => btn.addEventListener("click", () => {
        const nodeId = btn.dataset.node;
        setActiveButton(nodeId);
        scene.highlightNodeById(nodeId);
    }));

    function handleSelect(nodeId) {
        setActiveButton(nodeId);
        const node = graffitiNodes.find(item => item.id === nodeId);
        if (node) {
            panelManager.show(node);
        }
    }
}

function setActiveButton(id) {
    navButtons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.node === id);
    });
}

function isWebGLAvailable() {
    try {
        const canvas = document.createElement("canvas");
        return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
    } catch (error) {
        return false;
    }
}
