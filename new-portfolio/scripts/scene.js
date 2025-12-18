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
    // Silence unsupported KHR_materials_pbrSpecularGlossiness by ignoring it
    if (typeof GLTFLoader.register === 'function') {
      try {
        GLTFLoader.register(() => ({
          name: 'KHR_materials_pbrSpecularGlossiness',
          beforeRoot() { /* no-op: ignore extension */ }
        }));
      } catch (_) { /* safe ignore */ }
    }

    this.stopInstances = new Map();
    this.interactiveMeshes = [];
    this.floatingItems = [];
    this.anchorObjects = {};
    this.seaTexture = this.createSeaTexture();
    this.shaderUniforms = null;

    // Animation mixers for animated GLTFs (e.g., clock)
    this.mixers = [];

    this.createEnvironment();
    // Apply detailed PBR textures to floor and walls
    this.applyFloorTextures();
    // Apply detailed PBR textures to walls (color/normal/roughness/AO)
    this.applyWallTextures();
    // Apply roof/ceiling textures
    this.applyCeilingTextures();
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
    this.addCarpet();
    this.addOfficeChair();
    this.addTexturedCarpet();
    this.addChaussons();
    this.addGlasses();
    this.addBonsai();
    this.addHousePalmPlant();
    this.addPaintingLandscape();
    this.addDesktopComputer();
    this.addMouseKeyboardPad();
    this.addJBL();
    this.addBMWM3GTR();
    this.addSpeakers();
    this.addBedLamp();
    this.addDeskLamp();
    this.addComputerTower();
    this.addTexturedCarpet();
    this.addClock();

    // Switch the lighting mood to an evening look
    this.applyEveningLighting();

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

  // Adjust the scene to an evening/sunset mood with soft exterior light through the window
  applyEveningLighting() {
    // Brighter exposure for a lively summer 9pm sunset
    this.renderer.toneMappingExposure = 1.3;

    // Dusk background/fog
    const eveningBg = new THREE.Color(0x263040);
    this.scene.background = eveningBg;
    if (this.scene.fog) this.scene.fog.color = eveningBg.clone();
    this.renderer.setClearColor(this.scene.background, 1);

    // Warm sunset directional (soft sun grazing from the window side)
    if (this.mainLight) {
      this.mainLight.color.set(0xffbe8a);
      this.mainLight.intensity = 1.35;
      this.mainLight.position.set(-7.5, 3.2, -6.0);
      this.mainLight.shadow.bias = -0.00015;
      this.mainLight.shadow.radius = 3;
    }

    // Slightly brighter, neutral-cool ambient fill
    if (this.ambientLight) {
      this.ambientLight.color.set(0x2a3342);
      this.ambientLight.intensity = 0.42;
    }

    // Subtle sky/ground tint
    const hemi = new THREE.HemisphereLight(0x4a5f80, 0x0d1016, 0.55);
    this.scene.add(hemi);
    this.hemiLight = hemi;

    // Soft exterior light cone entering through the window
    // Position is just outside the back wall window at x≈-7, z< -1.7
    const windowSpot = new THREE.SpotLight(0xffc58f, 3.8, 24, Math.PI / 4, 0.6, 1.2);
    windowSpot.position.set(-7.0, 2.0, -3.2);
    windowSpot.castShadow = true;
    windowSpot.shadow.mapSize.set(2048, 2048);
    windowSpot.shadow.bias = -0.0002;
    windowSpot.shadow.radius = 3;
    const windowTarget = new THREE.Object3D();
    windowTarget.position.set(-3.6, 1.6, 0.6);
    this.scene.add(windowTarget);
    windowSpot.target = windowTarget;
    this.scene.add(windowSpot);
    this.windowSpot = windowSpot;

    // Subtle inside glow near the window top edge
    const windowGlow = new THREE.PointLight(0xffc58f, 0.9, 4.0, 2);
    windowGlow.position.set(-6.8, 2.1, -1.9);
    this.scene.add(windowGlow);
    this.windowGlow = windowGlow;

    // Helper to add a warm lamp spotlight with a target
    const addLamp = (pos, targetPos) => {
      const spot = new THREE.SpotLight(0xffc38a, 1.8, 8.0, Math.PI / 4, 0.6, 1.5);
      spot.position.set(pos[0], pos[1], pos[2]);
      spot.castShadow = true;
      spot.shadow.mapSize.set(1024, 1024);
      const target = new THREE.Object3D();
      target.position.set(targetPos[0], targetPos[1], targetPos[2]);
      this.scene.add(target);
      spot.target = target;
      this.scene.add(spot);

      // Small glow near bulb
      const glow = new THREE.PointLight(0xffc38a, 0.7, 1.5, 2);
      glow.position.set(pos[0], pos[1] - 0.02, pos[2]);
      glow.castShadow = false;
      this.scene.add(glow);
    };

    // Desk lamp and bed lamp approximate positions/targets
    addLamp([-2.0, 1.35, -1.45], [-1.5, 0.95, -1.2]);
    addLamp([-5.65, 1.35, -1.4], [-5.3, 0.8, -1.1]);

    // Gentle interior fill to lift darkest shadows without flattening
    const interiorFill = new THREE.PointLight(0xffe0c4, 0.25, 10, 2);
    interiorFill.position.set(-1.5, 1.8, -0.2);
    interiorFill.castShadow = false;
    this.scene.add(interiorFill);
    this.interiorFill = interiorFill;
  }

  createEnvironment() {
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xdcc0a7, metalness: 0, roughness: 1 });
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf8eddf, metalness: 0, roughness: 1 });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 12), floorMaterial);
    floor.position.set(0,0, 4.25);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    // Keep a reference to the floor for texturing
    this.floor = floor;

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

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 9.5, 1, 1), wallMaterial.clone());
    leftWall.position.set(-10, 2.4, 4.25);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 9.5, 1, 1), wallMaterial.clone());
    rightWall.position.set(10, 2.4, 4.25);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 12),
      new THREE.MeshStandardMaterial({ color: 0xfaf4ea, roughness: 0.96 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4.1;
    ceiling.position.z = 4.25;
    ceiling.receiveShadow = false;
    this.scene.add(ceiling);
    // Store reference for PBR texturing
    this.ceiling = ceiling;

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
    this.mainLight = mainLight;

    const ambientLight = new THREE.AmbientLight(0xfff2e0, 0.5);
    this.scene.add(ambientLight);
    this.ambientLight = ambientLight;

    // Keep references and apply PBR textures to walls
    this.walls = { back: backWall, left: leftWall, right: rightWall };
  }

  // Load and apply PBR textures to the floor
  applyFloorTextures() {
    if (!this.floor) return;
    const loader = new THREE.TextureLoader();
    const basePath = './assets/images/floor';
    const pbr = {
      color: `${basePath}/WoodFloor051_2K-JPG_Color.jpg`,
      normal: `${basePath}/WoodFloor051_2K-JPG_NormalGL.jpg`,
      roughness: `${basePath}/WoodFloor051_2K-JPG_Roughness.jpg`,
      ao: `${basePath}/WoodFloor051_2K-JPG_AmbientOcclusion.jpg`
    };

    const maxAniso = this.renderer?.capabilities?.getMaxAnisotropy?.() ?? 8;
    // Tiling across the 20x12 area; adjust to taste
    const repeatX = 3; // along room width
    const repeatY = 1.75; // along room depth

    const setupTex = (tex, isColor = false) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeatX, repeatY);
      tex.anisotropy = Math.min(maxAniso, 16);
      if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
    };

    // Ensure uv2 exists for AO
    const geom = this.floor.geometry;
    if (geom && geom.attributes?.uv && !geom.attributes.uv2) {
      geom.setAttribute('uv2', new THREE.BufferAttribute(geom.attributes.uv.array, 2));
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.78
    });

    // Load maps
    loader.load(pbr.color, (map) => {
      setupTex(map, true);
      material.map = map;
      material.needsUpdate = true;
    }, undefined, () => console.warn('Floor color map not found at', pbr.color));

    loader.load(pbr.normal, (map) => {
      setupTex(map);
      material.normalMap = map;
      material.normalScale = new THREE.Vector2(0.8, 0.8);
      material.needsUpdate = true;
    }, undefined, () => console.warn('Floor normal map not found at', pbr.normal));

    loader.load(pbr.roughness, (map) => {
      setupTex(map);
      material.roughnessMap = map;
      material.needsUpdate = true;
    }, undefined, () => console.warn('Floor roughness map not found at', pbr.roughness));

    loader.load(pbr.ao, (map) => {
      setupTex(map);
      material.aoMap = map;
      material.aoMapIntensity = 0.6;
      material.needsUpdate = true;
    }, undefined, () => console.warn('Floor AO map not found at', pbr.ao));

    this.floor.material = material;
  }

  // Load and apply detailed PBR textures to all walls
  applyWallTextures() {
    if (!this.walls) return;
    const loader = new THREE.TextureLoader();
    const basePath = './assets/images/wall';

    // Update these names to match your files in assets/images/wall
    // Common suffixes from AmbientCG/PolyHaven: Color/Diffuse, NormalGL, Roughness, AmbientOcclusion
    const pbr = {
      color: `${basePath}/Plaster002_2K-JPG_Color.jpg`,           // e.g., Plaster004_2K_Color.jpg
      normal: `${basePath}/Plaster002_2K-JPG_NormalGL.jpg`,       // e.g., Plaster004_2K_NormalGL.jpg
      roughness: `${basePath}/Plaster002_2K-JPG_Roughness.jpg`,   // e.g., Plaster004_2K_Roughness.jpg
      // ao: `${basePath}/Planks023A_2K-JPG_AmbientOcclusion.jpg`
    };

    // Per-wall tiling (reduce repeats on back/middle wall)
    const repeats = {
      back: { x: 0.2, y: 0.2 },   // fewer repeats for wide back wall
      left: { x: 0.15, y: 0.15 },   // detailed side walls
      right: { x: 0.15, y: 0.15 }
    };

    const maxAniso = this.renderer?.capabilities?.getMaxAnisotropy?.() ?? 8;

    // Ensure uv2 exists for AO on each wall geometry
    const ensureUV2 = (geom) => {
      if (geom && geom.attributes && geom.attributes.uv && !geom.attributes.uv2) {
        geom.setAttribute('uv2', new THREE.BufferAttribute(geom.attributes.uv.array, 2));
      }
    };

    Object.values(this.walls).forEach((mesh) => ensureUV2(mesh.geometry));

    // Create fresh materials per wall so we can tweak individually later if needed
    const makeMat = () => new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.75
    });

    this.walls.back.material = makeMat();
    this.walls.left.material = makeMat();
    this.walls.right.material = makeMat();

    const materials = {
      back: this.walls.back.material,
      left: this.walls.left.material,
      right: this.walls.right.material
    };

    const setupTiling = (tex, isColor = false) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.anisotropy = Math.min(maxAniso, 16);
      if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
    };

    // COLOR (clone per wall for independent tiling)
    loader.load(
      pbr.color,
      (tex) => {
        Object.entries(materials).forEach(([key, mat]) => {
          const t = tex.clone();
          setupTiling(t, true);
          t.repeat.set(repeats[key].x, repeats[key].y);
          mat.map = t;
          mat.needsUpdate = true;
        });
      },
      undefined,
      () => {
        console.warn('Wall color map not found at', pbr.color);
      }
    );

    // NORMAL (clone per wall)
    loader.load(
      pbr.normal,
      (tex) => {
        Object.entries(materials).forEach(([key, mat]) => {
          const t = tex.clone();
          setupTiling(t);
          t.repeat.set(repeats[key].x, repeats[key].y);
          mat.normalMap = t;
          mat.normalScale = new THREE.Vector2(1.0, 1.0);
          mat.needsUpdate = true;
        });
      },
      undefined,
      () => {
        console.warn('Wall normal map not found at', pbr.normal);
      }
    );

    // ROUGHNESS (clone per wall)
    loader.load(
      pbr.roughness,
      (tex) => {
        Object.entries(materials).forEach(([key, mat]) => {
          const t = tex.clone();
          setupTiling(t);
          t.repeat.set(repeats[key].x, repeats[key].y);
          mat.roughnessMap = t;
          mat.needsUpdate = true;
        });
      },
      undefined,
      () => {
        console.warn('Wall roughness map not found at', pbr.roughness);
      }
    );

    // AO (clone per wall) — only if provided
    if (pbr.ao) {
      loader.load(
        pbr.ao,
        (tex) => {
          Object.entries(materials).forEach(([key, mat]) => {
            const t = tex.clone();
            setupTiling(t);
            t.repeat.set(repeats[key].x, repeats[key].y);
            mat.aoMap = t;
            mat.aoMapIntensity = 0.9;
            mat.needsUpdate = true;
          });
        },
        undefined,
        () => {
          console.warn('Wall AO map not found at', pbr.ao);
        }
      );
    }

    // Optional: Displacement requires dense geometry; disabled for stability with ShapeGeometry + window hole
    // loader.load(pbr.height, (tex) => { ... });
  }

  // Load and apply PBR textures to the ceiling
  applyCeilingTextures() {
    if (!this.ceiling) return;
    const loader = new THREE.TextureLoader();
    const basePath = './assets/images/ceiling';
    const pbr = {
      color: `${basePath}/WoodFloor036_2K-JPG_Color.jpg`,
      normal: `${basePath}/WoodFloor036_2K-JPG_NormalGL.jpg`,
      roughness: `${basePath}/WoodFloor036_2K-JPG_Roughness.jpg`,
      ao: `${basePath}/WoodFloor036_2K-JPG_Roughness.jpg`
    };

    const maxAniso = this.renderer?.capabilities?.getMaxAnisotropy?.() ?? 8;
    const repeatX = 2.5; // along room width
    const repeatY = 1.5; // along room depth

    const setupTex = (tex, isColor = false) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeatX, repeatY);
      tex.anisotropy = Math.min(maxAniso, 16);
      if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
    };

    // Ensure uv2 exists for AO
    const geom = this.ceiling.geometry;
    if (geom && geom.attributes?.uv && !geom.attributes.uv2) {
      geom.setAttribute('uv2', new THREE.BufferAttribute(geom.attributes.uv.array, 2));
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.85
    });

    loader.load(pbr.color, (map) => {
      setupTex(map, true);
      material.map = map;
      material.needsUpdate = true;
    }, undefined, () => console.warn('Ceiling color map not found at', pbr.color));

    loader.load(pbr.normal, (map) => {
      setupTex(map);
      material.normalMap = map;
      material.normalScale = new THREE.Vector2(0.8, 0.8);
      material.needsUpdate = true;
    }, undefined, () => console.warn('Ceiling normal map not found at', pbr.normal));

    loader.load(pbr.roughness, (map) => {
      setupTex(map);
      material.roughnessMap = map;
      material.needsUpdate = true;
    }, undefined, () => console.warn('Ceiling roughness map not found at', pbr.roughness));

    loader.load(pbr.ao, (map) => {
      setupTex(map);
      material.aoMap = map;
      material.aoMapIntensity = 0.7;
      material.needsUpdate = true;
    }, undefined, () => console.warn('Ceiling AO map not found at', pbr.ao));

    this.ceiling.material = material;
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

  loadModelAndPlace({ url, position, rotation = [0, 0, 0], targetSize = 1.5, parent = this.scene, playAnimations = false }) {
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
          if (!child.isMesh) return;
          child.castShadow = true;
          child.receiveShadow = true;

          const m = child.material;
          if (m) {
            if (m.map && m.map.colorSpace !== THREE.SRGBColorSpace) {
              m.map.colorSpace = THREE.SRGBColorSpace;
              m.map.needsUpdate = true;
            }
            const isStd = m.isMeshStandardMaterial || m.isMeshPhysicalMaterial;
            if (!isStd) {
              const safe = new THREE.MeshStandardMaterial({
                color: (m.color ? m.color.clone() : new THREE.Color(0xffffff)),
                map: m.map || null,
                normalMap: m.normalMap || null,
                roughnessMap: m.roughnessMap || null,
                metalnessMap: m.metalnessMap || null,
                emissive: (m.emissive ? m.emissive.clone() : new THREE.Color(0x000000)),
                emissiveMap: m.emissiveMap || null,
                roughness: (typeof m.roughness === 'number' ? m.roughness : 0.8),
                metalness: (typeof m.metalness === 'number' ? m.metalness : 0.0)
              });
              child.material = safe;
            }
          }
        });
        parent.add(model);

        // Play GLTF animations if present and requested
        if (playAnimations && gltf.animations && gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
          this.mixers.push(mixer);
        }
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
      position: [-1.3, 0.07, -0.5],
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

  addTexturedCarpet() {
    const loader = new THREE.TextureLoader();
    const basePath = './assets/images/carpet';
    const pbr = {
      color: `${basePath}/Carpet016_1K-JPG_Color.jpg`,
      normal: `${basePath}/Carpet016_1K-JPG_NormalGL.jpg`,
      roughness: `${basePath}/Carpet016_1K-JPG_Roughness.jpg`,
      ao: `${basePath}/Carpet016_1K-JPG_AmbientOcclusion.jpg`
      // height: `${basePath}/Carpet016_1K-JPG_Displacement.jpg` // optional
    };

    const width = 3.0;
    const height = 2.2;
    const cornerRadius = 0.25;
    const thickness = 0.02;
    const repeatX = 1.8;
    const repeatY = 1.2;

    const makeRoundedRectShape = (w, h, r) => {
      const hw = w / 2;
      const hh = h / 2;
      const s = new THREE.Shape();
      s.moveTo(-hw + r, -hh);
      s.lineTo(hw - r, -hh);
      s.quadraticCurveTo(hw, -hh, hw, -hh + r);
      s.lineTo(hw, hh - r);
      s.quadraticCurveTo(hw, hh, hw - r, hh);
      s.lineTo(-hw + r, hh);
      s.quadraticCurveTo(-hw, hh, -hw, hh - r);
      s.lineTo(-hw, -hh + r);
      s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
      return s;
    };
    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: Math.min(thickness * 0.5, 0.008),
      bevelSize: 0.035,
      bevelSegments: 3,
      steps: 1
    };

    loader.load(
      pbr.color,
      (albedo) => {
        albedo.colorSpace = THREE.SRGBColorSpace;
        albedo.wrapS = THREE.RepeatWrapping;
        albedo.wrapT = THREE.RepeatWrapping;
        albedo.repeat.set(repeatX, repeatY);

        const topMat = new THREE.MeshStandardMaterial({ map: albedo, roughness: 1.0, metalness: 0.0 });
        const sideMat = new THREE.MeshStandardMaterial({ color: 0x8b7d6b, roughness: 1.0, metalness: 0.0 });

        // Load optional maps (best-effort)
        loader.load(
          pbr.normal,
          (nm) => {
            nm.wrapS = THREE.RepeatWrapping;
            nm.wrapT = THREE.RepeatWrapping;
            nm.repeat.set(repeatX, repeatY);
            topMat.normalMap = nm;
          }
        );
        loader.load(
          pbr.roughness,
          (rm) => {
            rm.wrapS = THREE.RepeatWrapping;
            rm.wrapT = THREE.RepeatWrapping;
            rm.repeat.set(repeatX, repeatY);
            topMat.roughnessMap = rm;
          }
        );
        loader.load(
          pbr.ao,
          (aomap) => {
            aomap.wrapS = THREE.RepeatWrapping;
            aomap.wrapT = THREE.RepeatWrapping;
            aomap.repeat.set(repeatX, repeatY);
            topMat.aoMap = aomap;
            topMat.aoMapIntensity = 0.7;
          }
        );

        const shape = makeRoundedRectShape(width, height, cornerRadius);
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
        const carpet = new THREE.Mesh(geometry, [sideMat, topMat]);
        carpet.rotation.x = -Math.PI / 2;
        carpet.position.set(-1.7, thickness * 0.5 - 0.01, -0.55);
        carpet.receiveShadow = true;
        this.scene.add(carpet);
      },
      undefined,
      () => {
        // Final fallback: no textures, rounded extruded mat
        const topMat = new THREE.MeshStandardMaterial({ color: 0x8b7d6b, roughness: 1.0, metalness: 0.0 });
        const sideMat = new THREE.MeshStandardMaterial({ color: 0x7a6e5f, roughness: 1.0, metalness: 0.0 });
        const shape = makeRoundedRectShape(width, height, cornerRadius);
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const carpet = new THREE.Mesh(geometry, [sideMat, topMat]);
        carpet.rotation.x = -Math.PI / 2;
        carpet.position.set(-1.8, thickness * 0.5 + 0.01, -1.0);
        carpet.receiveShadow = true;
        this.scene.add(carpet);
      }
    );
  }

  addChaussons() {
    this.loadModelAndPlace({
      url: "./assets/models/chaussons.glb",
      position: [-5.25, 0.03, 0.32],
      rotation: [0, 79, 0],
      targetSize: 0.5
    });
  }

  addGlasses() {
    this.loadModelAndPlace({
      url: "./assets/models/glasses2.glb",
      position: [-5.3, 0.7, -1.3],
      rotation: [0, -105, 0],
      targetSize: 0.25
    });
  }

  addBonsai() {
    this.loadModelAndPlace({
      url: "./assets/models/bonsai2.glb",
      position: [-3.25, 0.95, -0.9],
      rotation: [0, 92, 0],
      targetSize: 1
    });
  }

  addHousePalmPlant() {
    this.loadModelAndPlace({
      url: "./assets/models/house_palm_plant.glb",
      position: [3.5, 0, -1],
      rotation: [0, 60, 0],
      targetSize: 2
    });
  }

  addPaintingLandscape() {
    this.loadModelAndPlace({
      url: "./assets/models/painting_landscape.glb",
      position: [-1.8, 1.6, -1.69],
      rotation: [0, 0, 0],
      targetSize: 1
    });
  }

  addDesktopComputer() {
    this.loadModelAndPlace({
      url: "./assets/models/desktop_computer.glb",
      position: [-0.81, 1.45, -1.19],
      rotation: [0, -10, 0],
      targetSize: 1
    });
  }

  addMouseKeyboardPad() {
    this.loadModelAndPlace({
      url: "./assets/models/mouse_pad_keyboard_pad.glb",
      position: [-0.91, 1.08, -1.12],
      rotation: [0, -25, 0],
      targetSize: 1
    });
  }
  
  addJBL() {
    this.loadModelAndPlace({
      url: "./assets/models/big_enceinte_jbl.glb",
      position: [-2.91,0.53, -1.2],
      rotation: [0, 25, 0],
      targetSize: 1
    });
  }

  addBMWM3GTR() {
    this.loadModelAndPlace({
      url: "./assets/models/bmw_m3_gtr.glb",
      position: [-2.15, 1.215, -1],
      rotation: [0, 135, 0],
      targetSize: 0.5
    });
  }

  addSpeakers() {
    this.loadModelAndPlace({
      url: "./assets/models/speakers.glb",
      position: [-1.15, 1.1, -1.58],
      rotation: [0, 265, 0],
      targetSize: 1
    });
  }

  addBedLamp() {
    this.loadModelAndPlace({
      url: "./assets/models/bed_lamp.glb",
      position: [-5.65, 1.13, -1.4],
      rotation: [0, 0, 0],
      targetSize: 0.8
    });
  }

  addDeskLamp() {
    this.loadModelAndPlace({
      url: "./assets/models/desk_lamp.glb",
      position: [-2, 1.15, -1.45],
      rotation: [0, -45, 0],
      targetSize: 0.6
    });
  }

  addComputerTower() {
    this.loadModelAndPlace({
      url: "./assets/models/computer_tower.glb",
      position: [-0.564, 0.165, -1.25],
      rotation: [0, 0, 0],
      targetSize: 0.6
    });
  }

  addClock() {
    this.loadModelAndPlace({
      url: "./assets/models/clock.glb",
      position: [3, 3, -1.669],
      rotation: [0, 0, 0],
      targetSize: 0.6,
      playAnimations: true
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
          if (!child.isMesh) return;
          child.castShadow = true;
          child.receiveShadow = true;

          const m = child.material;
          if (m) {
            if (m.map && m.map.colorSpace !== THREE.SRGBColorSpace) {
              m.map.colorSpace = THREE.SRGBColorSpace;
              m.map.needsUpdate = true;
            }
            const isStd = m.isMeshStandardMaterial || m.isMeshPhysicalMaterial;
            if (!isStd) {
              const safe = new THREE.MeshStandardMaterial({
                color: (m.color ? m.color.clone() : new THREE.Color(0xffffff)),
                map: m.map || null,
                normalMap: m.normalMap || null,
                roughnessMap: m.roughnessMap || null,
                metalnessMap: m.metalnessMap || null,
                emissive: (m.emissive ? m.emissive.clone() : new THREE.Color(0x000000)),
                emissiveMap: m.emissiveMap || null,
                roughness: (typeof m.roughness === 'number' ? m.roughness : 0.8),
                metalness: (typeof m.metalness === 'number' ? m.metalness : 0.0)
              });
              child.material = safe;
            }
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

    // Update animation mixers (for animated GLTFs like the clock)
    if (this.mixers && this.mixers.length) {
      // Use a static delta, not affected by getElapsedTime()
      const delta = (typeof this._lastAnimTime === 'number')
        ? (performance.now() - this._lastAnimTime) / 1000
        : 1/60;
      this._lastAnimTime = performance.now();
      this.mixers.forEach((mixer, i) => {
        mixer.update(delta);
        // Debug: log the time of the first clock animation
        if (i === 0 && mixer._actions && mixer._actions.length) {
          // Uncomment for debug: console.log('Mixer time', mixer.time);
        }
      });
    }

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