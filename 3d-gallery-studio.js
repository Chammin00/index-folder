/**
 * ANTIGRAVITY 3D ART GALLERY STUDIO & INDEX MUSEUM ENGINE
 * Walk-around 3D Virtual Gallery exhibiting all Antigravity projects and index files.
 * Features first-person motion walking, Auto-Walk VIP highlight tour, interactive
 * exhibit kiosks, live index preview, minimap radar, and cross-links with My Planetarium.
 */

(function () {
  'use strict';

  const THREE = window.THREE;
  if (!THREE) {
    console.error('Three.js failed to load.');
    return;
  }

  // --- STATE ---
  const state = {
    audioEnabled: false,
    sprint: false,
    isTourRunning: false,
    tourIndex: 0,
    tourTimer: null,
    focusedProject: null,
    currentWing: 'rotunda',
    nearExhibit: null,
    pointerLocked: false,
    isMouseDown: false,
    prevMouseX: 0,
    prevMouseY: 0,
    cameraYaw: 0,
    cameraPitch: 0,
    previewLoaded: false
  };

  // Keyboard state
  const keys = {
    KeyW: false, KeyS: false, KeyA: false, KeyD: false,
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    ShiftLeft: false, ShiftRight: false
  };

  // Pad touch state
  const padState = {
    forward: false, backward: false, left: false, right: false,
    turnLeft: false, turnRight: false
  };

  // Audio Context (Synthesized Footsteps & Spatial Ambience)
  let audioCtx = null;
  let lastStepTime = 0;

  function initAudio() {
    if (audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    } catch (e) {}
  }

  function playFootstepSound() {
    if (!state.audioEnabled || !audioCtx) return;
    const now = performance.now();
    const interval = state.sprint ? 280 : 420;
    if (now - lastStepTime < interval) return;
    lastStepTime = now;

    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, audioCtx.currentTime);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(75, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.09);
    } catch (e) {}
  }

  function playChimeSound() {
    if (!state.audioEnabled || !audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.46);
    } catch (e) {}
  }

  // --- THREE.JS SCENE SETUP ---
  const container = document.getElementById('canvas-container');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070a13);
  scene.fog = new THREE.FogExp2(0x070a13, 0.012);

  const EYE_HEIGHT = 2.1;
  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, EYE_HEIGHT, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambientLight);

  const rotundaLight = new THREE.PointLight(0xdfba73, 1.8, 35, 1.4);
  rotundaLight.position.set(0, 7.5, 0);
  rotundaLight.castShadow = true;
  scene.add(rotundaLight);

  // Collections & Colliders
  const exhibitObjects = []; // Interactive picture frames
  const colliders = [];      // AABB boxes
  const searchBeacons = [];  // Vertical light beams for search
  let rotundaSculpture = null;

  // Wing Center Coordinates (For Teleporting and Navigation)
  const WINGS = {
    rotunda: { name: "Grand Rotunda", pos: new THREE.Vector3(0, EYE_HEIGHT, 0), yaw: 0 },
    cyber:   { name: "Bastion Wing (Cybersecurity)", pos: new THREE.Vector3(0, EYE_HEIGHT, -26), yaw: 0 },
    games:   { name: "Arcade & XR Pavilion (Games)", pos: new THREE.Vector3(32, EYE_HEIGHT, 0), yaw: -Math.PI / 2 },
    ai:      { name: "Neural Hall (AI & Agents)", pos: new THREE.Vector3(0, EYE_HEIGHT, 28), yaw: Math.PI },
    web:     { name: "Cosmos & Media Salon", pos: new THREE.Vector3(-32, EYE_HEIGHT, 0), yaw: Math.PI / 2 },
    prod:    { name: "Enterprise Atrium (Productivity)", pos: new THREE.Vector3(-24, EYE_HEIGHT, 24), yaw: (3 * Math.PI) / 4 }
  };

  // --- PROCEDURAL TEXTURES ---
  function createMarbleCanvas(baseHex, veiningHex) {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 512;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle veins
    ctx.strokeStyle = veiningHex;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, Math.random() * 512);
      ctx.bezierCurveTo(
        Math.random() * 512, Math.random() * 512,
        Math.random() * 512, Math.random() * 512,
        Math.random() * 512, Math.random() * 512
      );
      ctx.stroke();
    }

    // Grid lines for high-gloss tiles
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 508, 508);

    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // --- PROCEDURAL ARTWORK TEXTURE GENERATOR FOR FRAMES ---
  function generateArtworkTexture(project) {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 640;
    const ctx = cv.getContext('2d');

    const catColor = {
      cyber: '#f85149',
      games: '#bc8cff',
      ai: '#58a6ff',
      web: '#d29922',
      prod: '#3fb950',
      other: '#8b949e'
    }[project.categoryId] || '#dfba73';

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 512, 640);
    grad.addColorStop(0, '#0d1117');
    grad.addColorStop(0.4, '#161b22');
    grad.addColorStop(1, '#050b18');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 640);

    // Subtle cosmic glow in the center
    const radial = ctx.createRadialGradient(256, 220, 20, 256, 220, 220);
    radial.addColorStop(0, catColor + '55');
    radial.addColorStop(0.7, catColor + '11');
    radial.addColorStop(1, 'transparent');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, 512, 640);

    // Frame border
    ctx.strokeStyle = catColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, 480, 608);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(24, 24, 464, 592);

    // Top Category Header Banner
    ctx.fillStyle = catColor + '33';
    ctx.fillRect(24, 24, 464, 42);

    ctx.font = 'bold 16px "SF Mono", Consolas, monospace';
    ctx.fillStyle = catColor;
    ctx.textAlign = 'left';
    ctx.fillText(`${project.category.toUpperCase()}`, 40, 51);

    ctx.font = 'bold 12px "SF Mono", Consolas, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(project.highlight ? '★ VIP HIGHLIGHT' : 'INDEXED', 470, 50);

    // Center Big Icon Glyphs
    ctx.font = '76px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(project.icon || '🏛️', 256, 200);

    // Glowing Title
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(project.name, 256, 270);

    // Type / Subtitle
    ctx.font = 'bold 14px "SF Mono", Consolas, monospace';
    ctx.fillStyle = '#dfba73';
    ctx.fillText(project.type || 'Interactive Project', 256, 305);

    // Description text (word wrapped)
    ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#c9d1d9';
    ctx.textAlign = 'center';
    const words = (project.desc || '').split(' ');
    let line = '';
    let y = 360;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 420 && n > 0) {
        ctx.fillText(line, 256, y);
        line = words[n] + ' ';
        y += 24;
        if (y > 450) break;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 256, y);

    // Tech stack pills at bottom
    if (project.stack && project.stack.length > 0) {
      const tags = project.stack.slice(0, 3);
      const tagText = tags.join('  •  ');
      ctx.font = '12px "SF Mono", Consolas, monospace';
      ctx.fillStyle = '#8b949e';
      ctx.fillText(tagText, 256, 540);
    }

    // Bottom Action Prompt
    ctx.fillStyle = catColor;
    ctx.fillRect(36, 570, 440, 36);
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#050b18';
    ctx.fillText('⚡ CLICK OR PRESS [E] TO LAUNCH INDEX', 256, 593);

    const tex = new THREE.CanvasTexture(cv);
    tex.generateMipmaps = true;
    return tex;
  }

  // --- ARCHITECTURAL CONSTRUCTION ---
  function buildGalleryArchitecture() {
    const marbleFloorTex = createMarbleCanvas('#0d1117', '#21262d');
    marbleFloorTex.repeat.set(24, 24);

    const wallTex = createMarbleCanvas('#161b22', '#30363d');
    wallTex.repeat.set(12, 4);

    const ceilingTex = createMarbleCanvas('#0a0d14', '#161b22');
    ceilingTex.repeat.set(16, 16);

    // Floor Material (Reflective dark lacquer)
    const floorMat = new THREE.MeshStandardMaterial({
      map: marbleFloorTex,
      roughness: 0.18,
      metalness: 0.25
    });

    // Wall Material
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.6,
      metalness: 0.1
    });

    // Ceiling Material
    const ceilingMat = new THREE.MeshStandardMaterial({
      map: ceilingTex,
      roughness: 0.75,
      metalness: 0.05
    });

    // 1. Grand Rotunda Floor (Central Hub)
    const rotundaGeo = new THREE.CylinderGeometry(14, 14, 0.2, 48);
    const rotundaMesh = new THREE.Mesh(rotundaGeo, floorMat);
    rotundaMesh.position.set(0, -0.1, 0);
    rotundaMesh.receiveShadow = true;
    scene.add(rotundaMesh);

    // Concentric Gold Rings in Rotunda
    const ringGeo1 = new THREE.RingGeometry(13.6, 13.9, 48);
    const ringGeo2 = new THREE.RingGeometry(6.8, 7.0, 48);
    const goldRingMat = new THREE.MeshStandardMaterial({
      color: 0xdfba73,
      metalness: 0.85,
      roughness: 0.2
    });
    const ring1 = new THREE.Mesh(ringGeo1, goldRingMat);
    ring1.rotation.x = -Math.PI / 2;
    ring1.position.y = 0.01;
    scene.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo2, goldRingMat);
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.01;
    scene.add(ring2);

    // Central Pedestal & Rotating Holographic Sculpture
    const pedestalGeo = new THREE.CylinderGeometry(2.4, 2.8, 1.2, 32);
    const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x161b22, roughness: 0.3, metalness: 0.4 });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.set(0, 0.6, 0);
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    scene.add(pedestal);
    colliders.push({ minX: -3.0, maxX: 3.0, minZ: -3.0, maxZ: 3.0 });

    // Rotating Torus Knot Sculpture
    const sculptureGroup = new THREE.Group();
    const torusKnotGeo = new THREE.TorusKnotGeometry(1.3, 0.36, 128, 32, 2, 3);
    const goldSculptMat = new THREE.MeshStandardMaterial({
      color: 0xdfba73,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0x3d2b0f,
      emissiveIntensity: 0.3
    });
    const knotMesh = new THREE.Mesh(torusKnotGeo, goldSculptMat);
    knotMesh.castShadow = true;
    sculptureGroup.add(knotMesh);

    // Outer Armillary Gyro Ring
    const gyroRingGeo = new THREE.TorusGeometry(2.1, 0.08, 16, 64);
    const gyroRingMat = new THREE.MeshStandardMaterial({
      color: 0x58a6ff,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x1d3557,
      emissiveIntensity: 0.4
    });
    const gyroRing = new THREE.Mesh(gyroRingGeo, gyroRingMat);
    sculptureGroup.add(gyroRing);

    sculptureGroup.position.set(0, 2.7, 0);
    scene.add(sculptureGroup);
    rotundaSculpture = sculptureGroup;

    // Helper: Construct an Exhibition Wing
    // A corridor/hall extending from rotunda in a specific direction
    function buildWingHall(wingKey, centerPos, rotationAngle, length, width, height, accentHex) {
      const wingGroup = new THREE.Group();
      wingGroup.position.copy(centerPos);
      wingGroup.rotation.y = rotationAngle;

      // Hall Floor
      const hallFloorGeo = new THREE.PlaneGeometry(width, length);
      const hallFloorMat = new THREE.MeshStandardMaterial({
        map: marbleFloorTex,
        roughness: 0.2,
        metalness: 0.2
      });
      const hallFloor = new THREE.Mesh(hallFloorGeo, hallFloorMat);
      hallFloor.rotation.x = -Math.PI / 2;
      hallFloor.receiveShadow = true;
      wingGroup.add(hallFloor);

      // Accent Center Runner Line
      const runnerGeo = new THREE.PlaneGeometry(0.6, length);
      const runnerMat = new THREE.MeshStandardMaterial({
        color: accentHex,
        roughness: 0.3,
        metalness: 0.7,
        emissive: accentHex,
        emissiveIntensity: 0.2
      });
      const runner = new THREE.Mesh(runnerGeo, runnerMat);
      runner.rotation.x = -Math.PI / 2;
      runner.position.y = 0.01;
      wingGroup.add(runner);

      // Hall Ceiling
      const hallCeiling = new THREE.Mesh(hallFloorGeo, ceilingMat);
      hallCeiling.rotation.x = Math.PI / 2;
      hallCeiling.position.y = height;
      wingGroup.add(hallCeiling);

      // Left Wall
      const wallGeo = new THREE.PlaneGeometry(length, height);
      const leftWall = new THREE.Mesh(wallGeo, wallMat);
      leftWall.rotation.y = Math.PI / 2;
      leftWall.position.set(-width / 2, height / 2, 0);
      leftWall.receiveShadow = true;
      wingGroup.add(leftWall);

      // Right Wall
      const rightWall = new THREE.Mesh(wallGeo, wallMat);
      rightWall.rotation.y = -Math.PI / 2;
      rightWall.position.set(width / 2, height / 2, 0);
      rightWall.receiveShadow = true;
      wingGroup.add(rightWall);

      // Back End Wall
      const backWallGeo = new THREE.PlaneGeometry(width, height);
      const backWall = new THREE.Mesh(backWallGeo, wallMat);
      backWall.rotation.y = 0;
      backWall.position.set(0, height / 2, -length / 2);
      backWall.receiveShadow = true;
      wingGroup.add(backWall);

      // Glowing Wing Portal Arch at Entrance
      const archGeo = new THREE.TorusGeometry(width * 0.46, 0.2, 16, 32, Math.PI);
      const archMat = new THREE.MeshStandardMaterial({
        color: accentHex,
        emissive: accentHex,
        emissiveIntensity: 0.6,
        roughness: 0.2
      });
      const archMesh = new THREE.Mesh(archGeo, archMat);
      archMesh.position.set(0, 0, length / 2);
      wingGroup.add(archMesh);

      // Wing Spotlight
      const wingSpot = new THREE.PointLight(accentHex, 1.2, 28, 1.3);
      wingSpot.position.set(0, height - 1.2, 0);
      wingGroup.add(wingSpot);

      scene.add(wingGroup);
      return wingGroup;
    }

    // Build the 5 Halls
    buildWingHall('cyber', new THREE.Vector3(0, 0, -28), 0, 30, 12, 6.5, 0xf85149);            // North
    buildWingHall('games', new THREE.Vector3(32, 0, 0), -Math.PI / 2, 32, 12, 6.5, 0xbc8cff);   // East
    buildWingHall('ai', new THREE.Vector3(0, 0, 30), Math.PI, 30, 12, 6.5, 0x58a6ff);           // South
    buildWingHall('web', new THREE.Vector3(-32, 0, 0), Math.PI / 2, 32, 12, 6.5, 0xd29922);     // West
    buildWingHall('prod', new THREE.Vector3(-24, 0, 24), (3 * Math.PI) / 4, 28, 12, 6.5, 0x3fb950); // South-West

    // Overall Gallery Outer Perimeter Bounds for Colliders
    colliders.push({ minX: -55, maxX: 55, minZ: -55, maxZ: -44 });
    colliders.push({ minX: -55, maxX: 55, minZ: 44, maxZ: 55 });
    colliders.push({ minX: -55, maxX: -44, minZ: -55, maxZ: 55 });
    colliders.push({ minX: 44, maxX: 55, minZ: -55, maxZ: 55 });
  }

  // --- POPULATE 3D FRAMED EXHIBITS ---
  function buildProjectExhibits() {
    if (!window.ANTIGRAVITY_CATALOG || !window.ANTIGRAVITY_CATALOG.projects) return;
    const catalogProjects = window.ANTIGRAVITY_CATALOG.projects;

    // Group projects by category
    const grouped = {
      cyber: [],
      games: [],
      ai: [],
      web: [],
      prod: []
    };

    catalogProjects.forEach(p => {
      if (grouped[p.categoryId]) {
        grouped[p.categoryId].push(p);
      } else {
        grouped.prod.push(p);
      }
    });

    // Helper: Mount exhibits along hall walls
    function mountExhibitsOnHall(items, centerPos, rotationAngle, hallLength, hallWidth, accentHex) {
      const count = items.length;
      if (count === 0) return;

      const spacing = hallLength / (Math.ceil(count / 2) + 1);

      items.forEach((proj, idx) => {
        const isLeftWall = idx % 2 === 0;
        const rowIdx = Math.floor(idx / 2);
        const zOffset = -hallLength / 2 + (rowIdx + 1) * spacing;
        const xOffset = isLeftWall ? -hallWidth / 2 + 0.15 : hallWidth / 2 - 0.15;

        // Local position in hall coordinates
        const localPos = new THREE.Vector3(xOffset, EYE_HEIGHT, zOffset);
        // Transform to global scene position
        const globalPos = localPos.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationAngle).add(centerPos);

        // Frame facing inward toward center of hall
        const frameYaw = rotationAngle + (isLeftWall ? Math.PI / 2 : -Math.PI / 2);

        // Create 3D Frame Object
        const frameGroup = new THREE.Group();
        frameGroup.position.copy(globalPos);
        frameGroup.rotation.y = frameYaw;

        // Outer Beveled Wooden/Metallic Border
        const frameBorderGeo = new THREE.BoxGeometry(2.4, 3.0, 0.12);
        const frameBorderMat = new THREE.MeshStandardMaterial({
          color: 0x1f242c,
          roughness: 0.25,
          metalness: 0.6
        });
        const borderMesh = new THREE.Mesh(frameBorderGeo, frameBorderMat);
        borderMesh.castShadow = true;
        frameGroup.add(borderMesh);

        // Gold Inlay Bevel
        const inlayGeo = new THREE.BoxGeometry(2.26, 2.86, 0.13);
        const inlayMat = new THREE.MeshStandardMaterial({
          color: 0xdfba73,
          roughness: 0.2,
          metalness: 0.85
        });
        const inlayMesh = new THREE.Mesh(inlayGeo, inlayMat);
        frameGroup.add(inlayMesh);

        // Artwork Canvas
        const artGeo = new THREE.PlaneGeometry(2.1, 2.7);
        const artTex = generateArtworkTexture(proj);
        const artMat = new THREE.MeshStandardMaterial({
          map: artTex,
          roughness: 0.35,
          metalness: 0.05
        });
        const artMesh = new THREE.Mesh(artGeo, artMat);
        artMesh.position.z = 0.07;
        artMesh.userData = { project: proj, frameGroup: frameGroup };
        frameGroup.add(artMesh);

        // Brass Museum Plaque Underneath
        const plaqueGeo = new THREE.BoxGeometry(1.6, 0.32, 0.06);
        const plaqueMat = new THREE.MeshStandardMaterial({
          color: 0xc5a059,
          metalness: 0.9,
          roughness: 0.2
        });
        const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
        plaqueMesh.position.set(0, -1.75, 0.04);
        frameGroup.add(plaqueMesh);

        // Dedicated Spotlight Above Frame
        const spotLight = new THREE.SpotLight(0xfff7e6, 1.4, 9, Math.PI / 4, 0.45, 1.2);
        spotLight.position.set(0, 1.9, 1.5);
        spotLight.target = artMesh;
        spotLight.castShadow = false; // lightweight
        frameGroup.add(spotLight);

        // Search Beacon Pillar (hidden by default)
        const beaconGeo = new THREE.CylinderGeometry(0.08, 0.08, 12, 12);
        const beaconMat = new THREE.MeshBasicMaterial({
          color: accentHex,
          transparent: true,
          opacity: 0,
          wireframe: false
        });
        const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
        beaconMesh.position.set(0, 6, 0);
        frameGroup.add(beaconMesh);
        searchBeacons.push({ mesh: beaconMesh, proj: proj });

        scene.add(frameGroup);

        // Register interactive target
        exhibitObjects.push({
          mesh: artMesh,
          group: frameGroup,
          project: proj,
          spotLight: spotLight,
          worldPos: globalPos,
          facingYaw: frameYaw,
          beacon: beaconMesh
        });
      });
    }

    // Mount all wings
    mountExhibitsOnHall(grouped.cyber, new THREE.Vector3(0, 0, -28), 0, 26, 12, 0xf85149);
    mountExhibitsOnHall(grouped.games, new THREE.Vector3(32, 0, 0), -Math.PI / 2, 28, 12, 0xbc8cff);
    mountExhibitsOnHall(grouped.ai, new THREE.Vector3(0, 0, 30), Math.PI, 26, 12, 0x58a6ff);
    mountExhibitsOnHall(grouped.web, new THREE.Vector3(-32, 0, 0), Math.PI / 2, 28, 12, 0xd29922);
    mountExhibitsOnHall(grouped.prod, new THREE.Vector3(-24, 0, 24), (3 * Math.PI) / 4, 24, 12, 0x3fb950);

    const statCount = document.getElementById('stat-count');
    if (statCount) statCount.textContent = `${exhibitObjects.length} EXHIBITS`;
  }

  // --- COLLISION LOGIC ---
  function canMoveTo(nx, nz) {
    // Outer boundary limit
    if (Math.abs(nx) > 52 || Math.abs(nz) > 52) return false;
    for (let i = 0; i < colliders.length; i++) {
      const box = colliders[i];
      if (nx > box.minX && nx < box.maxX && nz > box.minZ && nz < box.maxZ) {
        return false;
      }
    }
    return true;
  }

  // --- MINIMAP RADAR RENDERING ---
  const radarCanvas = document.getElementById('radar-canvas');
  const radarCtx = radarCanvas ? radarCanvas.getContext('2d') : null;

  function renderRadar() {
    if (!radarCtx) return;
    const w = radarCanvas.width;
    const h = radarCanvas.height;
    radarCtx.clearRect(0, 0, w, h);

    // Center of radar
    const cx = w / 2;
    const cy = h / 2;
    const scale = 1.35; // world to radar scale

    // Background circle
    radarCtx.fillStyle = 'rgba(7, 10, 19, 0.9)';
    radarCtx.beginPath();
    radarCtx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    radarCtx.fill();
    radarCtx.strokeStyle = 'rgba(197, 160, 89, 0.4)';
    radarCtx.lineWidth = 1.5;
    radarCtx.stroke();

    // Floorplan corridors outline
    radarCtx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    radarCtx.lineWidth = 1;

    // Cross axes
    radarCtx.beginPath();
    radarCtx.moveTo(cx, 10);
    radarCtx.lineTo(cx, h - 10);
    radarCtx.moveTo(10, cy);
    radarCtx.lineTo(w - 10, cy);
    radarCtx.stroke();

    // Draw exhibits blips
    exhibitObjects.forEach(ex => {
      const rx = cx + (ex.worldPos.x * scale);
      const ry = cy + (ex.worldPos.z * scale);
      radarCtx.fillStyle = ex.project.highlight ? '#dfba73' : 'rgba(88, 166, 255, 0.7)';
      radarCtx.beginPath();
      radarCtx.arc(rx, ry, 2, 0, Math.PI * 2);
      radarCtx.fill();
    });

    // Draw player position and heading wedge
    const px = cx + (camera.position.x * scale);
    const py = cy + (camera.position.z * scale);

    // Heading cone
    radarCtx.fillStyle = 'rgba(223, 186, 115, 0.25)';
    radarCtx.beginPath();
    radarCtx.moveTo(px, py);
    const coneAngle = 0.55;
    radarCtx.arc(px, py, 14, state.cameraYaw - Math.PI / 2 - coneAngle, state.cameraYaw - Math.PI / 2 + coneAngle);
    radarCtx.closePath();
    radarCtx.fill();

    // Player dot
    radarCtx.fillStyle = '#ffffff';
    radarCtx.beginPath();
    radarCtx.arc(px, py, 3.5, 0, Math.PI * 2);
    radarCtx.fill();
  }

  // --- PROXIMITY & INTERACTION RAYCASTING ---
  const raycaster = new THREE.Raycaster();
  const screenCenter = new THREE.Vector2(0, 0);

  function checkProximityAndFocus() {
    let closestExhibit = null;
    let closestDist = Infinity;

    // 1. Distance check
    for (let i = 0; i < exhibitObjects.length; i++) {
      const ex = exhibitObjects[i];
      const dist = camera.position.distanceTo(ex.worldPos);
      if (dist < 4.2 && dist < closestDist) {
        closestDist = dist;
        closestExhibit = ex;
      }
    }

    // 2. Center Raycast check
    raycaster.setFromCamera(screenCenter, camera);
    const intersects = raycaster.intersectObjects(exhibitObjects.map(e => e.mesh));

    const promptEl = document.getElementById('interaction-prompt');
    const promptText = document.getElementById('prompt-text');

    if (intersects.length > 0 && intersects[0].distance < 6.5) {
      const hitObj = intersects[0].object.userData.project;
      state.nearExhibit = intersects[0].object.userData;
      if (promptEl) {
        promptEl.style.display = 'flex';
        promptText.textContent = `Inspect "${hitObj.name}"`;
      }
    } else if (closestExhibit) {
      state.nearExhibit = { project: closestExhibit.project, frameGroup: closestExhibit.group };
      if (promptEl) {
        promptEl.style.display = 'flex';
        promptText.textContent = `Inspect "${closestExhibit.project.name}"`;
      }
    } else {
      state.nearExhibit = null;
      if (promptEl) promptEl.style.display = 'none';
    }

    // Update current wing in status bar
    const pX = camera.position.x;
    const pZ = camera.position.z;
    let wingName = "GRAND ROTUNDA";
    if (pZ < -14) wingName = "BASTION WING";
    else if (pX > 14) wingName = "ARCADE & XR PAVILION";
    else if (pZ > 14 && pX > -10) wingName = "NEURAL HALL";
    else if (pX < -14 && pZ < 10) wingName = "COSMOS & MEDIA SALON";
    else if (pX < -10 && pZ > 10) wingName = "ENTERPRISE ATRIUM";

    const statWing = document.getElementById('stat-wing');
    if (statWing) statWing.textContent = wingName;
  }

  // --- AUTO-WALK VIP HIGHLIGHT TOUR ---
  const tourWaypoints = [];

  function setupTourWaypoints() {
    // Collect all highlight projects
    const highlights = exhibitObjects.filter(e => e.project.highlight);
    highlights.forEach(ex => {
      // Waypoint in front of the frame
      const offset = new THREE.Vector3(0, 0, 3.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), ex.facingYaw);
      const standPos = ex.worldPos.clone().add(offset);
      standPos.y = EYE_HEIGHT;
      tourWaypoints.push({
        standPos: standPos,
        lookTarget: ex.worldPos.clone(),
        yaw: ex.facingYaw + Math.PI,
        project: ex.project,
        spotLight: ex.spotLight
      });
    });
  }

  function startAutoWalkTour() {
    if (tourWaypoints.length === 0) setupTourWaypoints();
    if (tourWaypoints.length === 0) return;

    state.isTourRunning = true;
    state.tourIndex = 0;

    const tourBtn = document.getElementById('tour-toggle-btn');
    const tourBtnText = document.getElementById('tour-btn-text');
    const tourBanner = document.getElementById('tour-banner');

    if (tourBtn) tourBtn.classList.add('running');
    if (tourBtnText) tourBtnText.textContent = 'Stop Tour';
    if (tourBanner) tourBanner.classList.add('active');

    executeTourStep();
  }

  function stopAutoWalkTour() {
    state.isTourRunning = false;
    clearTimeout(state.tourTimer);

    const tourBtn = document.getElementById('tour-toggle-btn');
    const tourBtnText = document.getElementById('tour-btn-text');
    const tourBanner = document.getElementById('tour-banner');

    if (tourBtn) tourBtn.classList.remove('running');
    if (tourBtnText) tourBtnText.textContent = 'VIP Highlight Tour';
    if (tourBanner) tourBanner.classList.remove('active');
  }

  function executeTourStep() {
    if (!state.isTourRunning) return;
    const wp = tourWaypoints[state.tourIndex];
    if (!wp) {
      stopAutoWalkTour();
      return;
    }

    // Update banner
    const tourHeading = document.getElementById('tour-heading');
    const tourNarration = document.getElementById('tour-narration');
    if (tourHeading) tourHeading.textContent = `★ ${wp.project.name} (${wp.project.category})`;
    if (tourNarration) tourNarration.textContent = wp.project.desc;

    // Smoothly fly camera to waypoint
    flyCameraTo(wp.standPos, wp.yaw, 2500, () => {
      playChimeSound();
      // Pause at exhibit for 6.5 seconds
      state.tourTimer = setTimeout(() => {
        if (!state.isTourRunning) return;
        state.tourIndex = (state.tourIndex + 1) % tourWaypoints.length;
        executeTourStep();
      }, 6500);
    });
  }

  function flyCameraTo(targetPos, targetYaw, duration = 1200, onComplete = null) {
    const startPos = camera.position.clone();
    const startYaw = state.cameraYaw;
    const startTime = performance.now();

    function updateFlight() {
      const now = performance.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI); // Smooth ease-in-out

      camera.position.lerpVectors(startPos, targetPos, ease);
      state.cameraYaw = startYaw + (targetYaw - startYaw) * ease;
      state.cameraPitch = state.cameraPitch * (1 - ease); // Re-level pitch
      updateCameraOrientation();

      if (progress < 1) {
        requestAnimationFrame(updateFlight);
      } else {
        if (onComplete) onComplete();
      }
    }
    requestAnimationFrame(updateFlight);
  }

  // --- PROJECT INSPECTOR MODAL & LAUNCHER ---
  function openProjectModal(project) {
    state.focusedProject = project;
    stopAutoWalkTour();
    playChimeSound();

    const backdrop = document.getElementById('project-modal-backdrop');
    const iconEl = document.getElementById('modal-project-icon');
    const nameEl = document.getElementById('modal-project-name');
    const catEl = document.getElementById('modal-project-category');
    const typeEl = document.getElementById('modal-project-type');
    const descEl = document.getElementById('modal-project-desc');
    const stackEl = document.getElementById('modal-tech-stack');
    const pathEl = document.getElementById('modal-folder-path');

    const btnLive = document.getElementById('btn-launch-live');
    const btnCat = document.getElementById('btn-launch-categorized');
    const btnPlanetarium = document.getElementById('btn-warp-planetarium');
    const btnFolder = document.getElementById('btn-open-folder');

    if (iconEl) iconEl.textContent = project.icon || '🏛️';
    if (nameEl) nameEl.textContent = project.name;
    if (catEl) {
      catEl.textContent = project.category;
      catEl.className = `modal-category-badge ${project.tagClass || ''}`;
    }
    if (typeEl) typeEl.textContent = `${project.type || 'Web Application'} • Antigravity Verified`;
    if (descEl) descEl.textContent = project.desc;
    if (pathEl) pathEl.textContent = project.folderPath || '';

    // Tech stack pills
    if (stackEl) {
      stackEl.innerHTML = (project.stack || ['HTML5', 'Modern Web']).map(t => `
        <span class="tech-tag">${t}</span>
      `).join('');
    }

    // Launch Live Index Link
    const directUrl = project.relativeIndex || (project.indexFile ? `file:///${project.indexFile}` : project.categorizedRelative);
    if (btnLive) {
      btnLive.href = directUrl;
    }

    // Categorized Index Hub Entry
    if (btnCat) {
      btnCat.href = project.categorizedRelative || 'index.html';
    }

    // Deep Link to Planetarium Observatory with URL param
    if (btnPlanetarium) {
      const planetParam = encodeURIComponent(project.planetId || project.name);
      btnPlanetarium.href = `../My Planetarium/index.html?warp=${planetParam}`;
    }

    // Open Folder
    if (btnFolder) {
      btnFolder.href = `file:///${project.folderPath}`;
    }

    // Reset iframe
    state.previewLoaded = false;
    const iframe = document.getElementById('preview-iframe');
    const toggleBtn = document.getElementById('preview-toggle-btn');
    if (iframe) iframe.src = 'about:blank';
    if (toggleBtn) toggleBtn.textContent = 'Load Live Preview';

    if (backdrop) backdrop.classList.add('open');
  }

  function closeProjectModal() {
    const backdrop = document.getElementById('project-modal-backdrop');
    if (backdrop) backdrop.classList.remove('open');
    const iframe = document.getElementById('preview-iframe');
    if (iframe) iframe.src = 'about:blank';
    state.focusedProject = null;
  }

  function togglePreviewIframe() {
    const iframe = document.getElementById('preview-iframe');
    const toggleBtn = document.getElementById('preview-toggle-btn');
    if (!iframe || !state.focusedProject) return;

    if (!state.previewLoaded) {
      const targetSrc = state.focusedProject.relativeIndex || state.focusedProject.categorizedRelative;
      iframe.src = targetSrc;
      state.previewLoaded = true;
      if (toggleBtn) toggleBtn.textContent = 'Unload Preview';
    } else {
      iframe.src = 'about:blank';
      state.previewLoaded = false;
      if (toggleBtn) toggleBtn.textContent = 'Load Live Preview';
    }
  }

  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2600);
  }

  // --- CAMERA ORIENTATION & CONTROLS ---
  function updateCameraOrientation() {
    const euler = new THREE.Euler(state.cameraPitch, state.cameraYaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);
  }

  // Mouse drag to look around
  container.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      state.isMouseDown = true;
      state.prevMouseX = e.clientX;
      state.prevMouseY = e.clientY;
    }
  });

  window.addEventListener('mouseup', () => {
    state.isMouseDown = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (state.isMouseDown) {
      const dx = e.clientX - state.prevMouseX;
      const dy = e.clientY - state.prevMouseY;
      state.prevMouseX = e.clientX;
      state.prevMouseY = e.clientY;

      state.cameraYaw -= dx * 0.0035;
      state.cameraPitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, state.cameraPitch - dy * 0.0035));
      updateCameraOrientation();
    }
  });

  // Canvas Click (Raycast to frame or inspect)
  container.addEventListener('click', (e) => {
    initAudio();
    // Raycast check
    const mouse = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(exhibitObjects.map(e => e.mesh));

    if (intersects.length > 0 && intersects[0].distance < 14) {
      const proj = intersects[0].object.userData.project;
      openProjectModal(proj);
    }
  });

  // Keyboard Event Listeners
  window.addEventListener('keydown', (e) => {
    initAudio();
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

    if (e.code in keys) {
      keys[e.code] = true;
      if (state.isTourRunning) stopAutoWalkTour();
    }

    if (e.code === 'KeyE') {
      if (state.nearExhibit && state.nearExhibit.project) {
        openProjectModal(state.nearExhibit.project);
      }
    } else if (e.code === 'KeyT') {
      GalleryApp.toggleAutoWalkTour();
    } else if (e.code === 'Slash') {
      e.preventDefault();
      const s = document.getElementById('gallery-search');
      if (s) s.focus();
    } else if (e.code === 'Escape') {
      closeProjectModal();
      stopAutoWalkTour();
      const help = document.getElementById('help-modal');
      if (help) help.classList.remove('open');
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code in keys) {
      keys[e.code] = false;
    }
  });

  // On-Screen Walk Pad Listeners
  document.querySelectorAll('.pad-btn').forEach(btn => {
    const action = btn.dataset.action;
    btn.addEventListener('mousedown', () => {
      initAudio();
      if (action in padState) padState[action] = true;
      if (action === 'sprint') state.sprint = !state.sprint;
      if (action === 'teleport') GalleryApp.teleportToWing('rotunda');
      if (action === 'inspect' && state.nearExhibit) openProjectModal(state.nearExhibit.project);
    });
    btn.addEventListener('mouseup', () => {
      if (action in padState) padState[action] = false;
    });
    btn.addEventListener('mouseleave', () => {
      if (action in padState) padState[action] = false;
    });
  });

  // --- ANIMATION & PHYSICS TICK LOOP ---
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();

    // Rotate Rotunda Torus Sculpture
    if (rotundaSculpture) {
      rotundaSculpture.children[0].rotation.y = elapsed * 0.45;
      rotundaSculpture.children[0].rotation.x = Math.sin(elapsed * 0.7) * 0.3;
      rotundaSculpture.children[1].rotation.z = -elapsed * 0.35;
      rotundaSculpture.children[1].rotation.x = Math.cos(elapsed * 0.5) * 0.45;
    }

    // Walking Motion Physics (When not flying)
    if (!state.isTourRunning) {
      const forwardInput =
        (keys.KeyW || keys.ArrowUp || padState.forward ? 1 : 0) -
        (keys.KeyS || keys.ArrowDown || padState.backward ? 1 : 0);
      const strafeInput =
        (keys.KeyD || keys.ArrowRight || padState.right ? 1 : 0) -
        (keys.KeyA || keys.ArrowLeft || padState.left ? 1 : 0);

      // On-screen turning
      if (padState.turnLeft) {
        state.cameraYaw += 1.8 * dt;
        updateCameraOrientation();
      }
      if (padState.turnRight) {
        state.cameraYaw -= 1.8 * dt;
        updateCameraOrientation();
      }

      if (forwardInput !== 0 || strafeInput !== 0) {
        const speed = (keys.ShiftLeft || keys.ShiftRight || state.sprint) ? 9.2 : 5.4;
        const yaw = state.cameraYaw;

        const forwardVec = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        const rightVec = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

        const moveVec = new THREE.Vector3()
          .addScaledVector(forwardVec, forwardInput)
          .addScaledVector(rightVec, strafeInput)
          .normalize()
          .multiplyScalar(speed * dt);

        const nextX = camera.position.x + moveVec.x;
        const nextZ = camera.position.z + moveVec.z;

        if (canMoveTo(nextX, camera.position.z)) {
          camera.position.x = nextX;
        }
        if (canMoveTo(camera.position.x, nextZ)) {
          camera.position.z = nextZ;
        }

        playFootstepSound();
      }
    }

    // Periodic Check for Proximity & Raycasting
    checkProximityAndFocus();

    // Render Minimap Radar
    renderRadar();

    // Render 3D Scene
    renderer.render(scene, camera);
  }

  // --- WINDOW RESIZE ---
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --- INITIALIZATION ---
  buildGalleryArchitecture();
  buildProjectExhibits();
  setupTourWaypoints();
  animate();

  // Check URL parameter e.g. ?focus=monopoly
  const urlParams = new URLSearchParams(window.location.search);
  const focusParam = urlParams.get('focus');
  if (focusParam) {
    setTimeout(() => {
      const match = exhibitObjects.find(e => e.project.name.toLowerCase() === focusParam.toLowerCase() || e.project.id.toLowerCase() === focusParam.toLowerCase());
      if (match) {
        const offset = new THREE.Vector3(0, 0, 3.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), match.facingYaw);
        const standPos = match.worldPos.clone().add(offset);
        standPos.y = EYE_HEIGHT;
        flyCameraTo(standPos, match.facingYaw + Math.PI, 1500, () => {
          openProjectModal(match.project);
        });
      }
    }, 400);
  }

  // --- PUBLIC API (WINDOW.GalleryApp) ---
  window.GalleryApp = {
    teleportToWing: function (wingKey) {
      initAudio();
      stopAutoWalkTour();
      const wing = WINGS[wingKey];
      if (!wing) return;

      document.querySelectorAll('.wing-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.wing === wingKey);
      });

      flyCameraTo(wing.pos, wing.yaw, 1200);
      showToast(`Teleported to ${wing.name}`);
    },

    toggleAutoWalkTour: function () {
      initAudio();
      if (state.isTourRunning) {
        stopAutoWalkTour();
      } else {
        startAutoWalkTour();
      }
    },

    stopAutoWalkTour: stopAutoWalkTour,

    searchExhibits: function (query) {
      const q = (query || '').toLowerCase().trim();
      searchBeacons.forEach(b => {
        const match = q.length > 0 && (
          b.proj.name.toLowerCase().includes(q) ||
          b.proj.category.toLowerCase().includes(q) ||
          (b.proj.desc && b.proj.desc.toLowerCase().includes(q))
        );
        b.mesh.material.opacity = match ? 0.75 : 0;
      });
    },

    handleRadarClick: function (e) {
      if (!radarCanvas) return;
      const rect = radarCanvas.getBoundingClientRect();
      const rx = (e.clientX - rect.left) - radarCanvas.width / 2;
      const ry = (e.clientY - rect.top) - radarCanvas.height / 2;
      const scale = 1.35;
      const targetX = rx / scale;
      const targetZ = ry / scale;

      if (canMoveTo(targetX, targetZ)) {
        flyCameraTo(new THREE.Vector3(targetX, EYE_HEIGHT, targetZ), state.cameraYaw, 800);
      }
    },

    toggleAudio: function () {
      initAudio();
      state.audioEnabled = !state.audioEnabled;
      const icon = document.getElementById('audio-icon');
      if (icon) icon.textContent = state.audioEnabled ? '🔊' : '🔇';
      showToast(state.audioEnabled ? 'Spatial Audio & Footsteps Enabled' : 'Audio Muted');
    },

    toggleHelpModal: function () {
      const modal = document.getElementById('help-modal');
      if (modal) modal.classList.toggle('open');
    },

    closeModal: closeProjectModal,

    handleBackdropClick: function (e) {
      if (e.target.id === 'project-modal-backdrop') {
        closeProjectModal();
      }
    },

    togglePreviewIframe: togglePreviewIframe,

    copyFolderPath: function () {
      if (!state.focusedProject || !state.focusedProject.folderPath) return;
      navigator.clipboard.writeText(state.focusedProject.folderPath).then(() => {
        showToast('Project folder path copied to clipboard!');
      });
    }
  };

})();
