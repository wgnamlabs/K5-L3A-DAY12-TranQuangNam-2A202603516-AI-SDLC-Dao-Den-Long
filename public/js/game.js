/**
 * game.js
 * 3D Renderer using Three.js linked directly to GameSimulation core engine.
 */

let scene, camera, renderer;
let sim;
let mayMesh, lanternMeshes = [], moteMeshes = [], shadeMeshes = [];
let pulseRingMesh;
let cloudsParticles;
let hemiLight, dirLight;

// Input tracking for local visual player
const keys = {};
let mouseDrag = false;
let prevMouseX = 0;
let camYaw = 0;
let camPitch = 0.35;
let camDist = 9.0;

function init() {
  const container = document.getElementById('canvas-container');

  // 1. Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0814);
  scene.fog = new THREE.FogExp2(0x0a0814, 0.022);

  // 2. Camera setup
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);

  // 3. Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // 4. Lighting
  hemiLight = new THREE.HemisphereLight(0x2b244d, 0x080710, 0.6);
  scene.add(hemiLight);

  dirLight = new THREE.DirectionalLight(0xffa64d, 0.5);
  dirLight.position.set(20, 40, 20);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 100;
  dirLight.shadow.camera.left = -35;
  dirLight.shadow.camera.right = 35;
  dirLight.shadow.camera.top = 35;
  dirLight.shadow.camera.bottom = -35;
  scene.add(dirLight);

  // 5. Build Environment
  buildIsland();
  buildCloudSea();

  // 6. Build Pulse Shockwave Mesh
  const ringGeo = new THREE.RingGeometry(0.1, 0.4, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffb703,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.0
  });
  pulseRingMesh = new THREE.Mesh(ringGeo, ringMat);
  pulseRingMesh.position.y = 0.1;
  scene.add(pulseRingMesh);

  // 7. Initialize Simulation Core
  startSimulation();

  // 8. Event listeners
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousedown', (e) => {
    mouseDrag = true;
    prevMouseX = e.clientX;
    window.soundFx.init();
  });
  window.addEventListener('mouseup', () => { mouseDrag = false; });
  window.addEventListener('mousemove', (e) => {
    if (mouseDrag) {
      const deltaX = e.clientX - prevMouseX;
      camYaw -= deltaX * 0.006;
      prevMouseX = e.clientX;
    }
  });

  // 9. Start Main Loop
  lastTime = performance.now();
  requestAnimationFrame(animate);
}

function startSimulation() {
  sim = new GameSimulation({
    seed: Math.floor(Math.random() * 100000)
  });

  // Build entities in 3D
  buildCharacter();
  buildLanterns();
  buildMotes();
  buildShades();
  updateHUD();
}

function buildIsland() {
  // Circular Island Ground
  const islandGeo = new THREE.CylinderGeometry(32, 30, 4, 48);
  const islandMat = new THREE.MeshStandardMaterial({
    color: 0x1f2421,
    roughness: 0.85,
    metalness: 0.1
  });
  const islandMesh = new THREE.Mesh(islandGeo, islandMat);
  islandMesh.position.y = -2;
  islandMesh.receiveShadow = true;
  scene.add(islandMesh);

  // Ancient stone ring path
  const pathGeo = new THREE.RingGeometry(20, 24, 48);
  pathGeo.rotateX(-Math.PI / 2);
  const pathMat = new THREE.MeshStandardMaterial({
    color: 0x363842,
    roughness: 0.9,
    side: THREE.DoubleSide
  });
  const pathMesh = new THREE.Mesh(pathGeo, pathMat);
  pathMesh.position.y = 0.02;
  pathMesh.receiveShadow = true;
  scene.add(pathMesh);
}

function buildCloudSea() {
  const count = 300;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 35 + Math.random() * 50;
    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = -4 + (Math.random() - 0.5) * 3;
    positions[i * 3 + 2] = Math.sin(angle) * r;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xd8e2dc,
    size: 4.5,
    transparent: true,
    opacity: 0.35
  });
  cloudsParticles = new THREE.Points(geo, mat);
  scene.add(cloudsParticles);
}

