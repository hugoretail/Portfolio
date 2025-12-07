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
    const floorGeo = new THREE.PlaneGeometry(20, 12);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xdcc0a7,
      metalness: 0.2,
      roughness: 0.85
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wallGeo = new THREE.PlaneGeometry(22, 9.5);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf5e8d9,
      metalness: 0.03,
      roughness: 0.96
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 2.4, -1.7);
    this.scene.add(wall);

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

    const windowLight = new THREE.DirectionalLight(0xfdf3df, 0.6);
    windowLight.position.set(6, 4.5, -4.5);
    this.scene.add(windowLight);

    const lampLight = new THREE.PointLight(0xffd6a5, 1, 12, 2);
    lampLight.position.set(-4.2, 3.1, 1.6);
    this.scene.add(lampLight);

    this.createRoomDetails();
  }

  createRoomDetails() {
    const baseboard = new THREE.Mesh(
      new THREE.BoxGeometry(22, 0.3, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xe9ddcf, roughness: 0.7 })
    );
    baseboard.position.set(0, 0.15, -1.64);
    this.scene.add(baseboard);

    const rug = new THREE.Mesh(
      new THREE.CircleGeometry(2.25, 48),
      new THREE.MeshStandardMaterial({ color: 0xfce1c6, roughness: 0.95 })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(-1.6, 0.01, 0.95);
    rug.scale.set(0.98, 1, 1.08);
    this.scene.add(rug);

    const sofa = new THREE.Group();
    const sofaBase = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.78, 1.4),
      new THREE.MeshStandardMaterial({ color: 0xe2e3eb, roughness: 0.6 })
    );
    sofaBase.position.y = 0.39;
    const sofaBack = new THREE.Mesh(
      new THREE.BoxGeometry(4, 1.05, 0.45),
      new THREE.MeshStandardMaterial({ color: 0xcfd0d8, roughness: 0.5 })
    );
    sofaBack.position.set(0, 1.02, -0.42);
    const cushionMaterial = new THREE.MeshStandardMaterial({ color: 0xf4d9c8, roughness: 0.8 });
    const cushionLeft = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.45, 1.2), cushionMaterial);
    cushionLeft.position.set(-0.9, 0.88, 0.05);
    const cushionRight = cushionLeft.clone();
    cushionRight.position.x = 0.9;
    sofa.add(sofaBase, sofaBack, cushionLeft, cushionRight);
    sofa.position.set(-2.25, 0, -0.12);
    sofa.rotation.y = THREE.MathUtils.degToRad(-6);
    this.scene.add(sofa);

    const coffeeTable = new THREE.Group();
    const tableTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.08, 1),
      new THREE.MeshStandardMaterial({ color: 0xe8c9a6, roughness: 0.6 })
    );
    tableTop.position.y = 0.44;
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0xaf825f });
    const tableLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.12), legMaterial);
    tableLeg.position.set(0.65, 0.22, 0.35);
    const leg2 = tableLeg.clone();
    leg2.position.set(-0.65, 0.22, 0.35);
    const leg3 = tableLeg.clone();
    leg3.position.set(0.65, 0.22, -0.35);
    const leg4 = tableLeg.clone();
    leg4.position.set(-0.65, 0.22, -0.35);
    coffeeTable.add(tableTop, tableLeg, leg2, leg3, leg4);
    coffeeTable.position.set(-1.15, 0, 1.05);
    coffeeTable.rotation.y = THREE.MathUtils.degToRad(-7);
    this.scene.add(coffeeTable);
    this.placeSprayCan(coffeeTable);

    const atelierDesk = new THREE.Group();
    const deskTop = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.08, 1.4),
      new THREE.MeshStandardMaterial({ color: 0xf3d3b0, roughness: 0.55 })
    );
    deskTop.position.y = 1.02;
    const deskLegMaterial = new THREE.MeshStandardMaterial({ color: 0xc49a7c });
    const deskLegFrontLeft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 1.05, 16),
      deskLegMaterial
    );
    deskLegFrontLeft.position.set(-1.1, 0.5, 0.55);
    const deskLegFrontRight = deskLegFrontLeft.clone();
    deskLegFrontRight.position.x = 1.1;
    const deskLegBackLeft = deskLegFrontLeft.clone();
    deskLegBackLeft.position.z = -0.55;
    const deskLegBackRight = deskLegFrontRight.clone();
    deskLegBackRight.position.z = -0.55;
    const sketchPad = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.65),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
    );
    sketchPad.rotation.x = -Math.PI / 2.05;
    sketchPad.position.set(-0.2, 1.06, 0);
    const deskLamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.9, 12),
      new THREE.MeshStandardMaterial({ color: 0x8f7c6a })
    );
    deskLamp.position.set(0.9, 0.9, -0.3);
    const lampShade = new THREE.Mesh(
      new THREE.ConeGeometry(0.25, 0.35, 24),
      new THREE.MeshStandardMaterial({ color: 0xfff3da, emissive: 0xfff1d0, emissiveIntensity: 0.4 })
    );
    lampShade.position.set(0.9, 1.35, -0.3);
    const stool = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.4, 0.45, 24),
      new THREE.MeshStandardMaterial({ color: 0xd8a777 })
    );
    stool.position.set(0.2, 0.23, -0.82);
    atelierDesk.add(
      deskTop,
      deskLegFrontLeft,
      deskLegFrontRight,
      deskLegBackLeft,
      deskLegBackRight,
      sketchPad,
      deskLamp,
      lampShade,
      stool
    );
    atelierDesk.position.set(-4.35, 0, 0.18);
    atelierDesk.rotation.y = THREE.MathUtils.degToRad(6);
    this.scene.add(atelierDesk);
    this.anchorObjects.atelier = atelierDesk;

    const mural = new THREE.Group();
    const muralFrame = new THREE.Mesh(
      new THREE.PlaneGeometry(5.4, 3.3),
      new THREE.MeshStandardMaterial({ color: 0xb7896b, roughness: 0.7 })
    );
    muralFrame.position.z = -0.03;
    const muralPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 2.9),
      new THREE.MeshStandardMaterial({ color: 0xf9d6c3, roughness: 0.8 })
    );
    const muralStroke = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xff715e, roughness: 0.4 })
    );
    muralStroke.rotation.z = THREE.MathUtils.degToRad(12);
    muralStroke.position.set(0.8, 0.3, 0.02);
    const muralCircle = new THREE.Mesh(
      new THREE.CircleGeometry(0.35, 32),
      new THREE.MeshStandardMaterial({ color: 0x2575fc })
    );
    muralCircle.position.set(-1, 0.9, 0.02);
    mural.add(muralFrame, muralPanel, muralStroke, muralCircle);
    mural.position.set(-2.35, 3.12, -1.58);
    this.scene.add(mural);
    this.anchorObjects.graffiti = mural;

    const windowGroup = new THREE.Group();
    const windowFrame = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 3, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xc5b59f, roughness: 0.6 })
    );
    const windowView = new THREE.Mesh(
      new THREE.PlaneGeometry(4.1, 2.5),
      new THREE.MeshStandardMaterial({
        map: this.seaTexture,
        transparent: true,
        opacity: 0.98,
        roughness: 0.12
      })
    );
    windowView.position.z = 0.12;
    const muntinVertical = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 2.5, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xaf9b83 })
    );
    const muntinHorizontal = new THREE.Mesh(
      new THREE.BoxGeometry(4.1, 0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xaf9b83 })
    );
    muntinVertical.position.z = 0.08;
    muntinHorizontal.position.z = 0.08;
    const windowSill = new THREE.Mesh(
      new THREE.BoxGeometry(4.9, 0.2, 0.45),
      new THREE.MeshStandardMaterial({ color: 0xd9c3a6, roughness: 0.6 })
    );
    windowSill.position.set(0, -1.65, 0.22);
    windowGroup.add(windowFrame, windowView, muntinVertical, muntinHorizontal, windowSill);
    windowGroup.position.set(1.6, 3.18, -1.4);
    this.scene.add(windowGroup);

    const techShelf = new THREE.Group();
    const shelfMaterial = new THREE.MeshStandardMaterial({ color: 0xcaa274, roughness: 0.5 });
    const shelfHeight = 2.4;
    const sideGeometry = new THREE.BoxGeometry(0.12, shelfHeight, 0.38);
    const sideLeft = new THREE.Mesh(sideGeometry, shelfMaterial);
    sideLeft.position.set(-1, shelfHeight / 2, 0);
    const sideRight = sideLeft.clone();
    sideRight.position.x = 1;
    const backPanel = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, shelfHeight, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xf1e5d6, roughness: 0.85 })
    );
    backPanel.position.set(0, shelfHeight / 2, -0.17);
    techShelf.add(sideLeft, sideRight, backPanel);
    const shelfLevels = [0.25, 1.15, 2.05];
    shelfLevels.forEach((height, levelIndex) => {
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(2.05, 0.08, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xe3c9a7, roughness: 0.5 })
      );
      board.position.y = height;
      techShelf.add(board);
      for (let i = 0; i < 4; i += 1) {
        const book = new THREE.Mesh(
          new THREE.BoxGeometry(0.25, 0.4 + Math.random() * 0.45, 0.18),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.07 * (i + levelIndex) + 0.05, 0.45, 0.55)
          })
        );
        const xJitter = THREE.MathUtils.randFloatSpread(0.12);
        const zJitter = THREE.MathUtils.randFloatSpread(0.1);
        const yJitter = THREE.MathUtils.randFloat(-0.05, 0.08);
        book.position.set(-0.75 + i * 0.5 + xJitter, height + 0.34 + yJitter, (i % 2 === 0 ? -0.05 : 0.05) + zJitter);
        book.rotation.z = THREE.MathUtils.degToRad(THREE.MathUtils.randFloatSpread(6));
        book.rotation.y = THREE.MathUtils.degToRad(THREE.MathUtils.randFloatSpread(8));
        techShelf.add(book);
      }
    });
    techShelf.position.set(3.2, 0, -0.15);
    techShelf.rotation.y = THREE.MathUtils.degToRad(-17);
    this.scene.add(techShelf);
    this.anchorObjects.code = techShelf;

    const contactPlant = new THREE.Group();
    const plantPot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.55, 0.55, 24),
      new THREE.MeshStandardMaterial({ color: 0xe2b18d })
    );
    const plantLeaves = new THREE.Mesh(
      new THREE.ConeGeometry(0.9, 1.6, 32),
      new THREE.MeshStandardMaterial({ color: 0x5ea27b, roughness: 0.4 })
    );
    plantLeaves.position.y = 1.1;
    const floorLampStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.6, 16),
      new THREE.MeshStandardMaterial({ color: 0xe8d5c2 })
    );
    floorLampStem.position.set(-0.2, 0.85, 0.24);
    const floorLampShade = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 0.55, 24),
      new THREE.MeshStandardMaterial({ color: 0xfff6dc, emissive: 0xffe9b5, emissiveIntensity: 0.3 })
    );
    floorLampShade.position.set(-0.2, 1.78, 0.24);
    contactPlant.add(plantPot, plantLeaves, floorLampStem, floorLampShade);
    contactPlant.position.set(4.3, 0, 1.48);
    contactPlant.rotation.y = THREE.MathUtils.degToRad(-12);
    this.scene.add(contactPlant);
    this.anchorObjects.contact = contactPlant;
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
