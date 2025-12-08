import { gsap } from "https://cdn.skypack.dev/gsap";
import * as THREE from "https://unpkg.com/three@0.162.0/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.162.0/examples/jsm/loaders/GLTFLoader.js";

export class GraffitiStudioScene {
  constructor({ canvas, stops, onSelect, onHover }) {
    this.canvas = canvas;
    this.stops = stops;
    this.onSelect = onSelect;
    this.onHover = onHover;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.scene.fog = new THREE.FogExp2(0xf7ecde, 0.05);
    this.camera = new THREE.PerspectiveCamera(
      52,
      window.innerWidth / window.innerHeight,
      0.1,
      120
    );
    this.camera.position.set(0, 2.1, 5.4);
    this.currentLookAt = new THREE.Vector3(0, 1.4, -0.2);

    this.pointer = new THREE.Vector2();
    this.parallax = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock();
    this.gltfLoader = new GLTFLoader();

    this.stopInstances = new Map();
    this.interactiveMeshes = [];
    this.floatingItems = [];
    this.anchorObjects = {};
    this.seaTexture = this.createSeaTexture();

    this.createEnvironment();
    this.createRoomDetails();
    this.createStops();

    this.handleResize = this.handleResize.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);
    this.handleClick = this.handleClick.bind(this);

    window.addEventListener("resize", this.handleResize);
    canvas.addEventListener("pointermove", this.handlePointerMove);
    canvas.addEventListener("pointerleave", this.handlePointerLeave);
    canvas.addEventListener("click", this.handleClick);