function buildCharacter() {
  if (mayMesh) scene.remove(mayMesh);

  const group = new THREE.Group();

  // Robe body
  const bodyGeo = new THREE.CylinderGeometry(0.3, 0.55, 1.1, 16);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x22333b, roughness: 0.8 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.6;
  body.castShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffcad4, roughness: 0.6 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.35;
  head.castShadow = true;
  group.add(head);

  // Nón lá (Conical Vietnamese hat)
  const hatGeo = new THREE.ConeGeometry(0.75, 0.4, 24);
  const hatMat = new THREE.MeshStandardMaterial({ color: 0xddb892, roughness: 0.9 });
  const hat = new THREE.Mesh(hatGeo, hatMat);
  hat.position.y = 1.62;
  hat.castShadow = true;
  group.add(hat);

  // Cute mini hanging lantern from hat
  const miniLantern = new THREE.Group();
  const lampGeo = new THREE.SphereGeometry(0.12, 12, 12);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
  const lamp = new THREE.Mesh(lampGeo, lampMat);
  miniLantern.add(lamp);

  const miniLight = new THREE.PointLight(0xffa600, 1.2, 5);
  miniLantern.add(miniLight);
  miniLantern.position.set(0.45, 1.3, 0.3);
  group.add(miniLantern);

  mayMesh = group;
  scene.add(mayMesh);
}

function buildLanterns() {
  lanternMeshes.forEach(m => scene.remove(m));
  lanternMeshes = [];

  sim.lanterns.forEach((l) => {
    const lGroup = new THREE.Group();

    // Wooden pillar base
    const baseGeo = new THREE.CylinderGeometry(0.35, 0.55, 2.8, 12);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x4a3b32, roughness: 0.9 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 1.4;
    base.castShadow = true;
    lGroup.add(base);

    // Pagoda roof
    const roofGeo = new THREE.ConeGeometry(1.2, 0.5, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x6b2d2d, roughness: 0.7 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 3.1;
    lGroup.add(roof);

    // Glowing lantern core
    const coreGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.9, 12);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x221100,
      emissive: 0x220800,
      roughness: 0.5
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 2.4;
    lGroup.add(core);

    // Point Light for lit state
    const pLight = new THREE.PointLight(0xff9f1c, 0, 18);
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
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd166 });

  sim.motes.forEach(m => {
    const mesh = new THREE.Mesh(geo, mat);
    const light = new THREE.PointLight(0xffbe0b, 0.8, 3.5);
    mesh.add(light);
    mesh.position.set(m.pos[0], 0.7, m.pos[2]);
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

    // Inky body
    const geo = new THREE.SphereGeometry(0.65, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x120c1f,
      roughness: 0.4,
      metalness: 0.5
    });
    const body = new THREE.Mesh(geo, mat);
    body.position.y = 0.8;
    body.castShadow = true;
    group.add(body);

    // Glowing eyes
    const eyeGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
    eye1.position.set(0.22, 0.9, 0.55);
    const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
    eye2.position.set(-0.22, 0.9, 0.55);
    group.add(eye1);
    group.add(eye2);

    group.position.set(s.pos[0], 0, s.pos[2]);
    group.userData = { id: s.id, eyeMat, body };
    scene.add(group);
    shadeMeshes.push(group);
  });
}

