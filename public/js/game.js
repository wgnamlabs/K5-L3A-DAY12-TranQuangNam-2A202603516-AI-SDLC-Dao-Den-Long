/**
 * game.js
 * 3D Renderer using Three.js - Phase 2 Campaign (3 Nights)
 */

let scene, camera, renderer;
let sim;
let currentNight = 1;
let campaignScore = 0;
let mayMesh, lanternMeshes = [], moteMeshes = [], shadeMeshes = [], drifterMeshes = [], charmMeshes = [];
let islandMeshGroup, pulseRingMesh;
let hemiLight, dirLight;
let skyMesh, moonGroup, cloudsGroup, cloudMeshA, cloudPuffs = [], distantGroup, floatingIslets = [], ambientDust;
let graphicsQuality = 'medium';

// Input & Camera tracking
const keys = {};
const latchedKeys = { jump: false, dash: false, interact: false, pulse: false };
let prevMouseX = null;
let prevMouseY = null;
let camYaw = 0;
let camPitch = 0.35;
let camDist = 9.0;
let mouseSensitivity = 5;
let isColorblind = false;

function requestGamePointerLock() {
  try {
    if (renderer && renderer.domElement && renderer.domElement.requestPointerLock) {
      const p = renderer.domElement.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    }
  } catch (err) {}
}

function exitGamePointerLock() {
  try {
    if (document.exitPointerLock) document.exitPointerLock();
  } catch (err) {}
}

function init() {
  const container = document.getElementById('canvas-container');

  // Load saved settings
  loadSettings();

  // 1. Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0A0618);
  scene.fog = new THREE.FogExp2(0x141838, 0.009);

  // 2. Camera setup
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 800);

  // 3. Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  // 4. Lighting
  hemiLight = new THREE.HemisphereLight(0x2A3568, 0x0B0F20, 0.42);
  scene.add(hemiLight);

  // Cool moonlight matching the Moon position
  dirLight = new THREE.DirectionalLight(0xA0C4FF, 0.68);
  dirLight.position.set(130, 115, -170);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 450;
  dirLight.shadow.camera.left = -65;
  dirLight.shadow.camera.right = 65;
  dirLight.shadow.camera.top = 65;
  dirLight.shadow.camera.bottom = -65;
  dirLight.shadow.bias = -0.001;
  scene.add(dirLight);

  // 5. Sky, Moon, Clouds, Parallax Mountains & Atmosphere
  buildSkyAtmosphere();
  applyQualitySetting();

  // 6. Pulse Shockwave Mesh
  const ringGeo = new THREE.RingGeometry(0.1, 0.4, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xF2C14E,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.0
  });
  pulseRingMesh = new THREE.Mesh(ringGeo, ringMat);
  pulseRingMesh.position.y = 0.1;
  scene.add(pulseRingMesh);

  // 7. Event listeners
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // Click canvas to capture pointer lock for seamless mouse-look
  renderer.domElement.addEventListener('click', () => {
    if (sim && sim.state === 'playing') {
      if (document.pointerLockElement !== renderer.domElement) {
        requestGamePointerLock();
      }
    }
  });

  window.addEventListener('mousedown', (e) => {
    window.soundFx.init();
    if (e.button === 2) {
      // Right click to Dash
      keys['shift'] = true;
      setTimeout(() => { keys['shift'] = false; }, 50);
    }
  });

  window.addEventListener('contextmenu', (e) => e.preventDefault());

  // Free mouse look: camera rotates wherever the mouse moves without holding any buttons
  window.addEventListener('mousemove', (e) => {
    if (!sim || sim.state !== 'playing') {
      prevMouseX = null;
      prevMouseY = null;
      return;
    }

    let dx = 0;
    let dy = 0;

    if (document.pointerLockElement === renderer.domElement) {
      dx = e.movementX || 0;
      dy = e.movementY || 0;
    } else {
      // Direct mouse tracking across window
      if (prevMouseX !== null && prevMouseY !== null) {
        dx = e.clientX - prevMouseX;
        dy = e.clientY - prevMouseY;
      }
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    }

    // Smoothly clamp large single-frame sweeps
    dx = Math.max(-120, Math.min(120, dx));
    dy = Math.max(-120, Math.min(120, dy));

    const sensFactor = 0.0015 * (mouseSensitivity / 5);
    camYaw -= dx * sensFactor;
    camPitch += dy * sensFactor;
    // Clamp pitch between ~3° and ~72° for third-person perspective
    camPitch = Math.max(0.05, Math.min(1.25, camPitch));
  });

  // Mouse wheel to zoom camera distance
  window.addEventListener('wheel', (e) => {
    camDist = Math.max(4.0, Math.min(16.0, camDist + e.deltaY * 0.005));
  }, { passive: true });

  showNightIntro(1);
  lastTime = performance.now();
  requestAnimationFrame(animate);
}

function showNightIntro(nightNum) {
  exitGamePointerLock();
  currentNight = nightNum;
  const names = {
    1: "ĐÊM 1 — ĐẢO BẾN",
    2: "ĐÊM 2 — ĐẢO CAU",
    3: "ĐÊM 3 — ĐẢO CHUÔNG"
  };
  const quotes = {
    1: `"Mây à, sương đen lại ùa về nuốt chửng ánh sáng đảo rồi. Con hãy cầm đèn, gom đom đóm thắp sáng lại 5 Đèn Lồng Lớn trước khi trời sáng nhé!"`,
    2: `"Đêm nay gió lớn trên Đảo Cau! Hai hòn đảo nối bởi cầu tre không lan can. Coi chừng lũ Gió Lạc bay nhanh cướp đom đóm, và nhớ nhặt Bùa Gió trên cầu để lướt liên tục con nhé!"`,
    3: `"Đảo Chuông có 3 tầng đá dựng đứng. Đỉnh tháp chuông ngút ngàn, gió bão cuộn trào từng cơn. Hãy nương theo bục nhảy, thắp đủ 7 ngọn đèn để đón ánh bình minh rạng rỡ!"`
  };

  document.getElementById('intro-night-name').textContent = names[nightNum];
  document.querySelector('#modal-intro .ong-dang-quote em').textContent = quotes[nightNum];
  document.getElementById('hud-night-title').textContent = names[nightNum];
  document.getElementById('modal-intro').classList.add('active');
}

function startNightGame() {
  document.getElementById('modal-intro').classList.remove('active');
  window.soundFx.init();
  requestGamePointerLock();

  sim = new GameSimulation({
    seed: Math.floor(Math.random() * 100000),
    night: currentNight
  });
  window.sim = sim;

  buildIslandTerrain(currentNight);
  buildCharacter();
  buildLanterns();
  buildMotes();
  buildShades();
  buildDrifters();
  buildCharms();
  updateHUD();
}

