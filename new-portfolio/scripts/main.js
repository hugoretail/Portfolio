import { gsap } from "https://cdn.skypack.dev/gsap@3.12.5";
import { graffitiNodes } from "./content.js";
import { PanelManager } from "./panels.js";
import { GraffitiScene } from "./scene.js";

const canvas = document.getElementById("graffiti-canvas");
const overlay = document.getElementById("entry-overlay");
const panelLayer = document.getElementById("panel-layer");
const tooltip = document.getElementById("tooltip");
let panelManager;
let scene;
let activeNodeId = null;

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
    panelManager = new PanelManager(panelLayer);
    panelManager.reset();
    scene = new GraffitiScene(canvas, graffitiNodes, handleSelect, tooltip);
    const HOLD_DURATION = 1.15;
    let sprayTween = null;

    const dismissOverlay = () => {
        if (!overlay?.classList.contains("active")) return;
        sprayTween?.kill();
        sprayTween = null;
        overlay.classList.remove("overlay--charging");
        gsap.timeline({
            onComplete: () => {
                overlay.classList.remove("active");
                overlay.style.removeProperty("opacity");
            }
        })
            .to(overlay, { "--spray-scale": 4, duration: 0.6, ease: "power2.out" })
            .to(overlay, { opacity: 0, duration: 0.8, ease: "power3.inOut" }, "<0.1");
    };

    initSprayEntrance(dismissOverlay);

    window.addEventListener("keydown", event => {
        if (event.key === "Escape" && scene) {
            scene.clearFocus();
            panelManager.reset();
            activeNodeId = null;
        }
    });

    function handleSelect(nodeId) {
        if (!nodeId || activeNodeId === nodeId) {
            activeNodeId = null;
            panelManager.reset();
            if (scene && nodeId) {
                // toggle off when same totem selected
                scene.clearFocus();
            }
            return;
        }

        activeNodeId = nodeId;
        const node = graffitiNodes.find(item => item.id === nodeId);
        if (node) {
            panelManager.show(node);
        }
    }

    function initSprayEntrance(onEnter) {
        if (!overlay) return;
        let pointerId = null;

        overlay.addEventListener("pointermove", event => {
            if (!overlay.classList.contains("active")) return;
            overlay.style.setProperty("--spray-x", `${event.clientX}px`);
            overlay.style.setProperty("--spray-y", `${event.clientY}px`);
        });

        overlay.addEventListener("pointerdown", event => {
            if (sprayTween || !overlay.classList.contains("active")) return;
            pointerId = event.pointerId;
            overlay.classList.add("overlay--charging");
            overlay.setPointerCapture?.(pointerId);
            sprayTween = gsap.to(overlay, {
                duration: HOLD_DURATION,
                ease: "power2.out",
                "--spray-scale": 1.8,
                onComplete: () => {
                    sprayTween = null;
                    overlay.classList.remove("overlay--charging");
                    releasePointer();
                    onEnter();
                }
            });
        });

        const cancelCharge = () => {
            if (!sprayTween) return;
            sprayTween.kill();
            sprayTween = null;
            overlay.classList.remove("overlay--charging");
            gsap.to(overlay, { "--spray-scale": 0, duration: 0.35, ease: "power2.in" });
            releasePointer();
        };

        overlay.addEventListener("pointerup", cancelCharge);
        overlay.addEventListener("pointerleave", cancelCharge);
        overlay.addEventListener("pointercancel", cancelCharge);

        window.addEventListener("keydown", event => {
            if ((event.key === "Enter" || event.key === " ") && overlay?.classList.contains("active")) {
                onEnter();
            }
        });

        function releasePointer() {
            if (pointerId !== null) {
                overlay.releasePointerCapture?.(pointerId);
                pointerId = null;
            }
        }
    }
}

function isWebGLAvailable() {
    try {
        const canvas = document.createElement("canvas");
        return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
    } catch (error) {
        return false;
    }
}