function onKeyDown(e) {
  window.soundFx.init();
  keys[e.key.toLowerCase()] = true;

  if (e.key.toLowerCase() === 'r') {
    restartGame();
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

function restartGame() {
  document.getElementById('modal-won').classList.remove('active');
  document.getElementById('modal-lost').classList.remove('active');
  startSimulation();
}

let lastTime = 0;
let accumTime = 0;
const tickDuration = 1000 / 60; // 16.666 ms

function animate(now) {
  requestAnimationFrame(animate);

  const delta = Math.min(now - lastTime, 100);
  lastTime = now;
  accumTime += delta;

  // Process physics steps
  while (accumTime >= tickDuration) {
    if (sim.state === 'playing') {
      // Gather inputs
      let mx = 0, mz = 0;
      if (keys['w'] || keys['arrowup']) mz += 1;
      if (keys['s'] || keys['arrowdown']) mz -= 1;
      if (keys['a'] || keys['arrowleft']) mx -= 1;
      if (keys['d'] || keys['arrowright']) mx += 1;

      if (keys['q']) camYaw += 0.03;
      if (keys['e']) camYaw -= 0.03;

      const yawDeg = (camYaw * 180 / Math.PI) % 360;

      const frame = {
        move: [mx, mz],
        cam_yaw_deg: yawDeg,
        interact: !!(keys['e'] || keys['f'] || keys['enter']),
        pulse: !!(keys[' '])
      };

      sim.applyInputFrame(frame);
      const events = sim.step();

      // Handle audio and visuals for events
      for (const ev of events) {
        if (ev.name === 'mote_picked') {
          window.soundFx.playMoteChime();
        } else if (ev.name === 'deposit') {
          window.soundFx.playDepositChime();
        } else if (ev.name === 'lantern_lit') {
          window.soundFx.playLanternLit();
          triggerAtmosphereWarmth();
        } else if (ev.name === 'pulse') {
          window.soundFx.playPulse();
          triggerPulseEffect();
        } else if (ev.name === 'player_hit') {
          window.soundFx.playHit();
        } else if (ev.name === 'game_over') {
          if (ev.data.result === 'won') {
            window.soundFx.playWon();
            document.getElementById('win-score').textContent = sim.score;
            document.getElementById('win-time').textContent = Math.round(sim.time_left_s) + 's';
            document.getElementById('modal-won').classList.add('active');
          } else {
            document.getElementById('lost-score').textContent = sim.score;
            document.getElementById('lost-lanterns').textContent = `${sim.lanterns.filter(l => l.lit).length} / 5`;
            document.getElementById('modal-lost').classList.add('active');
          }
        }
      }

      updateHUD();
    }
    accumTime -= tickDuration;
  }

  // Visual interpolation & animations
  renderVisuals(now * 0.001);
  renderer.render(scene, camera);
}

function triggerPulseEffect() {
  pulseRingMesh.position.set(sim.player.pos[0], 0.15, sim.player.pos[2]);
  pulseRingMesh.scale.set(1, 1, 1);
  pulseRingMesh.material.opacity = 0.9;
}

function triggerAtmosphereWarmth() {
  const litCount = sim.lanterns.filter(l => l.lit).length;
  const ratio = litCount / 5.0;
  // Progressively brighten the island
  hemiLight.intensity = 0.6 + ratio * 0.7;
  scene.fog.color.setRGB(0.04 + ratio * 0.08, 0.03 + ratio * 0.05, 0.08 + ratio * 0.03);
}

function updateHUD() {
  const litCount = sim.lanterns.filter(l => l.lit).length;
  document.getElementById('hud-lanterns').textContent = `${litCount} / 5`;
  document.getElementById('hud-motes').textContent = `${sim.player.carried} / ${sim.tuning.carry_capacity}`;
  document.getElementById('hud-score').textContent = sim.score;
  document.getElementById('hud-time').textContent = `${Math.ceil(sim.time_left_s)}s`;

  // Flames
  const flamesContainer = document.getElementById('hud-flames');
  const flameIcons = flamesContainer.querySelectorAll('.flame-icon');
  flameIcons.forEach((icon, idx) => {
    if (idx < sim.player.flames) {
      icon.classList.remove('lost');
    } else {
      icon.classList.add('lost');
    }
  });

  // Check deposit prompt
  let nearLantern = false;
  for (const l of sim.lanterns) {
    if (!l.lit) {
      const dx = l.pos[0] - sim.player.pos[0];
      const dz = l.pos[2] - sim.player.pos[2];
      if (Math.hypot(dx, dz) <= sim.tuning.interact_radius && sim.player.carried > 0) {
        nearLantern = true;
        break;
      }
    }
  }
  const promptBanner = document.getElementById('prompt-banner');
  if (nearLantern) {
    promptBanner.classList.add('active');
  } else {
    promptBanner.classList.remove('active');
  }
}

function renderVisuals(time) {
  // 1. Update Mây position and rotation
  if (mayMesh) {
    mayMesh.position.set(sim.player.pos[0], sim.player.pos[1], sim.player.pos[2]);
    const [mx, mz] = sim.currentInput.move;
    if (Math.hypot(mx, mz) > 0.05) {
      const theta = (sim.currentInput.cam_yaw_deg * Math.PI) / 180.0;
      const angle = Math.atan2(mx * Math.cos(theta) + mz * Math.sin(theta), -mx * Math.sin(theta) + mz * Math.cos(theta));
      mayMesh.rotation.y = angle;
    }

    // Invulnerability blink
    if (sim.player.invuln_timer > 0) {
      mayMesh.visible = Math.floor(time * 20) % 2 === 0;
    } else {
      mayMesh.visible = true;
    }
  }

  // 2. Camera follow
  const camX = sim.player.pos[0] - Math.sin(camYaw) * camDist * Math.cos(camPitch);
  const camY = sim.player.pos[1] + Math.sin(camPitch) * camDist + 2.0;
  const camZ = sim.player.pos[2] - Math.cos(camYaw) * camDist * Math.cos(camPitch);
  camera.position.set(camX, camY, camZ);
  camera.lookAt(sim.player.pos[0], sim.player.pos[1] + 1.2, sim.player.pos[2]);

  // 3. Lanterns visual update
  lanternMeshes.forEach(mesh => {
    const lData = sim.lanterns.find(item => item.id === mesh.userData.lanternId);
    if (lData) {
      if (lData.lit) {
        mesh.userData.core.material.color.setHex(0xffaa00);
        mesh.userData.core.material.emissive.setHex(0xff7700);
        mesh.userData.pLight.intensity = 2.0 + Math.sin(time * 6) * 0.3;
      } else {
        mesh.userData.core.material.color.setHex(0x332211);
        mesh.userData.core.material.emissive.setHex(0x110500);
        mesh.userData.pLight.intensity = 0;
      }
    }
  });

  // 4. Motes visual bobbing
  moteMeshes.forEach((mesh, idx) => {
    const mData = sim.motes.find(item => item.id === mesh.userData.id);
    if (mData && mData.active) {
      mesh.visible = true;
      mesh.position.y = 0.7 + Math.sin(time * 3 + idx * 0.7) * 0.25;
    } else {
      mesh.visible = false;
    }
  });

  // 5. Shades visual update
  shadeMeshes.forEach((mesh, idx) => {
    const sData = sim.shades.find(item => item.id === mesh.userData.id);
    if (sData) {
      mesh.position.set(sData.pos[0], 0.7 + Math.sin(time * 4 + idx) * 0.15, sData.pos[2]);
      if (sData.state === 'stunned') {
        mesh.userData.eyeMat.color.setHex(0x00f5d4); // Cyan swirl when stunned
        mesh.rotation.y += 0.1;
      } else {
        mesh.userData.eyeMat.color.setHex(0xff0055);
        // Face player
        const dx = sim.player.pos[0] - sData.pos[0];
        const dz = sim.player.pos[2] - sData.pos[2];
        mesh.rotation.y = Math.atan2(dx, dz);
      }
    }
  });

  // 6. Pulse shockwave expansion
  if (pulseRingMesh.material.opacity > 0) {
    pulseRingMesh.scale.x += 0.28;
    pulseRingMesh.scale.z += 0.28;
    pulseRingMesh.material.opacity = Math.max(0, pulseRingMesh.material.opacity - 0.04);
  }

  // 7. Cloud rotation
  if (cloudsParticles) {
    cloudsParticles.rotation.y = time * 0.015;
  }
}

window.onload = init;