function buildIslandTerrain(night) {
  if (islandMeshGroup) scene.remove(islandMeshGroup);
  islandMeshGroup = new THREE.Group();

  const grassMat = new THREE.MeshStandardMaterial({ color: 0x2F5D50, roughness: 0.85 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6B4A2F, roughness: 0.9 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xC9B48A, roughness: 0.8 });

  if (night === 1) {
    // Single island r = 40m
    const islandGeo = new THREE.CylinderGeometry(40, 38, 4, 48);
    const islandMesh = new THREE.Mesh(islandGeo, grassMat);
    islandMesh.position.y = -2;
    islandMesh.receiveShadow = true;
    islandMeshGroup.add(islandMesh);

    // Stone path
    const pathGeo = new THREE.RingGeometry(22, 26, 48);
    pathGeo.rotateX(-Math.PI / 2);
    const pathMesh = new THREE.Mesh(pathGeo, stoneMat);
    pathMesh.position.y = 0.02;
    islandMeshGroup.add(pathMesh);
  } else if (night === 2) {
    // Island A (r=28)
    const iAGeo = new THREE.CylinderGeometry(28, 26, 4, 36);
    const iAMesh = new THREE.Mesh(iAGeo, grassMat);
    iAMesh.position.set(0, -2, 0);
    islandMeshGroup.add(iAMesh);

    // Island B (r=28 at x=70)
    const iBGeo = new THREE.CylinderGeometry(28, 26, 4, 36);
    const iBMesh = new THREE.Mesh(iBGeo, grassMat);
    iBMesh.position.set(70, -2, 0);
    islandMeshGroup.add(iBMesh);

    // Bamboo bridge x in [26, 44], z in [-2, 2]
    const bridgeGeo = new THREE.BoxGeometry(18, 0.4, 4);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, woodMat);
    bridgeMesh.position.set(35, -0.2, 0);
    islandMeshGroup.add(bridgeMesh);

    // Launch pads: (20, 0, 18) and (50, 0, -18)
    const padGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.2, 16);
    const padMat = new THREE.MeshStandardMaterial({ color: 0xF2C14E, emissive: 0x553300 });
    const pad1 = new THREE.Mesh(padGeo, padMat);
    pad1.position.set(20, 0.1, 18);
    islandMeshGroup.add(pad1);

    const pad2 = new THREE.Mesh(padGeo, padMat);
    pad2.position.set(50, 0.1, -18);
    islandMeshGroup.add(pad2);
  } else if (night === 3) {
    // 3 Tiers Island
    // Tier 0: r = 45m
    const t0Geo = new THREE.CylinderGeometry(45, 43, 4, 48);
    const t0 = new THREE.Mesh(t0Geo, grassMat);
    t0.position.y = -2;
    islandMeshGroup.add(t0);

    // Tier 1: ring r in [12, 24] with z > 0, height Y = 3
    const t1Geo = new THREE.CylinderGeometry(24, 24, 3, 36, 1, false, 0, Math.PI);
    const t1 = new THREE.Mesh(t1Geo, stoneMat);
    t1.position.set(0, 1.5, 0);
    islandMeshGroup.add(t1);

    // Tier 2: disk r = 8m, height Y = 6
    const t2Geo = new THREE.CylinderGeometry(8, 8, 6, 24);
    const t2 = new THREE.Mesh(t2Geo, stoneMat);
    t2.position.set(0, 3, 0);
    islandMeshGroup.add(t2);

    // Bell Tower at center: height 8m, radius 2m
    const towerGeo = new THREE.CylinderGeometry(2, 2.2, 8, 16);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x6B4A2F });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(0, 10, 0);
    islandMeshGroup.add(tower);

    // Launch pad on Tier 1 at (0, 3, 13)
    const padGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.2, 16);
    const padMat = new THREE.MeshStandardMaterial({ color: 0xF2C14E, emissive: 0x553300 });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(0, 3.1, 13);
    islandMeshGroup.add(pad);
  }

  scene.add(islandMeshGroup);
}

function createSoftCircleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.7)');
  grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function buildSkyAtmosphere() {
  if (skyMesh) scene.remove(skyMesh);
  if (moonGroup) scene.remove(moonGroup);
  if (cloudsGroup) scene.remove(cloudsGroup);
  if (distantGroup) scene.remove(distantGroup);
  if (ambientDust) scene.remove(ambientDust);

  // 1. Sky Dome Shader with night gradient, stars and Milky Way
  const skyGeo = new THREE.SphereGeometry(480, 32, 24);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x080414) },      // Deep midnight purple
      midColor: { value: new THREE.Color(0x0f183b) },      // Navy indigo
      horizonColor: { value: new THREE.Color(0x2a1738) },  // Twilight dusk violet
      glowColor: { value: new THREE.Color(0x853b52) },     // Warm rose horizon glow
      time: { value: 0 }
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = position;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform vec3 glowColor;
      uniform float time;
      varying vec3 vWorldPos;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main() {
        vec3 dir = normalize(vWorldPos);
        float h = dir.y;

        vec3 col;
        if (h > 0.15) {
          float t = (h - 0.15) / 0.85;
          col = mix(midColor, topColor, t);
        } else if (h >= 0.0) {
          float t = h / 0.15;
          col = mix(horizonColor, midColor, t);
        } else {
          col = mix(horizonColor, glowColor * 0.4, clamp(-h * 4.0, 0.0, 1.0));
        }

        // Horizon twilight glow band
        float horizonGlow = exp(-abs(h) * 16.0) * 0.45;
        col += glowColor * horizonGlow;

        // Twinkling stars
        if (h > 0.04) {
          vec2 starCoord = vec2(atan(dir.z, dir.x) * 45.0, dir.y * 70.0);
          vec2 iCoord = floor(starCoord);
          float r = hash(iCoord);
          if (r > 0.94) {
            vec2 fCoord = fract(starCoord) - 0.5;
            float d = length(fCoord);
            float twinkle = sin(time * 2.0 + r * 6.28) * 0.35 + 0.65;
            float star = smoothstep(0.18, 0.0, d) * (r - 0.94) * 18.0 * twinkle;
            col += vec3(0.9, 0.95, 1.0) * star;
          }

          // Faint Milky Way dust lane
          float mwBand = abs(dir.x * 0.7 + dir.y * 0.6 - dir.z * 0.4);
          if (mwBand < 0.35) {
            float mw = (1.0 - mwBand / 0.35) * 0.07;
            col += vec3(0.38, 0.45, 0.75) * mw;
          }
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false
  });
  skyMesh = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyMesh);

  // 2. Poetic Moon with lunar halo
  moonGroup = new THREE.Group();
  const moonCanvas = document.createElement('canvas');
  moonCanvas.width = 128;
  moonCanvas.height = 128;
  const mctx = moonCanvas.getContext('2d');
  const mGrad = mctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  mGrad.addColorStop(0, '#FFFDE6');
  mGrad.addColorStop(0.6, '#F8E3B6');
  mGrad.addColorStop(0.85, '#E8C584');
  mGrad.addColorStop(1, 'rgba(232, 197, 132, 0)');
  mctx.fillStyle = mGrad;
  mctx.beginPath();
  mctx.arc(64, 64, 60, 0, Math.PI * 2);
  mctx.fill();

  // Subtle lunar seas / craters
  mctx.fillStyle = 'rgba(165, 142, 108, 0.22)';
  mctx.beginPath(); mctx.arc(46, 52, 15, 0, Math.PI * 2); mctx.fill();
  mctx.beginPath(); mctx.arc(74, 76, 20, 0, Math.PI * 2); mctx.fill();
  mctx.beginPath(); mctx.arc(82, 44, 12, 0, Math.PI * 2); mctx.fill();

  const moonTex = new THREE.CanvasTexture(moonCanvas);
  const moonMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 26),
    new THREE.MeshBasicMaterial({ map: moonTex, transparent: true, depthWrite: false })
  );
  moonGroup.add(moonMesh);

  // Soft lunar halo
  const haloCanvas = document.createElement('canvas');
  haloCanvas.width = 128;
  haloCanvas.height = 128;
  const hctx = haloCanvas.getContext('2d');
  const hGrad = hctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  hGrad.addColorStop(0, 'rgba(255, 235, 175, 0.48)');
  hGrad.addColorStop(0.35, 'rgba(180, 210, 255, 0.22)');
  hGrad.addColorStop(1, 'rgba(14, 20, 48, 0)');
  hctx.fillStyle = hGrad;
  hctx.fillRect(0, 0, 128, 128);
  const haloTex = new THREE.CanvasTexture(haloCanvas);
  const haloMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshBasicMaterial({
      map: haloTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  haloMesh.position.z = -0.5;
  moonGroup.add(haloMesh);

  moonGroup.position.set(130, 115, -170);
  moonGroup.lookAt(0, 0, 0);
  scene.add(moonGroup);

  // 3. Multi-layer Cloud Sea below the islands
  cloudsGroup = new THREE.Group();

  const cloudMatA = new THREE.MeshStandardMaterial({
    color: 0x162248,
    roughness: 0.95,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide
  });
  cloudMeshA = new THREE.Mesh(new THREE.RingGeometry(35, 190, 48), cloudMatA);
  cloudMeshA.rotation.x = -Math.PI / 2;
  cloudMeshA.position.y = -6.5;
  cloudsGroup.add(cloudMeshA);

  const cloudMatB = new THREE.MeshStandardMaterial({
    color: 0x0E1430,
    roughness: 1.0,
    transparent: true,
    opacity: 0.96,
    side: THREE.DoubleSide
  });
  const cloudMeshB = new THREE.Mesh(new THREE.CircleGeometry(280, 48), cloudMatB);
  cloudMeshB.rotation.x = -Math.PI / 2;
  cloudMeshB.position.y = -12.0;
  cloudsGroup.add(cloudMeshB);

  // Volumetric cloud puffs drifting around
  const puffMat = new THREE.MeshStandardMaterial({
    color: 0x22325E,
    roughness: 0.92,
    transparent: true,
    opacity: 0.65
  });
  const puffGeo = new THREE.SphereGeometry(1, 8, 6);
  cloudPuffs = [];
  const puffCount = 18;
  for (let i = 0; i < puffCount; i++) {
    const angle = (i / puffCount) * Math.PI * 2;
    const dist = 55 + (i % 5) * 16;
    const puff = new THREE.Group();
    const subPuffs = 3 + (i % 3);
    for (let j = 0; j < subPuffs; j++) {
      const sp = new THREE.Mesh(puffGeo, puffMat);
      sp.scale.set(7 + j * 2.2, 2.8 + j * 0.8, 6 + j * 1.6);
      sp.position.set((j - 1) * 3.5, Math.sin(j) * 0.7, (j % 2) * 2.2);
      puff.add(sp);
    }
    puff.position.set(Math.cos(angle) * dist, -5.5 + (i % 3) * 1.2, Math.sin(angle) * dist);
    cloudsGroup.add(puff);
    cloudPuffs.push({ mesh: puff, baseAngle: angle, dist, speed: 0.02 + (i % 3) * 0.01 });
  }
  scene.add(cloudsGroup);

  // 4. Distant Mountain Silhouettes & Floating Islets (Parallax)
  distantGroup = new THREE.Group();
  const mountainMat = new THREE.MeshBasicMaterial({
    color: 0x141838,
    transparent: true,
    opacity: 0.78
  });
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2 + 0.15;
    const dist = 240 + (i % 3) * 35;
    const height = 35 + (i % 4) * 22;
    const width = 60 + (i % 3) * 25;
    const mGeo = new THREE.ConeGeometry(width, height, 4);
    const mMesh = new THREE.Mesh(mGeo, mountainMat);
    mMesh.position.set(Math.cos(ang) * dist, -5 + height * 0.35, Math.sin(ang) * dist);
    distantGroup.add(mMesh);
  }

  // Floating mini islets in the distance
  const isletMat = new THREE.MeshBasicMaterial({ color: 0x1b2246 });
  floatingIslets = [];
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2 + 0.8;
    const dist = 110 + i * 24;
    const islet = new THREE.Group();
    const rock = new THREE.Mesh(new THREE.ConeGeometry(4 + i, 6 + i * 1.5, 6), isletMat);
    rock.rotation.x = Math.PI;
    islet.add(rock);
    const pagoda = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 1.2), isletMat);
    pagoda.position.y = 1.0;
    islet.add(pagoda);
    islet.position.set(Math.cos(ang) * dist, 2 + Math.sin(i) * 5, Math.sin(ang) * dist);
    distantGroup.add(islet);
    floatingIslets.push({ mesh: islet, ang, dist, baseY: islet.position.y });
  }
  scene.add(distantGroup);

  // 5. Ambient Atmospheric Dust Motes
  const dustCount = 80;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 80;
    dustPos[i * 3 + 1] = Math.random() * 12 + 0.5;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 80;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustTex = createSoftCircleTexture();
  const dustMat = new THREE.PointsMaterial({
    size: 0.85,
    map: dustTex,
    transparent: true,
    opacity: 0.45,
    color: 0xFFE082,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  ambientDust = new THREE.Points(dustGeo, dustMat);
  scene.add(ambientDust);
}

function buildCharacter() {
  if (mayMesh) scene.remove(mayMesh);

  const group = new THREE.Group();

  // Robe body (#E8E2D0) with red scarf (#C8102E)
  const bodyGeo = new THREE.CylinderGeometry(0.3, 0.55, 1.1, 16);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xE8E2D0, roughness: 0.8 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.6;
  body.castShadow = true;
  group.add(body);

  const scarfGeo = new THREE.TorusGeometry(0.32, 0.1, 8, 16);
  scarfGeo.rotateX(Math.PI / 2);
  const scarfMat = new THREE.MeshStandardMaterial({ color: 0xC8102E });
  const scarf = new THREE.Mesh(scarfGeo, scarfMat);
  scarf.position.y = 1.15;
  group.add(scarf);

  // Head
  const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xFFCAD4, roughness: 0.6 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.35;
  head.castShadow = true;
  group.add(head);

  // Nón lá
  const hatGeo = new THREE.ConeGeometry(0.75, 0.4, 24);
  const hatMat = new THREE.MeshStandardMaterial({ color: 0xC9B48A, roughness: 0.9 });
  const hat = new THREE.Mesh(hatGeo, hatMat);
  hat.position.y = 1.62;
  hat.castShadow = true;
  group.add(hat);

  // Hanging mini-lantern
  const miniLamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xFFE9B0 })
  );
  const miniLight = new THREE.PointLight(0xFFB347, 1.2, 5);
  miniLamp.add(miniLight);
  miniLamp.position.set(0.45, 1.3, 0.3);
  group.add(miniLamp);

  mayMesh = group;
  scene.add(mayMesh);
}

