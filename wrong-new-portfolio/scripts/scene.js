import { gsap } from "https://cdn.skypack.dev/gsap@3.12.5";
import * as THREE from "https://unpkg.com/three@0.163.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.163.0/examples/jsm/controls/OrbitControls.js?module";

const colorMap = {
    spray: 0xff6df0,
    holo: 0x00e5ff,
    ink: 0xffb347
};

export class GraffitiScene {
    constructor(canvas, nodes, onSelect, tooltipEl) {
        this.canvas = canvas;
        this.nodes = nodes;
        this.onSelect = onSelect;
        this.tooltipEl = tooltipEl;
        this.pointer = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.intersected = null;
        this.activeMesh = null;
        this.interactiveMeshes = [];
        this.defaultCameraPos = new THREE.Vector3(0, 6, 16);
        this.defaultLookAt = new THREE.Vector3(0, 2, 0);

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x050509, 0.045);

        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
        this.camera.position.copy(this.defaultCameraPos ?? new THREE.Vector3(0, 5, 18));

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.controls = new OrbitControls(this.camera, canvas);
        this.controls.enablePan = false;
        this.controls.enableZoom = false;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.8;

        this.#addLights();
        this.#buildEnvironment();
        this.#createTotems();

        window.addEventListener("resize", () => this.#handleResize());
        canvas.addEventListener("pointermove", e => this.#handlePointerMove(e));
        canvas.addEventListener("click", () => this.#handleClick());

        this.#loop();
    }

    #addLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambient);

        const dir = new THREE.DirectionalLight(0xfef7d3, 1.1);
        dir.position.set(6, 8, 4);
        this.scene.add(dir);

        const magenta = new THREE.PointLight(0xff00d4, 1.4, 40);
        magenta.position.set(-6, 2, 0);
        this.scene.add(magenta);

        const cyan = new THREE.SpotLight(0x00e5ff, 1.6, 50, Math.PI / 5, 0.5);
        cyan.position.set(4, 6, -5);
        this.scene.add(cyan);
    }

    #buildEnvironment() {
        const wallGeo = new THREE.PlaneGeometry(50, 28);
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x080711,
            roughness: 0.95,
            metalness: 0.15,
            emissive: 0x120a1d,
            emissiveIntensity: 0.8
        });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(0, 8, -18);
        this.scene.add(wall);

        const groundGeo = new THREE.CircleGeometry(11, 64);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x06050b,
            metalness: 0.2,
            roughness: 0.8,
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.51;
        this.scene.add(ground);

        const ribbonGeo = new THREE.TorusGeometry(6.5, 0.12, 24, 180);
        const ribbonMat = new THREE.MeshBasicMaterial({ color: 0x3c0f62, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
        const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
        ribbon.rotation.x = Math.PI / 2.35;
        ribbon.position.y = 0.4;
        ribbon.scale.set(1.4, 1, 1);
        this.scene.add(ribbon);

        this.#createDust();
    }

    #createDust() {
        const particleCount = 900;
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i += 1) {
            positions[i * 3] = (Math.random() - 0.5) * 40;
            positions[i * 3 + 1] = Math.random() * 14 + 1;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

        const sprite = this.#generateCircleTexture();
        const material = new THREE.PointsMaterial({
            map: sprite,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
            size: 0.22,
            color: 0xffffff
        });
        this.sprayParticles = new THREE.Points(geometry, material);
        this.scene.add(this.sprayParticles);
    }

    #generateCircleTexture() {
        const size = 128;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, "rgba(255,255,255,1)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        return new THREE.CanvasTexture(canvas);
    }

    #createTotems() {
        this.totemGroups = [];
        const radius = 7.5;
        const step = (Math.PI * 2) / this.nodes.length;
        this.nodes.forEach((node, index) => {
            const angle = index * step;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            const group = this.#buildTotem(node);
            group.position.set(x, 0, z);
            group.rotation.y = -angle + Math.PI / 2;
            this.scene.add(group);
            this.totemGroups.push(group);

            group.traverse(child => {
                if (child.isMesh) {
                    child.userData = {
                        nodeId: node.id,
                        label: node.label,
                        root: group
                    };
                    this.interactiveMeshes.push(child);
                }
            });
        });
    }

    #buildTotem(node) {
        const group = new THREE.Group();
        group.userData = { nodeId: node.id, label: node.label };
        const accent = colorMap[node.vignette] || 0xffffff;

        if (node.id === "graffiti" || node.id === "street") {
            this.#buildSprayCan(group, accent);
        } else if (node.id === "cs") {
            this.#buildHoloModule(group, accent);
        } else {
            this.#buildInkGlyph(group, accent);
        }

        gsap.to(group.position, {
            y: "+=0.6",
            duration: 2 + Math.random(),
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
        gsap.to(group.rotation, {
            y: "+=0.6",
            duration: 6,
            repeat: -1,
            ease: "sine.inOut"
        });

        return group;
    }

    #buildSprayCan(group, accent) {
        const bodyMat = new THREE.MeshPhysicalMaterial({
            color: accent,
            metalness: 0.3,
            roughness: 0.25,
            clearcoat: 0.8,
            clearcoatRoughness: 0.1,
            emissive: accent,
            emissiveIntensity: 0.08
        });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 3.2, 48), bodyMat);
        body.position.y = 2.2;
        group.add(body);

        const capMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.2 });
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.5, 32), capMat);
        cap.position.y = 3.6;
        group.add(cap);

        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.25, 16), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        nozzle.position.set(0, 3.95, 0.08);
        group.add(nozzle);

        const dripMat = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.4, transparent: true, opacity: 0.8 });
        const drip = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.8, 6, 12), dripMat);
        drip.position.set(0.5, 1.5, 0.3);
        drip.rotation.z = Math.PI / 5;
        group.add(drip);
    }

    #buildHoloModule(group, accent) {
        const prismMat = new THREE.MeshPhysicalMaterial({
            color: 0x10152a,
            metalness: 0.4,
            roughness: 0.1,
            transmission: 0.7,
            transparent: true,
            opacity: 0.9,
            emissive: accent,
            emissiveIntensity: 0.25
        });
        const prism = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.4, 2.4, 6), prismMat);
        prism.position.y = 1.8;
        group.add(prism);

        const core = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.8 }));
        core.position.y = 1.8;
        group.add(core);

        const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(1.3, 1.3, 1.3)),
            new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.4 })
        );
        edges.position.y = 1.8;
        group.add(edges);
    }

    #buildInkGlyph(group, accent) {
        const orbMat = new THREE.MeshStandardMaterial({
            color: accent,
            metalness: 0.2,
            roughness: 0.5,
            emissive: accent,
            emissiveIntensity: 0.15,
            transparent: true,
            opacity: 0.95
        });
        const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 1), orbMat);
        orb.position.y = 1.6;
        group.add(orb);

        const ringMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.4, 32), ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 1.6;
        group.add(ring);
    }

    #handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    #handlePointerMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.tooltipEl.style.left = `${event.clientX}px`;
        this.tooltipEl.style.top = `${event.clientY}px`;
    }

    #handleClick() {
        if (this.intersected) {
            const root = this.intersected.object.userData?.root || this.intersected.object;
            this.#focusTotem(root);
            this.onSelect(root.userData.nodeId);
        } else {
            this.clearFocus(true);
        }
    }

    #focusTotem(group) {
        if (!group) return;
        if (this.activeMesh && this.activeMesh !== group) {
            gsap.to(this.activeMesh.scale, { x: 1, y: 1, z: 1, duration: 0.8, ease: "power2.out" });
        }
        this.activeMesh = group;
        gsap.to(group.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.8, ease: "back.out(2)" });

        const target = group.position.clone().normalize().multiplyScalar(10);
        target.y += 3;
        this.#moveCamera(target, group.position.clone().setY(1.5));
    }

    highlightNodeById(nodeId) {
        const group = this.totemGroups.find(m => m.userData.nodeId === nodeId);
        if (group) {
            this.#focusTotem(group);
            this.onSelect(nodeId);
        }
    }

    clearFocus(shouldNotify = false) {
        if (this.activeMesh) {
            gsap.to(this.activeMesh.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: "power2.out" });
            this.activeMesh = null;
        }
        this.#moveCamera(this.defaultCameraPos, this.defaultLookAt);
        if (shouldNotify) {
            this.onSelect(null);
        }
    }

    #moveCamera(position, lookAt) {
        gsap.to(this.camera.position, {
            duration: 1,
            x: position.x,
            y: position.y,
            z: position.z,
            ease: "power2.out",
            onUpdate: () => {
                this.camera.lookAt(lookAt);
            }
        });
    }

    #loop() {
        requestAnimationFrame(() => this.#loop());
        this.controls.update();
        if (this.sprayParticles) {
            this.sprayParticles.rotation.y += 0.0008;
        }
        this.#updateRaycaster();
        this.renderer.render(this.scene, this.camera);
    }

    #updateRaycaster() {
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false);

        if (intersects.length) {
            if (this.intersected !== intersects[0]) {
                this.intersected = intersects[0];
                this.tooltipEl.textContent = this.intersected.object.userData.label;
                this.tooltipEl.classList.add("visible");
            }
        } else {
            this.intersected = null;
            this.tooltipEl.classList.remove("visible");
        }
    }
}