    this.handleResize();
    this.animate();
  }

  createEnvironment() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 12),
      new THREE.MeshStandardMaterial({ color: 0xdcc0a7, metalness: 0.2, roughness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 9.5),
      new THREE.MeshStandardMaterial({ color: 0xf5e8d9, metalness: 0.03, roughness: 0.96 })
    );
    backWall.position.set(0, 2.4, -1.7);
    this.scene.add(backWall);

    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 9.5),
      new THREE.MeshStandardMaterial({ color: 0xf8eddf, metalness: 0.04, roughness: 0.95 })
    );
    leftWall.position.set(-10, 2.4, 0.2);
    leftWall.rotation.y = Math.PI / 2;
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 9.5),
      new THREE.MeshStandardMaterial({ color: 0xf8eddf, metalness: 0.04, roughness: 0.95 })
    );
    rightWall.position.set(10, 2.4, 0.2);
    rightWall.rotation.y = -Math.PI / 2;
    this.scene.add(rightWall);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 12),
      new THREE.MeshStandardMaterial({ color: 0xfaf4ea, roughness: 1 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4.8;
    this.scene.add(ceiling);

    const ambient = new THREE.HemisphereLight(0xfff7eb, 0xf3d9c3, 0.78);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffedd3, 0.85);
    keyLight.position.set(4, 6.2, 3.2);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xfdf3df, 0.6);
    fillLight.position.set(-4, 4.5, -4.5);
    this.scene.add(fillLight);

    const lampLight = new THREE.PointLight(0xffd6a5, 0.6, 12, 2);
    lampLight.position.set(-4.2, 3.1, 1.6);
    this.scene.add(lampLight);
  }

  createRoomDetails() {
    const anchorMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.001,
      depthWrite: false
    });

    const registerAnchor = (name, geometry, position, rotation) => {
      const anchor = new THREE.Mesh(geometry, anchorMaterial.clone());
      anchor.position.copy(position);
      if (rotation) {
        anchor.rotation.set(rotation.x ?? 0, rotation.y ?? 0, rotation.z ?? 0);
      }
      this.scene.add(anchor);
      this.anchorObjects[name] = anchor;
    };

    registerAnchor(
      "atelier",
      new THREE.BoxGeometry(2.8, 1.4, 1.6),
      new THREE.Vector3(-4.3, 0.9, 0.2)
    );
    registerAnchor(
      "graffiti",
      new THREE.PlaneGeometry(4.8, 3),
      new THREE.Vector3(-2.7, 3, -1.55),
      { y: Math.PI }
    );
    registerAnchor(
      "code",
      new THREE.BoxGeometry(2.2, 2.6, 0.8),
      new THREE.Vector3(3.2, 1.4, -0.2)
    );
    registerAnchor(
      "contact",
      new THREE.CylinderGeometry(0.9, 0.2, 1.6, 12),
      new THREE.Vector3(3.7, 0.8, 1.3)
    );
  }

  createSeaTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#d7f0ff");
    gradient.addColorStop(0.55, "#7ecbff");
    gradient.addColorStop(1, "#1f86b2");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      const baseY = 150 + i * 25;
      ctx.moveTo(0, baseY);
      for (let x = 0; x <= canvas.width; x += 32) {
        const controlX = x + 16;
        const controlY = baseY + (i % 2 === 0 ? 6 : -6);
        ctx.quadraticCurveTo(controlX, controlY, x + 32, baseY);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return texture;
  }

  placeSprayCan(parent) {
    const tableSurfaceHeight = 0.44;
    const target = parent ?? this.scene;
    this.gltfLoader.load(
      "./assets/models/graffiti_spray_can.glb",
      (gltf) => {
        const sprayCan = gltf.scene;
        const box = new THREE.Box3().setFromObject(sprayCan);
        const size = new THREE.Vector3();
        box.getSize(size);
        const desiredHeight = 0.34;
        const scaleFactor = desiredHeight / (size.y || 1);
        sprayCan.scale.setScalar(scaleFactor);
        sprayCan.rotation.y = THREE.MathUtils.degToRad(-30);
        sprayCan.rotation.z = THREE.MathUtils.degToRad(2);
        sprayCan.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        sprayCan.updateMatrixWorld(true);
        const adjustedBox = new THREE.Box3().setFromObject(sprayCan);
        sprayCan.position.set(0.25, tableSurfaceHeight - adjustedBox.min.y, -0.1);
        target.add(sprayCan);
      },
      undefined,
      (error) => {
        console.warn("Failed to load graffiti spray can model", error);
      }
    );
  }

  createStops() {
    this.stops.forEach((stop) => {
      const anchorMesh = stop.anchor ? this.anchorObjects?.[stop.anchor] : null;
      let mesh = anchorMesh ?? this.createMeshForStop(stop);
      if (!mesh) {
        console.warn(`Aucun mesh pour le stop ${stop.id}`);
        return;
      }

      if (!anchorMesh) {
        this.scene.add(mesh);
      }

      mesh.userData.stopId = stop.id;
      if (typeof mesh.traverse === "function") {
        mesh.traverse((child) => {
          child.userData.stopId = stop.id;
        });
      }

      this.interactiveMeshes.push(mesh);

      if (!anchorMesh) {
        this.floatingItems.push({
          mesh,
          basePosition: mesh.position.clone(),
          amplitude: 0.18 + Math.random() * 0.22,
          speed: 0.5 + Math.random() * 0.4,
          offset: Math.random() * Math.PI * 2
        });
      }

      this.stopInstances.set(stop.id, {
        data: stop,
        mesh
      });
    });
  }

  createMeshForStop(stop) {
    if (stop.model?.url) {
      return this.createModelForStop(stop);
    }
    if (!stop.mesh) {
      console.warn(`Aucun mesh défini pour le stop ${stop.id}`);
      return null;
    }

    const color = new THREE.Color(stop.mesh?.color ?? "#ffffff");
    let geometry;
    let material;

    switch (stop.mesh.type) {
      case "desk":
        geometry = new THREE.BoxGeometry(2.6, 0.5, 1.2);
        material = new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.4,
          transmission: 0.15,
          thickness: 0.6,
          clearcoat: 1,
          clearcoatRoughness: 0.2
        });
        break;
      case "wall":
        geometry = new THREE.PlaneGeometry(3.6, 2.8, 16, 16);
        material = new THREE.MeshStandardMaterial({
          color,
          metalness: 0.2,
          roughness: 0.65,
          emissive: 0x330a13,
          emissiveIntensity: 0.7
        });
        break;
      case "prism":
        geometry = new THREE.OctahedronGeometry(1.1, 0);
        material = new THREE.MeshStandardMaterial({
          color,
          metalness: 0.8,
          roughness: 0.2,
          emissive: 0x113836,
          emissiveIntensity: 0.6
        });
        break;
      case "portal":
        geometry = new THREE.TorusKnotGeometry(0.8, 0.18, 120, 16);
        material = new THREE.MeshStandardMaterial({
          color,
          metalness: 0.3,
          roughness: 0.25,
          emissive: 0x331b02,
          emissiveIntensity: 0.8
        });
        break;
      default:
        geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
        material = new THREE.MeshStandardMaterial({ color });
    }

    const mesh = new THREE.Mesh(geometry, material);
    const lookAt = stop.camera?.lookAt ?? [0, 1.4, 0];
    mesh.position.set(lookAt[0], lookAt[1], 0);

    if (stop.mesh.type === "desk") {
      mesh.position.y = 0.75;
    }
    if (stop.mesh.type === "wall") {
      mesh.position.z = -0.6;
    }

    return mesh;
  }

  createModelForStop(stop) {
    const proxy = new THREE.Group();
    const [px, py, pz] = stop.model?.position ?? stop.camera?.lookAt ?? [0, 1.4, 0];
    proxy.position.set(px, py, pz ?? 0);

    if (stop.model?.rotation) {
      proxy.rotation.set(
        THREE.MathUtils.degToRad(stop.model.rotation[0] ?? 0),
        THREE.MathUtils.degToRad(stop.model.rotation[1] ?? 0),
        THREE.MathUtils.degToRad(stop.model.rotation[2] ?? 0)
      );
    }

    this.gltfLoader.load(
      stop.model.url,
      (gltf) => {
        const model = gltf.scene;
        const scale = stop.model?.scale ?? 1;
        if (Array.isArray(scale)) {
          model.scale.set(scale[0] ?? 1, scale[1] ?? 1, scale[2] ?? 1);
        } else {
          model.scale.setScalar(scale);
        }
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        proxy.add(model);
      },
      undefined,
      (error) => {
        console.warn(`Impossible de charger le modèle ${stop.model.url}`, error);
      }
    );

    return proxy;
  }

  focusStop(id) {
    const target = this.stopInstances.get(id);
    if (!target) return;
    this.activeStop = id;
    const { camera } = target.data;
    const [x, y, z] = camera.position;
    const [tx, ty, tz] = camera.lookAt;

    gsap.to(this.camera.position, {
      x,
      y,
      z,
      duration: 1.3,
      ease: "power3.inOut"
    });
    gsap.to(this.currentLookAt, {
      x: tx,
      y: ty,
      z: tz,
      duration: 1.1,
      ease: "power2.out"
    });

    this.highlightMesh(target.mesh);
  }

  resetFocus() {
    this.activeStop = null;
    gsap.to(this.camera.position, {
      x: 0,
      y: 2,
      z: 5.4,
      duration: 1.1,
      ease: "power2.inOut"
    });
    gsap.to(this.currentLookAt, {
      x: 0,
      y: 1.4,
      z: -0.2,
      duration: 1,
      ease: "power2.inOut"
    });
    this.clearHighlights();
  }

  highlightMesh(mesh) {
    this.clearHighlights(mesh);
    gsap.to(mesh.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.6, ease: "power2.out" });
  }

  clearHighlights(except) {
    this.interactiveMeshes.forEach((item) => {
      if (item === except) return;
      gsap.to(item.scale, { x: 1, y: 1, z: 1, duration: 0.8, ease: "power2.out" });
    });
  }

  handlePointerMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.pointer.set(x, y);
    this.parallax.set(x, y);
    this.updateHover(event);
  }

  handlePointerLeave() {
    document.body.style.cursor = "";
    this.hoveredMesh = null;
    this.onHover?.(null);
  }

  handleClick() {
    if (this.hoveredMesh) {
      const stopId = this.hoveredMesh.userData.stopId;
      this.onSelect?.(stopId);
      this.focusStop(stopId);
    } else {
      this.onSelect?.(null);
      this.resetFocus();
    }
  }

  updateHover(event) {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactiveMeshes, true);
    if (hits.length) {
      let mesh = hits[0].object;
      while (mesh && !mesh.userData.stopId) {
        mesh = mesh.parent;
      }
      if (!mesh) {
        document.body.style.cursor = "";
        this.hoveredMesh = null;
        this.onHover?.(null);
        return;
      }
      this.hoveredMesh = mesh;
      const stop = this.stopInstances.get(mesh.userData.stopId)?.data;
      document.body.style.cursor = "pointer";
      this.onHover?.({
        stop,
        x: event.clientX,
        y: event.clientY
      });
    } else {
      document.body.style.cursor = "";
      this.hoveredMesh = null;
      this.onHover?.(null);
    }
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const elapsed = this.clock.getElapsedTime();

    this.floatingItems.forEach((item) => {
      const { mesh, basePosition, amplitude, speed, offset } = item;
      mesh.position.y = basePosition.y + Math.sin(elapsed * speed + offset) * amplitude;
      if (mesh.geometry.type === "OctahedronGeometry") {
        mesh.rotation.y += 0.005;
      }
      if (mesh.geometry.type === "TorusKnotGeometry") {
        mesh.rotation.y += 0.004;
        mesh.rotation.x += 0.002;
      }
    });

    const lookX = this.currentLookAt.x + this.parallax.x * 0.3;
    const lookY = this.currentLookAt.y + this.parallax.y * 0.2;
    this.camera.lookAt(lookX, lookY, this.currentLookAt.z);

    this.renderer.render(this.scene, this.camera);
  }
}