function buildLanterns() {
  lanternMeshes.forEach(m => scene.remove(m));
  lanternMeshes = [];

  sim.lanterns.forEach((l) => {
    const lGroup = new THREE.Group();

    // Wooden base (#6B4A2F)
    const baseGeo = new THREE.CylinderGeometry(0.35, 0.55, 2.8, 12);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x6B4A2F, roughness: 0.9 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 1.4;
    base.castShadow = true;
    lGroup.add(base);

    // Roof
    const roofGeo = new THREE.ConeGeometry(1.2, 0.5, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x362312, roughness: 0.7 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 3.1;
    lGroup.add(roof);

    // Lantern Core (#5B5F6E when unlit, #FFE9B0 when lit)
    const coreGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.9, 12);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x5B5F6E,
      emissive: 0x111115,
      roughness: 0.5
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 2.4;
    lGroup.add(core);

    const pLight = new THREE.PointLight(0xFFB347, 0, 18);
    pLight.position.y = 2.6;
    lGroup.add(pLight);

    // Floating Fuel Bar (Phase 3)
    const fuelBarGroup = new THREE.Group();
    fuelBarGroup.position.set(0, 3.8, 0);

    const barBgGeo = new THREE.PlaneGeometry(1.2, 0.16);
    const barBgMat = new THREE.MeshBasicMaterial({ color: 0x120A1A, side: THREE.DoubleSide });
    const barBg = new THREE.Mesh(barBgGeo, barBgMat);
    fuelBarGroup.add(barBg);

    const barFillGeo = new THREE.PlaneGeometry(1.16, 0.12);
    const barFillMat = new THREE.MeshBasicMaterial({ color: 0x00E5FF, side: THREE.DoubleSide });
    const barFill = new THREE.Mesh(barFillGeo, barFillMat);
    barFill.position.z = 0.01;
    fuelBarGroup.add(barFill);

    lGroup.add(fuelBarGroup);

    lGroup.position.set(l.pos[0], l.pos[1], l.pos[2]);
    lGroup.userData = { core, pLight, lanternId: l.id, fuelBarGroup, barFill, barFillMat };

    scene.add(lGroup);
    lanternMeshes.push(lGroup);
  });
}

function buildMotes() {
  moteMeshes.forEach(m => scene.remove(m));
  moteMeshes = [];

  const geo = new THREE.SphereGeometry(0.18, 12, 12);
  const mat = new THREE.MeshBasicMaterial({ color: 0xFFF6C2 });

  sim.motes.forEach(m => {
    const mesh = new THREE.Mesh(geo, mat);
    const light = new THREE.PointLight(0xFFE58A, 0.8, 3.5);
    mesh.add(light);
    mesh.position.set(m.pos[0], m.pos[1] + 0.6, m.pos[2]);
    mesh.userData = { id: m.id };
    scene.add(mesh);
    moteMeshes.push(mesh);
  });
}

function buildShades() {
  shadeMeshes.forEach(m => scene.remove(m));
  shadeMeshes = [];

  sim.shades.forEach(s => {
    const group = new THREE.Group();

    // Body (#120A1A) with outline glow (#7A3CFF)
    const geo = new THREE.SphereGeometry(0.65, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x120A1A,
      roughness: 0.3,
      metalness: 0.6
    });
    const body = new THREE.Mesh(geo, mat);
    body.position.y = 0.8;
    body.castShadow = true;
    group.add(body);

    const eyeGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xFF5A5F });
    const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
    eye1.position.set(0.22, 0.9, 0.55);
    const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
    eye2.position.set(-0.22, 0.9, 0.55);
    group.add(eye1);
    group.add(eye2);

    group.position.set(s.pos[0], s.pos[1], s.pos[2]);
    group.userData = { id: s.id, eyeMat, body };
    scene.add(group);
    shadeMeshes.push(group);
  });
}

function buildDrifters() {
  drifterMeshes.forEach(m => scene.remove(m));
  drifterMeshes = [];

  sim.drifters.forEach(d => {
    const group = new THREE.Group();
    // Teal ribbon (#8FA3B8)
    const geo = new THREE.TorusGeometry(0.5, 0.08, 8, 24);
    const mat = new THREE.MeshBasicMaterial({ color: 0x8FA3B8 });
    const ribbon = new THREE.Mesh(geo, mat);
    ribbon.position.y = 1.0;
    group.add(ribbon);
    group.position.set(d.pos[0], d.pos[1], d.pos[2]);
    group.userData = { id: d.id, ribbon };
    scene.add(group);
    drifterMeshes.push(group);
  });
}

function buildCharms() {
  charmMeshes.forEach(m => scene.remove(m));
  charmMeshes = [];

  sim.charms.forEach(c => {
    const group = new THREE.Group();
    // Red talisman (#C8102E) with gold border (#F2C14E)
    const geo = new THREE.BoxGeometry(0.5, 0.8, 0.08);
    const mat = new THREE.MeshStandardMaterial({ color: 0xC8102E, emissive: 0x440505 });
    const talisman = new THREE.Mesh(geo, mat);
    talisman.position.y = 0.8;
    group.add(talisman);

    const light = new THREE.PointLight(0xF2C14E, 1.0, 4);
    light.position.y = 0.8;
    group.add(light);

    group.position.set(c.pos[0], c.pos[1], c.pos[2]);
    group.userData = { id: c.id };
    scene.add(group);
    charmMeshes.push(group);
  });
}

// Keybindings configuration (Accessibility)
const defaultKeybindings = {
  moveForward: 'w',
  moveBackward: 's',
  moveLeft: 'a',
  moveRight: 'd',
  jump: ' ',
  dash: 'shift',
  interact: 'e',
  pulse: 'f',
  pause: 'escape'
};
let userKeybindings = Object.assign({}, defaultKeybindings);
let remappingAction = null;

try {
  const savedKeys = localStorage.getItem('dao_den_long_keybinds');
  if (savedKeys) userKeybindings = Object.assign(userKeybindings, JSON.parse(savedKeys));
} catch (e) {}

function onKeyDown(e) {
  window.soundFx.init();
  if (remappingAction) {
    e.preventDefault();
    handleRemapKey(e);
    return;
  }
  const k = e.key.toLowerCase();
  keys[k] = true;

  if (k === ' ' || k === 'space' || k === userKeybindings.jump) latchedKeys.jump = true;
  if (k === 'shift' || k === userKeybindings.dash) latchedKeys.dash = true;
  if (k === 'e' || k === 'enter' || k === userKeybindings.interact) latchedKeys.interact = true;
  if (k === 'f' || k === userKeybindings.pulse) latchedKeys.pulse = true;

  if (k === 'escape' || k === 'p' || k === userKeybindings.pause) {
    togglePauseGame();
  } else if (k === 'r') {
    restartCurrentNight();
  }
}

