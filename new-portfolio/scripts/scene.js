import { gsap } from "https://cdn.skypack.dev/gsap";
import * as THREE from "https://unpkg.com/three@0.162.0/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.162.0/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from './OrbitControls.js';

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
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf2ece3);
    this.scene.fog = new THREE.FogExp2(0xf2ece3, 0.018);
    this.renderer.setClearColor(this.scene.background, 1);
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
    this.shaderUniforms = null;

    this.createEnvironment();
    this.createRoomDetails();
    this.createStops();


    // Add base assets
    this.addBed();
    this.addSofa();
    this.addCoffeeTable();
    this.addReadingChair();
    this.addSimpleBookstack();
    this.addCanonRetroCamera();
    this.addBrokenWindow();
    this.addLeaves();
    this.addSkybox();
    this.addShelf();
    this.addDesk();
    this.addOfficeChair();
    this.addCarpet();
    this.addChaussons();

    // Debug camera mode
    this.debugCameraMode = false;
    this.orbitControls = null;
  window.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') {
      this.toggleDebugCamera();
    }
  });
  this.toggleDebugCamera = () => {
    if (!this.debugCameraMode) {
      // Enable OrbitControls
      if (!this.orbitControls) {
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.08;
        this.orbitControls.screenSpacePanning = false;
        this.orbitControls.minDistance = 1;
        this.orbitControls.maxDistance = 40;
        this.orbitControls.target.set(0, 1.4, -0.2);
      }
      this.orbitControls.enabled = true;
      this.debugCameraMode = true;
    } else {
      // Disable OrbitControls and reset camera
      if (this.orbitControls) this.orbitControls.enabled = false;
      this.camera.position.set(0, 2.1, 5.4);
      this.currentLookAt.set(0, 1.4, -0.2);
      this.debugCameraMode = false;
    }
  };

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
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xdcc0a7, metalness: 0, roughness: 1 });
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf8eddf, metalness: 0, roughness: 1 });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 12), floorMaterial);
    floor.position.set(0,0, 4.25);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Create back wall with a hole for the window
    const wallWidth = 22, wallHeight = 9.5;
    // Adjust these to match your window asset's actual size and position
    const windowWidth = 1.4, windowHeight = 1.8; // vertical rectangle
    const windowCenterX = -7, windowCenterY = 0.7; // match window position
    // Wall shape
    const wallShape = new THREE.Shape();
    wallShape.moveTo(-wallWidth/2, -wallHeight/2);
    wallShape.lineTo(wallWidth/2, -wallHeight/2);
    wallShape.lineTo(wallWidth/2, wallHeight/2);
    wallShape.lineTo(-wallWidth/2, wallHeight/2);
    wallShape.lineTo(-wallWidth/2, -wallHeight/2);
    // Window hole
    // Window hole (vertical rectangle)
    const hole = new THREE.Path();
    hole.moveTo(windowCenterX - windowWidth/2, windowCenterY - windowHeight/2);
    hole.lineTo(windowCenterX + windowWidth/2, windowCenterY - windowHeight/2);
    hole.lineTo(windowCenterX + windowWidth/2, windowCenterY + windowHeight/2);
    hole.lineTo(windowCenterX - windowWidth/2, windowCenterY + windowHeight/2);
    hole.lineTo(windowCenterX - windowWidth/2, windowCenterY - windowHeight/2);
    wallShape.holes.push(hole);
    // Geometry with hole
    const wallGeometry = new THREE.ShapeGeometry(wallShape);
    const backWall = new THREE.Mesh(wallGeometry, wallMaterial.clone());
    backWall.position.set(0, 2.4, -1.7);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 9.5), wallMaterial.clone());
    leftWall.position.set(-10, 2.4, 4.25);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 9.5), wallMaterial.clone());
    rightWall.position.set(10, 2.4, 4.25);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 12),
      new THREE.MeshStandardMaterial({ color: 0xfaf4ea, roughness: 0.96 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4.8;
    ceiling.position.z = 4.25;
    ceiling.receiveShadow = false;
    this.scene.add(ceiling);

    const mainLight = new THREE.DirectionalLight(0xfff2e0, 1.0);
    mainLight.position.set(5, 5, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.set(2048, 2048);
    mainLight.shadow.bias = -0.0001;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 20;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    this.scene.add(mainLight);

    const ambientLight = new THREE.AmbientLight(0xfff2e0, 0.5);
    this.scene.add(ambientLight);
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

  loadModelAndPlace({ url, position, rotation = [0, 0, 0], targetSize = 1.5, parent = this.scene }) {
    this.gltfLoader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z, 0.0001);
        const scale = targetSize / maxDim;
        model.scale.setScalar(scale);
        model.position.set(position[0], position[1], position[2]);
        model.rotation.set(
          THREE.MathUtils.degToRad(rotation[0]),
          THREE.MathUtils.degToRad(rotation[1]),
          THREE.MathUtils.degToRad(rotation[2])
        );
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        parent.add(model);
      },
      undefined,
      (error) => {
        console.warn(`Failed to load model ${url}`, error);
      }
    );
  }

  addBed() {
    this.loadModelAndPlace({
      url: "./assets/models/bed.glb",
      position: [-7, -0.1, -0.3],
      rotation: [0, 180, 0],
      targetSize: 3.2
    });
  }

  addSofa() {
    this.loadModelAndPlace({
      url: "./assets/models/sofa.glb",
      position: [1.8, 0, -0.4],
      rotation: [0, 60, 0],
      targetSize: 2.8
    });
  }

  addCoffeeTable() {
    this.loadModelAndPlace({
      url: "./assets/models/coffee_table.glb",
      position: [1.25, 0, 1.25],
      rotation: [0, 0, 0],
      targetSize: 1.4
    });
  }

  addReadingChair() {
    this.loadModelAndPlace({
      url: "./assets/models/chair.glb",
      position: [2.5, 0, 1.75],
      rotation: [0, -45, 0],
      targetSize: 1.15
    });
  }

  addSimpleBookstack () {
    this.loadModelAndPlace({
      url: "./assets/models/simple_bookstack.glb",
      position: [1.65, 0.6, 1.42],
      rotation: [0, 45, 0],
      targetSize: 0.5
    });
  }

  addCanonRetroCamera () {
    this.loadModelAndPlace({
      url: "./assets/models/canon_retro_camera.glb",
      position: [0.95, 0.6, 1.65],
      rotation: [0, -32, 0],
      targetSize: 0.25
    });
  }

  addBrokenWindow () {
    this.loadModelAndPlace({
      url: "./assets/models/broken_window.glb",
      position: [-7, 3, -1.65],
      rotation: [0, 0, 0],
      targetSize: 2
    });
  }

  addLeaves () {
    this.loadModelAndPlace({
      url: "./assets/models/leaves.glb",
      position: [-8, 0.5, -2.3],
      rotation: [90, 0, 0],
      targetSize: 10
    });
  }

  addSkybox() {
    this.loadModelAndPlace({
      url: "./assets/models/skybox_autumn_forest.glb",
      position: [0, 0, 4],
      rotation: [0, -24, 0],
      targetSize: 25
    });
  }

  addShelf () {
    this.loadModelAndPlace({
      url: "./assets/models/shelf.glb",
      position: [-5.75, -0.03, -1.63],
      rotation: [0, -90, 0],
      targetSize: 2
    });
  }

  addDesk () {
    this.loadModelAndPlace({
      url: "./assets/models/desk.glb",
      position: [-2.5, 0, -1.68],
      rotation: [0, 0, 0],
      targetSize: 2
    });
  }

  addOfficeChair () {
    this.loadModelAndPlace({
      url: "./assets/models/office_chair.glb",
      position: [-1.3, 0.04, -0.5],
      rotation: [0, 150, 0],
      targetSize: 1.5
    });
  }

  addCarpet () {
    this.loadModelAndPlace({
      url: "./assets/models/carpet.glb",
      position: [-4.5, 0.03, 0.18],
      rotation: [0, 0, 0],
      targetSize: 2.5
    });
  }

  addChaussons() {
    this.loadModelAndPlace({
      url: "./assets/models/chaussons.glb",
      position: [-5.25, 0.05, 0.32],
      rotation: [0, 79, 0],
      targetSize: 0.5
    });
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

    if (this.shaderUniforms?.floor) {
      this.shaderUniforms.floor.uTime.value = elapsed;
    }
    if (this.shaderUniforms?.wall) {
      this.shaderUniforms.wall.uTime.value = elapsed;
    }

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


    if (this.debugCameraMode && this.orbitControls) {
      this.orbitControls.update();
    } else {
      const lookX = this.currentLookAt.x + this.parallax.x * 0.3;
      const lookY = this.currentLookAt.y + this.parallax.y * 0.2;
      this.camera.lookAt(lookX, lookY, this.currentLookAt.z);
    }

    this.renderer.render(this.scene, this.camera);
  }
}