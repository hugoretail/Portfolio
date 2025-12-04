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

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x050509, 0.045);

        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
        this.camera.position.set(0, 5, 18);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.controls = new OrbitControls(this.camera, canvas);
        this.controls.enablePan = false;
        this.controls.enableZoom = false;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.8;

        this.#addLights();
        this.#buildFloor();
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

    #buildFloor() {
        const geometry = new THREE.CylinderGeometry(9, 12, 0.6, 64, 1, true);
        const material = new THREE.MeshStandardMaterial({
            color: 0x0d0f17,
            metalness: 0.4,
            roughness: 0.6,
            side: THREE.DoubleSide
        });
        const floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = Math.PI / 2;
        floor.position.y = -0.5;
        this.scene.add(floor);

        const particles = new THREE.BufferGeometry();
        const count = 600;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i += 1) {
            positions[i * 3] = (Math.random() - 0.5) * 30;
            positions[i * 3 + 1] = Math.random() * 12 + 1;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
        }
        particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const particleMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.45 });
        this.sprayParticles = new THREE.Points(particles, particleMat);
        this.scene.add(this.sprayParticles);
    }

    #createTotems() {
        this.meshes = [];
        const radius = 8;
        const step = (Math.PI * 2) / this.nodes.length;
        this.nodes.forEach((node, index) => {
            const angle = index * step;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const height = 2.2 + Math.random() * 1.8;

            const geometry = new THREE.CapsuleGeometry(0.6, height, 6, 12);
            const material = new THREE.MeshStandardMaterial({
                color: colorMap[node.vignette] || 0xffffff,
                metalness: 0.4,
                roughness: 0.3,
                emissive: (colorMap[node.vignette] || 0xffffff) * 0.2,
                emissiveIntensity: 0.4
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(x, height / 2, z);
            mesh.rotation.y = angle;
            mesh.userData = { nodeId: node.id, label: node.label };

            this.scene.add(mesh);
            this.meshes.push(mesh);
        });
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
            const mesh = this.intersected.object;
            this.#focusMesh(mesh);
            this.onSelect(mesh.userData.nodeId);
        }
    }

    #focusMesh(mesh) {
        if (!mesh) return;
        if (this.activeMesh && this.activeMesh !== mesh) {
            gsap.to(this.activeMesh.scale, { x: 1, y: 1, z: 1, duration: 0.8, ease: "power2.out" });
        }
        this.activeMesh = mesh;
        gsap.to(mesh.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.8, ease: "back.out(2)" });

        const target = mesh.position.clone().normalize().multiplyScalar(10);
        target.y += 2.5;
        gsap.to(this.camera.position, {
            duration: 1.2,
            x: target.x,
            y: target.y,
            z: target.z,
            ease: "power2.out",
            onUpdate: () => {
                this.camera.lookAt(mesh.position);
            }
        });
    }

    highlightNodeById(nodeId) {
        const mesh = this.meshes.find(m => m.userData.nodeId === nodeId);
        if (mesh) {
            this.#focusMesh(mesh);
            this.onSelect(nodeId);
        }
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
        const intersects = this.raycaster.intersectObjects(this.meshes);

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