function onKeyUp(e) {
  keys[e.key.toLowerCase()] = false;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function togglePauseGame() {
  if (!sim) return;
  const modalPause = document.getElementById('modal-pause');
  if (!sim.isPaused) {
    sim.isPaused = true;
    sim.state = "paused";
    modalPause.classList.add('active');
    exitGamePointerLock();
  } else {
    sim.isPaused = false;
    sim.state = "playing";
    modalPause.classList.remove('active');
    requestGamePointerLock();
  }
}

function restartCurrentNight() {
  document.getElementById('modal-won').classList.remove('active');
  document.getElementById('modal-lost').classList.remove('active');
  document.getElementById('modal-pause').classList.remove('active');
  startNightGame();
}

function nextNight() {
  document.getElementById('modal-won').classList.remove('active');
  campaignScore += sim.score;
  if (currentNight < 3) {
    showNightIntro(currentNight + 1);
  } else {
    exitGamePointerLock();
    document.getElementById('dawn-final-score').textContent = campaignScore;
    document.getElementById('modal-dawn').classList.add('active');
  }
}

function restartCampaign() {
  document.getElementById('modal-dawn').classList.remove('active');
  campaignScore = 0;
  showNightIntro(1);
}

function saveSettings() {
  const vol = parseInt(document.getElementById('setting-volume').value, 10) / 100.0;
  mouseSensitivity = parseInt(document.getElementById('setting-sens').value, 10);
  window.soundFx.setVolume(vol);
  localStorage.setItem('dao_den_long_vol', vol);
  localStorage.setItem('dao_den_long_sens', mouseSensitivity);
}

function toggleColorblindSetting() {
  isColorblind = !isColorblind;
  if (isColorblind) {
    document.body.classList.add('colorblind-mode');
  } else {
    document.body.classList.remove('colorblind-mode');
  }
  localStorage.setItem('dao_den_long_colorblind', isColorblind ? 'true' : 'false');
  const el = document.getElementById('setting-colorblind');
  if (el) el.checked = isColorblind;
}

function loadSettings() {
  const savedVol = localStorage.getItem('dao_den_long_vol');
  if (savedVol !== null) {
    const v = parseFloat(savedVol);
    window.soundFx.setVolume(v);
    const el = document.getElementById('setting-volume');
    if (el) el.value = Math.round(v * 100);
  }
  const savedSens = localStorage.getItem('dao_den_long_sens');
  if (savedSens !== null) {
    mouseSensitivity = parseInt(savedSens, 10);
    const el = document.getElementById('setting-sens');
    if (el) el.value = mouseSensitivity;
  }
  const savedCb = localStorage.getItem('dao_den_long_colorblind');
  if (savedCb === 'true') {
    isColorblind = true;
    document.body.classList.add('colorblind-mode');
    const el = document.getElementById('setting-colorblind');
    if (el) el.checked = true;
  }
  const savedRm = localStorage.getItem('dao_den_long_reduced_motion');
  if (savedRm === 'true') {
    document.body.classList.add('reduced-motion');
    const el = document.getElementById('setting-reduced-motion');
    if (el) el.checked = true;
  }
  const savedLt = localStorage.getItem('dao_den_long_large_text');
  if (savedLt === 'true') {
    document.body.classList.add('large-text');
    const el = document.getElementById('setting-large-text');
    if (el) el.checked = true;
  }
  const savedQuality = localStorage.getItem('dao_den_long_quality');
  if (savedQuality) {
    graphicsQuality = savedQuality;
    const el = document.getElementById('setting-quality');
    if (el) el.value = graphicsQuality;
  }
}

function changeQualitySetting() {
  const el = document.getElementById('setting-quality');
  if (el) {
    graphicsQuality = el.value;
    localStorage.setItem('dao_den_long_quality', graphicsQuality);
    applyQualitySetting();
  }
}

function applyQualitySetting() {
  if (!renderer) return;
  if (graphicsQuality === 'low') {
    renderer.setPixelRatio(1.0);
    if (dirLight && dirLight.shadow) {
      dirLight.shadow.mapSize.width = 512;
      dirLight.shadow.mapSize.height = 512;
    }
    if (ambientDust) ambientDust.visible = false;
  } else if (graphicsQuality === 'high') {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    if (dirLight && dirLight.shadow) {
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
    }
    if (ambientDust) ambientDust.visible = true;
  } else {
    // Medium
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    if (dirLight && dirLight.shadow) {
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
    }
    if (ambientDust) ambientDust.visible = true;
  }
}

function toggleReducedMotionSetting() {
  const cb = document.getElementById('setting-reduced-motion');
  const isReduced = cb ? cb.checked : false;
  if (isReduced) {
    document.body.classList.add('reduced-motion');
  } else {
    document.body.classList.remove('reduced-motion');
  }
  localStorage.setItem('dao_den_long_reduced_motion', isReduced ? 'true' : 'false');
}

function toggleLargeTextSetting() {
  const cb = document.getElementById('setting-large-text');
  const isLarge = cb ? cb.checked : false;
  if (isLarge) {
    document.body.classList.add('large-text');
  } else {
    document.body.classList.remove('large-text');
  }
  localStorage.setItem('dao_den_long_large_text', isLarge ? 'true' : 'false');
}

let lastTime = 0;
let accumTime = 0;
const tickDuration = 1000 / 60;

function animate(now) {
  requestAnimationFrame(animate);

  const delta = Math.min(now - lastTime, 100);
  lastTime = now;
  accumTime += delta;

  while (accumTime >= tickDuration) {
    if (sim && sim.state === 'playing') {
      let mx = 0, mz = 0;
      const fwd = userKeybindings.moveForward;
      const back = userKeybindings.moveBackward;
      const left = userKeybindings.moveLeft;
      const right = userKeybindings.moveRight;

      if (keys[fwd] || keys['w'] || keys['arrowup']) mz += 1;
      if (keys[back] || keys['s'] || keys['arrowdown']) mz -= 1;
      if (keys[left] || keys['a'] || keys['arrowleft']) mx += 1;  // A: Sang trái màn hình
      if (keys[right] || keys['d'] || keys['arrowright']) mx -= 1; // D: Sang phải màn hình

      if (keys['q']) camYaw += 0.03;
      if (keys['e'] && fwd !== 'e' && left !== 'e') camYaw -= 0.03;

      const yawDeg = (camYaw * 180 / Math.PI) % 360;

      const frame = {
        move: [mx, mz],
        cam_yaw_deg: yawDeg,
        jump: !!(keys[userKeybindings.jump] || keys[' '] || keys['space'] || latchedKeys.jump),
        dash: !!(keys[userKeybindings.dash] || keys['shift'] || latchedKeys.dash),
        interact: !!(keys[userKeybindings.interact] || keys['e'] || keys['enter'] || latchedKeys.interact),
        pulse: !!(keys[userKeybindings.pulse] || keys['f'] || latchedKeys.pulse)
      };

      latchedKeys.jump = false;
      latchedKeys.dash = false;
      latchedKeys.interact = false;
      latchedKeys.pulse = false;

      sim.applyInputFrame(frame);
      const events = sim.step();

      // Sound & visuals for events
      for (const ev of events) {
        if (ev.name === 'mote_picked') window.soundFx.playMoteChime();
        else if (ev.name === 'deposit' || ev.name === 'refuel') window.soundFx.playDepositChime();
        else if (ev.name === 'lantern_lit') window.soundFx.playLanternLit();
        else if (ev.name === 'lantern_out') window.soundFx.playHit();
        else if (ev.name === 'pulse') {
          window.soundFx.playPulse();
          triggerPulseEffect();
        } else if (ev.name === 'dash') window.soundFx.playDash();
        else if (ev.name === 'player_hit') window.soundFx.playHit();
        else if (ev.name === 'game_over') {
          exitGamePointerLock();
          if (ev.data.result === 'won') {
            window.soundFx.playWon();
            document.getElementById('win-score').textContent = sim.score;
            document.getElementById('win-total-score').textContent = campaignScore + sim.score;
            document.getElementById('modal-won').classList.add('active');
          } else {
            document.getElementById('lost-lanterns').textContent = `${sim.lanterns.filter(l => l.lit).length} / ${sim.lanterns.length}`;
            const reasonDesc = document.getElementById('lost-reason-desc');
            if (reasonDesc) {
              reasonDesc.textContent = (ev.data.reason === 'dawn')
                ? 'Bình minh đã đến nhưng số Đèn Lớn thắp sáng không đủ 60% để giải cứu hòn đảo!'
                : 'Mây đã kiệt sức trước màn sương đêm. Hãy thử lại để bảo vệ hòn đảo!';
            }
            document.getElementById('modal-lost').classList.add('active');
          }
        }
      }

      // Check dynamic mote sync
      if (sim.motes.length > moteMeshes.length) {
        buildMotes();
      }
      if (sim.shades.length > shadeMeshes.length) {
        buildShades();
      }
      if (sim.drifters.length > drifterMeshes.length) {
        buildDrifters();
      }

      updateHUD();
    }
    accumTime -= tickDuration;
  }

  renderVisuals(now * 0.001);
  renderer.render(scene, camera);
}

function triggerPulseEffect() {
  pulseRingMesh.position.set(sim.player.pos[0], sim.player.pos[1] + 0.15, sim.player.pos[2]);
  pulseRingMesh.scale.set(1, 1, 1);
  pulseRingMesh.material.opacity = 0.95;
}

function updateHUD() {
  const litCount = sim.lanterns.filter(l => l.lit).length;
  document.getElementById('hud-lanterns').textContent = `${litCount} / ${sim.lanterns.length}`;
  document.getElementById('hud-score').textContent = sim.score;

  // Timer mm:ss
  const totalSec = Math.ceil(sim.time_left_s);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  const timerEl = document.getElementById('hud-timer');
  timerEl.textContent = timeStr;
  if (totalSec <= 30) {
    timerEl.classList.add('urgent');
    if (totalSec <= 10 && sim.sim_tick % 60 === 0) {
      window.soundFx.playCountdownTick();
    }
  } else {
    timerEl.classList.remove('urgent');
  }

  // Capacity & Dynamic Slots (Phase 3)
  const cap = sim.player.capacity || 10;
  const capText = document.getElementById('motes-capacity-text');
  if (capText) capText.textContent = cap;
  document.getElementById('motes-count-text').textContent = sim.player.carried;

  const slotsContainer = document.getElementById('motes-slots');
  let currentSlots = slotsContainer.querySelectorAll('.slot');
  while (currentSlots.length < cap) {
    const newSlot = document.createElement('div');
    newSlot.className = 'slot';
    slotsContainer.appendChild(newSlot);
    currentSlots = slotsContainer.querySelectorAll('.slot');
  }
  while (currentSlots.length > cap) {
    slotsContainer.removeChild(slotsContainer.lastChild);
    currentSlots = slotsContainer.querySelectorAll('.slot');
  }

  currentSlots.forEach((slot, idx) => {
    if (idx < sim.player.carried) slot.classList.add('filled');
    else slot.classList.remove('filled');
  });

  // Flames
  const flamesIcons = document.querySelectorAll('#hud-flames .flame-icon');
  flamesIcons.forEach((icon, idx) => {
    if (idx < sim.player.flames) icon.classList.remove('lost');
    else icon.classList.add('lost');
  });

  // Cooldown overlays
  const dashPct = Math.min(100, (sim.player.dash_cd_ticks / 90) * 100);
  document.getElementById('cd-dash-overlay').style.height = `${dashPct}%`;

  const pulsePct = Math.min(100, (sim.player.pulse_cd_ticks / 180) * 100);
  document.getElementById('cd-pulse-overlay').style.height = `${pulsePct}%`;

  // Closest lantern tracker: seeks unlit lanterns or lit lanterns with fuel < 30
  let closestDist = Infinity;
  let closestLantern = null;
  for (const l of sim.lanterns) {
    const canReceive = !l.lit || (l.lit && l.fuel_units < 6000);
    if (canReceive) {
      const d = Math.hypot(l.pos[0] - sim.player.pos[0], l.pos[2] - sim.player.pos[2]);
      if (d < closestDist) {
        closestDist = d;
        closestLantern = l;
      }
    }
  }

  const trackerEl = document.getElementById('lantern-tracker');
  const bannerEl = document.getElementById('prompt-banner');
  if (closestLantern) {
    trackerEl.style.display = 'flex';
    document.getElementById('tracker-dist').textContent = `${Math.round(closestDist)}m`;
    const dx = closestLantern.pos[0] - sim.player.pos[0];
    const dz = closestLantern.pos[2] - sim.player.pos[2];
    const targetAngle = Math.atan2(dx, dz);
    const relAngle = targetAngle - camYaw;
    document.getElementById('tracker-arrow').style.transform = `rotate(${(-relAngle * 180 / Math.PI) + 90}deg)`;

    if (closestDist <= sim.tuning.interact_radius && sim.player.carried > 0) {
      if (!closestLantern.lit) {
        const cost = closestLantern.ever_lit ? sim.tuning.relight_cost : sim.tuning.lantern_cost;
        bannerEl.textContent = closestLantern.ever_lit
          ? `E — Thắp lại đèn (${closestLantern.deposited}/${cost})`
          : `E — Nạp ánh sáng (${closestLantern.deposited}/${cost})`;
        bannerEl.classList.remove('urgent');
      } else {
        const fuelVal = Math.round((closestLantern.fuel_units / 60.0) * 10) / 10;
        const needed = Math.ceil((100.0 - fuelVal) / 10.0);
        bannerEl.textContent = `E — Châm dầu (Dầu: ${fuelVal.toFixed(1)}/100, cần ${needed} đom đóm)`;
        if (fuelVal < 30) {
          bannerEl.classList.add('urgent');
        } else {
          bannerEl.classList.remove('urgent');
        }
      }
      bannerEl.classList.add('active');
    } else {
      bannerEl.classList.remove('active');
      bannerEl.classList.remove('urgent');
    }
  } else {
    trackerEl.style.display = 'none';
    bannerEl.classList.remove('active');
    bannerEl.classList.remove('urgent');
  }

  // Atmospheric lighting formula: 0.15 + 0.55 * (lit / total)
  const ratio = litCount / sim.lanterns.length;
  hemiLight.intensity = 0.15 + 0.55 * ratio;
}

function renderVisuals(time) {
  if (mayMesh && sim) {
    mayMesh.position.set(sim.player.pos[0], sim.player.pos[1], sim.player.pos[2]);
    const [mx, mz] = sim.currentInput.move;
    if (Math.hypot(mx, mz) > 0.05) {
      const theta = (sim.currentInput.cam_yaw_deg * Math.PI) / 180.0;
      const angle = Math.atan2(mx * Math.cos(theta) + mz * Math.sin(theta), -mx * Math.sin(theta) + mz * Math.cos(theta));
      mayMesh.rotation.y = angle;
    }

    if (sim.player.invuln_ticks > 0) {
      mayMesh.visible = Math.floor(time * 24) % 2 === 0;
    } else {
      mayMesh.visible = true;
    }
  }

  // Camera Follow
  if (sim) {
    const camX = sim.player.pos[0] - Math.sin(camYaw) * camDist * Math.cos(camPitch);
    const camY = sim.player.pos[1] + Math.sin(camPitch) * camDist + 2.0;
    const camZ = sim.player.pos[2] - Math.cos(camYaw) * camDist * Math.cos(camPitch);
    camera.position.set(camX, camY, camZ);
    camera.lookAt(sim.player.pos[0], sim.player.pos[1] + 1.2, sim.player.pos[2]);
  }

  // Lanterns glow & Fuel bar update (Phase 3)
  lanternMeshes.forEach(mesh => {
    const lData = sim.lanterns.find(item => item.id === mesh.userData.lanternId);
    if (lData) {
      const fuelVal = lData.lit ? (lData.fuel_units / 60.0) : 0;
      const isLowFuel = lData.lit && fuelVal < 30;
      // 1 Hz slow blink for low fuel
      const blinkOn = !isLowFuel || (Math.sin(time * Math.PI * 2) > 0);

      if (lData.lit) {
        mesh.scale.set(1.0, 1.0, 1.0);
        mesh.userData.fuelBarGroup.visible = true;
        const pct = Math.max(0, Math.min(1.0, fuelVal / 100.0));
        mesh.userData.barFill.scale.x = pct;
        mesh.userData.barFill.position.x = -0.58 * (1.0 - pct);

        if (blinkOn) {
          mesh.userData.core.material.color.setHex(0xFFB347);
          mesh.userData.core.material.emissive.setHex(isLowFuel ? (isColorblind ? 0xFFFFFF : 0xFF5A5F) : 0xFFE9B0);
          mesh.userData.pLight.intensity = (isLowFuel ? 1.4 : 2.2) + Math.sin(time * 6) * 0.3;
          mesh.userData.barFillMat.color.setHex(isLowFuel ? (isColorblind ? 0xFFFFFF : 0xFF5A5F) : 0x00E5FF);
        } else {
          mesh.userData.core.material.color.setHex(0x5B5F6E);
          mesh.userData.core.material.emissive.setHex(0x111115);
          mesh.userData.pLight.intensity = 0.2;
          mesh.userData.barFillMat.color.setHex(0x222222);
        }
      } else {
        // Đèn tắt xẹp 20% và giấy có vết rách tối
        mesh.scale.set(1.0, 0.8, 1.0);
        mesh.userData.fuelBarGroup.visible = false;
        mesh.userData.core.material.color.setHex(0x353842);
        mesh.userData.core.material.emissive.setHex(0x0A0A0E);
        mesh.userData.pLight.intensity = 0;
      }

      // Billboard fuel bar towards camera
      mesh.userData.fuelBarGroup.quaternion.copy(camera.quaternion);
    }
  });

  // Motes bobbing
  moteMeshes.forEach((mesh, idx) => {
    const mData = sim.motes.find(item => item.id === mesh.userData.id);
    if (mData && mData.active) {
      mesh.visible = true;
      mesh.position.y = mData.pos[1] + 0.6 + Math.sin(time * 3 + idx * 0.7) * 0.2;
    } else {
      mesh.visible = false;
    }
  });

  // Shades visual update (Colorblind mode + Drain state)
  shadeMeshes.forEach((mesh, idx) => {
    const sData = sim.shades.find(item => item.id === mesh.userData.id);
    if (sData) {
      mesh.position.set(sData.pos[0], sData.pos[1] + 0.7 + Math.sin(time * 4 + idx) * 0.1, sData.pos[2]);
      const eyeColor = isColorblind ? 0x00B3FF : 0xFF5A5F;
      const bodyColor = isColorblind ? 0x003366 : 0x120A1A;

      if (sData.state === 'stunned') {
        mesh.userData.eyeMat.color.setHex(0x3A3450);
        mesh.rotation.y += 0.12;
      } else if (sData.state === 'drain') {
        mesh.userData.eyeMat.color.setHex(eyeColor);
        mesh.userData.body.material.color.setHex(isColorblind ? 0x00B3FF : 0x7A3CFF);
        const tL = sim.lanterns.find(l => l.id === sData.target_lantern_id);
        if (tL) {
          const dx = tL.pos[0] - sData.pos[0];
          const dz = tL.pos[2] - sData.pos[2];
          mesh.rotation.y = Math.atan2(dx, dz);
        }
      } else {
        mesh.userData.eyeMat.color.setHex(eyeColor);
        mesh.userData.body.material.color.setHex(bodyColor);
        const dx = sim.player.pos[0] - sData.pos[0];
        const dz = sim.player.pos[2] - sData.pos[2];
        mesh.rotation.y = Math.atan2(dx, dz);
      }
    }
  });

  // Drifters visual update
  drifterMeshes.forEach(mesh => {
    const dData = sim.drifters.find(item => item.id === mesh.userData.id);
    if (dData && dData.state !== 'removed') {
      mesh.visible = true;
      mesh.position.set(dData.pos[0], dData.pos[1] + 1.2 + Math.sin(time * 5) * 0.25, dData.pos[2]);
      mesh.userData.ribbon.rotation.x += 0.05;
      mesh.userData.ribbon.rotation.y += 0.08;
    } else {
      mesh.visible = false;
    }
  });

  // Charms visual update
  charmMeshes.forEach(mesh => {
    const cData = sim.charms.find(item => item.id === mesh.userData.id);
    if (cData && cData.available) {
      mesh.visible = true;
      mesh.rotation.y += 0.03;
      mesh.position.y = cData.pos[1] + Math.sin(time * 3) * 0.15;
    } else {
      mesh.visible = false;
    }
  });

  // Pulse ring
  if (pulseRingMesh.material.opacity > 0) {
    pulseRingMesh.scale.x += 0.35;
    pulseRingMesh.scale.z += 0.35;
    pulseRingMesh.material.opacity = Math.max(0, pulseRingMesh.material.opacity - 0.045);
  }

  // Sky, clouds, atmosphere animation
  const isReducedMotion = document.body.classList.contains('reduced-motion');
  const animTime = isReducedMotion ? 0 : time;
  if (skyMesh && skyMesh.material && skyMesh.material.uniforms) {
    skyMesh.material.uniforms.time.value = animTime;
  }
  if (cloudMeshA && !isReducedMotion) {
    cloudMeshA.rotation.z = time * 0.005;
  }
  if (cloudPuffs && !isReducedMotion) {
    for (let i = 0; i < cloudPuffs.length; i++) {
      const p = cloudPuffs[i];
      const ang = p.baseAngle + time * p.speed * 0.15;
      p.mesh.position.x = Math.cos(ang) * p.dist;
      p.mesh.position.z = Math.sin(ang) * p.dist;
    }
  }
  if (floatingIslets && !isReducedMotion) {
    for (let i = 0; i < floatingIslets.length; i++) {
      const isl = floatingIslets[i];
      isl.mesh.position.y = isl.baseY + Math.sin(time * 0.6 + isl.ang) * 0.4;
    }
  }
  if (ambientDust && !isReducedMotion && ambientDust.visible) {
    ambientDust.rotation.y = time * 0.015;
  }
}

// ==========================================
// Phase 4: Leaderboard & Accessibility Modal Handlers
// ==========================================

async function openLeaderboardModal() {
  const modal = document.getElementById('modal-leaderboard');
  if (modal) modal.classList.add('active');
  const tbody = document.getElementById('leaderboard-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Đang tải dữ liệu...</td></tr>';
  
  try {
    const res = await fetch('/api/leaderboard');
    if (res.ok) {
      const data = await res.json();
      renderLeaderboardRows(data.entries || []);
      return;
    }
  } catch (err) {}
  
  // Fallback to localStorage
  try {
    const saved = localStorage.getItem('dao_den_long_leaderboard');
    const entries = saved ? JSON.parse(saved) : [];
    renderLeaderboardRows(entries);
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Chưa có dữ liệu kỷ lục.</td></tr>';
  }
}

function renderLeaderboardRows(entries) {
  const tbody = document.getElementById('leaderboard-tbody');
  if (!tbody) return;
  if (!entries || entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #8F94A6;">Chưa có kỷ lục nào. Hãy trở thành người đầu tiên!</td></tr>';
    return;
  }
  tbody.innerHTML = entries.slice(0, 10).map((e, idx) => {
    const medal = idx === 0 ? '🥇 #1' : (idx === 1 ? '🥈 #2' : (idx === 2 ? '🥉 #3' : `#${idx + 1}`));
    const dateStr = e.achieved_at ? e.achieved_at.substring(0, 10) : '—';
    return `<tr>
      <td style="font-weight: bold; color: #F2C14E;">${medal}</td>
      <td>${escapeHtml(e.player_name || 'Mây Vô Danh')}</td>
      <td style="font-weight: bold; color: #00E5FF;">${e.score}</td>
      <td>Đêm ${e.night_reached || 1}</td>
      <td style="font-size: 0.8rem; color: #8F94A6;">${dateStr}</td>
    </tr>`;
  }).join('');
}

function closeLeaderboardModal() {
  const modal = document.getElementById('modal-leaderboard');
  if (modal) modal.classList.remove('active');
}

async function submitScore(nameInputId, msgId, nightNum) {
  const input = document.getElementById(nameInputId);
  const msgEl = document.getElementById(msgId);
  if (!input || !msgEl) return;
  const name = input.value.trim() || 'Mây';
  if (name.length < 2) {
    msgEl.textContent = 'Vui lòng nhập tên từ 2 ký tự trở lên!';
    msgEl.style.color = '#FF5A5F';
    return;
  }
  const scoreVal = (typeof campaignScore !== 'undefined' && campaignScore > 0)
    ? (campaignScore + (sim ? sim.score : 0))
    : (sim ? sim.score : 0);
  const payload = {
    player_name: name,
    score: scoreVal,
    night_reached: nightNum || (sim ? sim.night : 1),
    achieved_at: new Date().toISOString()
  };
  
  try {
    const res = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      msgEl.textContent = '✓ Đã ghi danh thành công vào Bảng Xếp Hạng!';
      msgEl.style.color = '#00FFCC';
      input.disabled = true;
      return;
    }
  } catch (err) {}

  try {
    let list = JSON.parse(localStorage.getItem('dao_den_long_leaderboard') || '[]');
    list.push(payload);
    list.sort((a, b) => b.score - a.score || new Date(a.achieved_at) - new Date(b.achieved_at));
    localStorage.setItem('dao_den_long_leaderboard', JSON.stringify(list.slice(0, 10)));
    msgEl.textContent = '✓ Đã lưu kỷ lục vào máy!';
    msgEl.style.color = '#00FFCC';
    input.disabled = true;
  } catch (e) {
    msgEl.textContent = 'Lỗi lưu điểm!';
    msgEl.style.color = '#FF5A5F';
  }
}

function submitScoreFromWon() { submitScore('won-player-name', 'won-submit-msg', sim ? sim.night : 1); }
function submitScoreFromLost() { submitScore('lost-player-name', 'lost-submit-msg', sim ? sim.night : 1); }
function submitScoreFromDawn() { submitScore('dawn-player-name', 'dawn-submit-msg', 3); }

function openKeybindingsModal() {
  const modal = document.getElementById('modal-keybinds');
  if (modal) modal.classList.add('active');
  updateKeybindButtonsUI();
}

function closeKeybindingsModal() {
  remappingAction = null;
  const warn = document.getElementById('keybind-warning');
  if (warn) warn.style.display = 'none';
  const modal = document.getElementById('modal-keybinds');
  if (modal) modal.classList.remove('active');
}

function updateKeybindButtonsUI() {
  for (const [action, key] of Object.entries(userKeybindings)) {
    const btn = document.getElementById(`keybtn-${action}`);
    if (btn) {
      btn.textContent = key === ' ' ? 'Space' : key.toUpperCase();
      btn.classList.remove('listening');
    }
  }
}

function startRemapping(action) {
  remappingAction = action;
  const warn = document.getElementById('keybind-warning');
  if (warn) {
    warn.style.display = 'block';
    warn.textContent = `Nhấn một phím trên bàn phím để gán cho: ${action}`;
    warn.style.color = '#F2C14E';
  }
  updateKeybindButtonsUI();
  const btn = document.getElementById(`keybtn-${action}`);
  if (btn) {
    btn.textContent = '...nhấn phím...';
    btn.classList.add('listening');
  }
}

function handleRemapKey(e) {
  if (!remappingAction) return;
  const k = e.key.toLowerCase();
  const warn = document.getElementById('keybind-warning');
  
  // Duplicate check
  for (const [act, boundKey] of Object.entries(userKeybindings)) {
    if (act !== remappingAction && boundKey === k) {
      if (warn) {
        warn.textContent = `Phím "${k.toUpperCase()}" đã được gán cho hành động khác! Vui lòng chọn phím khác.`;
        warn.style.color = '#FF5A5F';
      }
      return;
    }
  }
  
  userKeybindings[remappingAction] = k;
  localStorage.setItem('dao_den_long_keybinds', JSON.stringify(userKeybindings));
  if (warn) {
    warn.textContent = `✓ Đã gán phím ${k.toUpperCase()} thành công!`;
    warn.style.color = '#00FFCC';
  }
  remappingAction = null;
  updateKeybindButtonsUI();
}

function resetKeybindingsToDefault() {
  userKeybindings = Object.assign({}, defaultKeybindings);
  localStorage.removeItem('dao_den_long_keybinds');
  const warn = document.getElementById('keybind-warning');
  if (warn) {
    warn.textContent = '✓ Đã khôi phục cài đặt phím mặc định!';
    warn.style.color = '#00FFCC';
  }
  remappingAction = null;
  updateKeybindButtonsUI();
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

window.onload = init;
