/**
 * game.js
 * 3D Renderer using Three.js - Phase 2 Campaign (3 Nights)
 */

let scene, camera, renderer;
let sim;
let currentNight = 1;
let campaignScore = 0;
let mayMesh, lanternMeshes = [], moteMeshes = [], shadeMeshes = [], drifterMeshes = [], charmMeshes = [];
let islandMeshGroup, cloudsParticles, pulseRingMesh;
let hemiLight, dirLight;

// Input & Camera tracking
const keys = {};
const latchedKeys = { jump: false, dash: false, interact: false, pulse: false };
let prevMouseX = null;
let prevMouseY = null;
let camYaw = 0;
let camPitch = 0.35;
let camDist = 9.0;
let mouseSensitivity = 5;

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
  scene.background = new THREE.Color(0x0E1430);
  scene.fog = new THREE.FogExp2(0x1B2350, 0.018);

  // 2. Camera setup
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 600);

  // 3. Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // 4. Lighting
  hemiLight = new THREE.HemisphereLight(0x1B2350, 0x0E1430, 0.45);
  scene.add(hemiLight);

  dirLight = new THREE.DirectionalLight(0xFFB347, 0.6);
  dirLight.position.set(25, 45, 25);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  scene.add(dirLight);

  // 5. Cloud Sea
  buildCloudSea();

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

function buildCloudSea() {
  const count = 400;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 45 + Math.random() * 60;
    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = -5 + (Math.random() - 0.5) * 4;
    positions[i * 3 + 2] = Math.sin(angle) * r;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x12384A,
    size: 5.5,
    transparent: true,
    opacity: 0.45
  });
  cloudsParticles = new THREE.Points(geo, mat);
  scene.add(cloudsParticles);
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

    lGroup.position.set(l.pos[0], l.pos[1], l.pos[2]);
    lGroup.userData = { core, pLight, lanternId: l.id };

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

function onKeyDown(e) {
  window.soundFx.init();
  const k = e.key.toLowerCase();
  keys[k] = true;

  if (k === ' ' || k === 'space') latchedKeys.jump = true;
  if (k === 'shift') latchedKeys.dash = true;
  if (k === 'e' || k === 'enter') latchedKeys.interact = true;
  if (k === 'f') latchedKeys.pulse = true;

  if (k === 'escape' || k === 'p') {
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
      if (keys['w'] || keys['arrowup']) mz += 1;
      if (keys['s'] || keys['arrowdown']) mz -= 1;
      if (keys['a'] || keys['arrowleft']) mx += 1;  // A: Sang trái màn hình
      if (keys['d'] || keys['arrowright']) mx -= 1; // D: Sang phải màn hình

      if (keys['q']) camYaw += 0.03;
      if (keys['e']) camYaw -= 0.03;

      const yawDeg = (camYaw * 180 / Math.PI) % 360;

      const frame = {
        move: [mx, mz],
        cam_yaw_deg: yawDeg,
        jump: !!(keys[' '] || keys['space'] || latchedKeys.jump),
        dash: !!(keys['shift'] || latchedKeys.dash),
        interact: !!(keys['e'] || keys['enter'] || latchedKeys.interact),
        pulse: !!(keys['f'] || latchedKeys.pulse)
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
        else if (ev.name === 'deposit') window.soundFx.playDepositChime();
        else if (ev.name === 'lantern_lit') window.soundFx.playLanternLit();
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

  // 10-Slot Inventory
  document.getElementById('motes-count-text').textContent = sim.player.carried;
  const slots = document.querySelectorAll('#motes-slots .slot');
  slots.forEach((slot, idx) => {
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

  // Closest unlit lantern tracker
  let closestDist = Infinity;
  let closestLantern = null;
  for (const l of sim.lanterns) {
    if (!l.lit) {
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
      bannerEl.textContent = `E — Nạp ánh sáng (${closestLantern.deposited}/10)`;
      bannerEl.classList.add('active');
    } else {
      bannerEl.classList.remove('active');
    }
  } else {
    trackerEl.style.display = 'none';
    bannerEl.classList.remove('active');
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

  // Lanterns glow
  lanternMeshes.forEach(mesh => {
    const lData = sim.lanterns.find(item => item.id === mesh.userData.lanternId);
    if (lData) {
      if (lData.lit) {
        mesh.userData.core.material.color.setHex(0xFFB347);
        mesh.userData.core.material.emissive.setHex(0xFFE9B0);
        mesh.userData.pLight.intensity = 2.2 + Math.sin(time * 6) * 0.3;
      } else {
        mesh.userData.core.material.color.setHex(0x5B5F6E);
        mesh.userData.core.material.emissive.setHex(0x111115);
        mesh.userData.pLight.intensity = 0;
      }
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

  // Shades visual update
  shadeMeshes.forEach((mesh, idx) => {
    const sData = sim.shades.find(item => item.id === mesh.userData.id);
    if (sData) {
      mesh.position.set(sData.pos[0], sData.pos[1] + 0.7 + Math.sin(time * 4 + idx) * 0.1, sData.pos[2]);
      if (sData.state === 'stunned') {
        mesh.userData.eyeMat.color.setHex(0x3A3450); // Stunned color
        mesh.rotation.y += 0.12;
      } else {
        mesh.userData.eyeMat.color.setHex(0xFF5A5F);
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

  // Cloud rotation
  if (cloudsParticles) cloudsParticles.rotation.y = time * 0.01;
}

window.onload = init;
