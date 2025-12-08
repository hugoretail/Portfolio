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
    this.renderer.toneMappingExposure = 0.78;
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
    this.createShaderOverlays();
    this.createRoomDetails();
    this.createStops();


    // Add base assets
    this.addBed();
    this.addSofa();
    this.addCoffeeTable();

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
  createShaderOverlays() {
    const vertexShader = /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    this.shaderUniforms = {
      floor: {
        uTime: { value: 0 },
        uGlow: { value: new THREE.Color(0xf8c496) },
        uBase: { value: new THREE.Color(0x2b1f18) }
      },
      wall: {
        uTime: { value: 0 },
        uTop: { value: new THREE.Color(0xf7d8bd) },
        uBottom: { value: new THREE.Color(0x3b2a23) }
      }
    };

    const floorMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: this.shaderUniforms.floor,
      vertexShader,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform vec3 uGlow;
        uniform vec3 uBase;
        void main() {
          vec2 shifted = vUv - vec2(0.5);
          float radial = smoothstep(0.85, 0.1, length(shifted * vec2(1.5, 1.2)));
          float vignette = smoothstep(1.0, 0.35, length(shifted * vec2(1.2, 1.2)));
          float grid = step(0.97, fract(vUv.x * 10.0)) * step(0.97, fract(vUv.y * 10.0));
          vec3 color = mix(uBase, uGlow, radial) + uGlow * grid * 0.25;
          float alpha = clamp(radial * 0.7 + vignette * 0.2 + grid * 0.15, 0.0, 0.75);
          gl_FragColor = vec4(color, alpha);
        }
      `
    });

    const wallMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: this.shaderUniforms.wall,
      vertexShader,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform float uTime;
        uniform vec3 uTop;
        uniform vec3 uBottom;
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        void main() {
          float gradient = smoothstep(0.0, 1.0, vUv.y);
          float bounce = smoothstep(0.0, 0.45, 1.0 - vUv.y);
          float glow = smoothstep(0.92, 0.4, distance(vec2(vUv.x, vUv.y * 0.75), vec2(0.48, 0.58)));
          float shimmer = noise(vec2(vUv.x * 5.0, vUv.y * 5.0 + uTime * 0.15)) * 0.04;
          vec3 baseColor = mix(uBottom, uTop, gradient);
          vec3 bounceColor = mix(uBottom, uTop, 0.28);
          vec3 color = mix(baseColor, bounceColor, bounce * 0.55);
          color = mix(color, uTop, glow * 0.25) + shimmer;
          float alpha = clamp(0.35 + gradient * 0.25 + bounce * 0.2 + glow * 0.15, 0.15, 0.55);
          gl_FragColor = vec4(color, alpha);
        }
      `
    });

    const floorOverlay = new THREE.Mesh(new THREE.PlaneGeometry(20.2, 12.2), floorMaterial);
    floorOverlay.rotation.x = -Math.PI / 2;
    floorOverlay.position.y = 0.02;
    this.scene.add(floorOverlay);

    const wallOverlay = new THREE.Mesh(new THREE.PlaneGeometry(22.2, 9.7), wallMaterial);
    wallOverlay.position.set(0, 2.45, -1.6);
    this.scene.add(wallOverlay);
  }

  createEnvironment() {
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xdcc0a7, metalness: 0.12, roughness: 0.82 });
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf8eddf, metalness: 0.02, roughness: 0.94 });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 12), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(22, 9.5), wallMaterial.clone());
    backWall.position.set(0, 2.4, -1.7);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 9.5), wallMaterial.clone());
    leftWall.position.set(-10, 2.4, 0.2);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 9.5), wallMaterial.clone());
    rightWall.position.set(10, 2.4, 0.2);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 12),
      new THREE.MeshStandardMaterial({ color: 0xfaf4ea, roughness: 0.96 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4.8;
    ceiling.receiveShadow = false;
    this.scene.add(ceiling);

    const ambient = new THREE.AmbientLight(0xfff1df, 0.55);
    this.scene.add(ambient);

    // Warm ceiling light that behaves like an indoor pendant
    const ceilingLight = new THREE.PointLight(0xffd4ac, 1.25, 32, 1.9);
    ceilingLight.position.set(0.4, 4.4, 0.3);
    ceilingLight.castShadow = true;
    ceilingLight.shadow.mapSize.set(2048, 2048);
    ceilingLight.shadow.bias = -0.0006;
    this.scene.add(ceilingLight);

    // Side lamp style fill to soften shadows on seating area
    const lampFill = new THREE.SpotLight(0xffc494, 0.75, 18, THREE.MathUtils.degToRad(55), 0.32, 1.15);
    lampFill.position.set(-3.4, 3.1, -0.6);
    lampFill.target.position.set(-1.4, 1.1, 0.1);
    lampFill.castShadow = true;
    lampFill.shadow.mapSize.set(1024, 1024);
    lampFill.shadow.bias = -0.0004;
    this.scene.add(lampFill);
    this.scene.add(lampFill.target);

    // Gentle front bounce mimicking wall reflections
    const frontFill = new THREE.DirectionalLight(0xffe7cc, 0.32);
    frontFill.position.set(1.2, 2.6, 5.8);
    frontFill.target.position.set(1.6, 0.8, 0.2);
    frontFill.castShadow = false;
    this.scene.add(frontFill);
    this.scene.add(frontFill.target);
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
      url: "./assets/models/sm_bed.glb",
      position: [-4.4, 0, -0.15],
      rotation: [0, -3, 0],
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
      position: [1.25, 0.4, 1],
      rotation: [0, -23, 0],
      targetSize: 1.4
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

  addInitialAssets() {
    // Reset camera to a natural, default view
    this.camera.position.set(0, 2.1, 5.4);
    this.currentLookAt.set(0, 1.4, -0.2);

    // Helper for loading models with normalized scale (largest dimension -> targetSize)
    const loadModel = (url, position, rotation = [0, 0, 0], targetSize = 1.2, parent = this.scene) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          // Compute bounding box and normalize scale
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          let scale = 1;
          if (maxDim > 0) {
            scale = targetSize / maxDim;
          }
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
    };

    // Place carpet on the floor (centered, larger footprint)
    loadModel(
      './assets/models/carpet.glb',
      [-0.6, 0.008, 0.2],
      [0, 0, 0],
      3.6
    );

    // Bed and bedside table, left side, partially out of view
    loadModel(
      './assets/models/bed.glb',
      [-2.7, 0.18, -0.15],
      [0, 6, 0],
      2.6
    );
    loadModel(
      './assets/models/astaire_bedside_tabledark_stain_walnut_and_grey.glb',
      [-3.2, 0.18, 0.55],
      [0, 8, 0],
      1.2
    );

    // Book cabinet, a bit to the right
    loadModel(
      './assets/models/book_cabinet_vintage.glb',
      [2.6, 0.18, -0.15],
      [0, -4, 0],
      2.6
    );

    // Floor lamp, near the bedside table
    loadModel(
      './assets/models/cohen_floor_lampdeep_grey_and_american_oak.glb',
      [-3.35, 0.18, 0.95],
      [0, 4, 0],
      1.6
    );

    // Table lamp, on/near the book cabinet top
    loadModel(
      './assets/models/heik_table_lamp_short_concrete.glb',
      [2.35, 1.0, -0.05],
      [0, 0, 0],
      0.6
    );

    // Chair 1 (irvington), right of carpet
    loadModel(
      './assets/models/irvington_carver_chair_graphite_grey.glb',
      [0.9, 0.18, 1.05],
      [0, 16, 0],
      1.9
    );

    // Chair 2 (lars), left of carpet
    loadModel(
      './assets/models/lars_accent_chair_diego_grey.glb',
      [-1.2, 0.18, 1.05],
      [0, -12, 0],
      1.8
    );

    // Book stack, on the carpet (small accent)
    loadModel(
      './assets/models/simple_bookstack.glb',
      [0.1, 0.18, 0.25],
      [0, 0, 0],
      0.32
    );

    // Plant, near the book cabinet
    loadModel(
      './assets/models/wk9_trees_and_plants.glb',
      [3.1, 0.18, 0.35],
      [0, 0, 0],
      1.7
    );
  }
}
