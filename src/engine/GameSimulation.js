/**
 * GameSimulation.js
 * Single source of truth for "Đảo Đèn Lồng" - Contract v1.2 (Phase 3)
 * Deterministic 60 tick/s simulation for 3 Nights (Đảo Bến, Đảo Cau, Đảo Chuông).
 */

function createMulberry32(seed) {
  let s = (seed >>> 0) || 1;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round1(n) {
  if (n === null || n === undefined) return 0;
  return Math.round(n * 10) / 10;
}

function round3(n) {
  if (n === null || n === undefined) return 0;
  return Math.round(n * 1000) / 1000;
}

function roundPos(p) {
  return [round3(p[0]), round3(p[1]), round3(p[2])];
}

function distXZ(p1, p2) {
  const dx = p1[0] - p2[0];
  const dz = p1[2] - p2[2];
  return Math.sqrt(dx * dx + dz * dz);
}

function dist3D(p1, p2) {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  const dz = p1[2] - p2[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

class GameSimulation {
  constructor(options = {}) {
    this.seed = options.seed !== undefined ? options.seed : 42;
    this.rng = createMulberry32(this.seed);
    this.night = options.night !== undefined ? options.night : 1;

    // Standard Contract v1.2 Tuning
    this.tuning = Object.assign({
      player_speed: 6.0,
      dash_speed: 14.0,
      dash_duration_s: 0.2,
      dash_cooldown_s: 1.5,
      carry_capacity: 10,
      capacity_max: 20,
      lantern_cost: 10,
      relight_cost: 5,
      lantern_count_night1: 5,
      pickup_radius: 1.0,
      interact_radius: 2.0,
      pulse_cost: 3,
      pulse_radius: 5.0,
      pulse_cooldown_s: 3.0,
      pulse_stun_s: 2.0,
      pulse_push_m: 4.0,
      night1_duration_s: 240,
      night2_duration_s: 270,
      night3_duration_s: 300,
      flames: 3,
      invuln_s: 1.5,
      hit_drop_ratio: 0.5,
      safe_radius: 6.0,
      shade_speed: 4.0,
      shade_speed_night3: 4.5,
      shade_hit_radius: 1.0,
      fall_enabled: true,
      fuel_max: 100,
      fuel_decay_per_s: 1.0,
      fuel_per_mote: 10,
      win_ratio: 0.6,
      drain_per_s: 5,
      low_fuel_threshold: 30,
      score: {
        per_mote: 5,
        light_first: 100,
        relight: 40,
        per_stun: 5,
        per_stun_drain: 15,
        per_lantern_dawn: 50,
        per_flame_dawn: 50
      }
    }, options.tuning || {});

    if (options.tuning && options.tuning.score) {
      this.tuning.score = Object.assign({
        per_mote: 5,
        light_first: 100,
        relight: 40,
        per_stun: 5,
        per_stun_drain: 15,
        per_lantern_dawn: 50,
        per_flame_dawn: 50
      }, options.tuning.score);
    }

    this.dt = 1.0 / 60.0;
    this.tick = 0;
    this.sim_tick = 0;
    this.state = "playing"; // "playing" | "paused" | "won" | "lost"
    this.isPaused = false;
    this.score = 0;

    const durations = {
      1: this.tuning.night1_duration_s,
      2: this.tuning.night2_duration_s,
      3: this.tuning.night3_duration_s
    };
    this.duration_s = durations[this.night] || 240;
    this.time_left_s = this.duration_s;

    this.wind = { active: false, dir_deg: 0, timer_ticks: 0, duration_ticks: 0 };
    this.wind_enabled = options.scenario && options.scenario.wind_enabled !== undefined
      ? !!options.scenario.wind_enabled
      : (this.night === 3);

    // Player State
    this.player = {
      pos: [0, 0, 0],
      vel: [0, 0, 0],
      grounded: true,
      flames: this.tuning.flames,
      carried: 0,
      capacity: this.tuning.carry_capacity,
      successful_lights: 0,
      invuln_ticks: 0,
      dash_cd_ticks: 0,
      dash_active_ticks: 0,
      dash_dir: [0, 1],
      pulse_cd_ticks: 0,
      charm_ticks: 0,
      launching: false,
      falling: false,
      fall_wait_ticks: 0
    };

    // Entities
    this.lanterns = [];
    this.motes = [];
    this.shades = [];
    this.drifters = [];
    this.charms = [];
    this.events = [];
    this.spawnPoints = { motes: [], shades: [] };

    // Persistent input
    this.currentInput = {
      move: [0, 0],
      cam_yaw_deg: 0,
      jump: false,
      interact: false,
      pulse: false,
      dash: false,
      pause: false
    };
    this.prevInput = Object.assign({}, this.currentInput);

    this.initMap(this.night);
    this.setupScenario(options.scenario);
  }

  initMap(night) {
    if (night === 1) {
      // Night 1: Đảo Bến (r = 40m)
      this.lanterns = [
        { id: "L1", pos: [0, 0, 25], lit: false, deposited: 0, fuel_units: 0, ever_lit: false, relit_count: 0, push_ticks: 0 },
        { id: "L2", pos: [23.8, 0, 7.7], lit: false, deposited: 0, fuel_units: 0, ever_lit: false, relit_count: 0, push_ticks: 0 },
        { id: "L3", pos: [14.7, 0, -20.2], lit: false, deposited: 0, fuel_units: 0, ever_lit: false, relit_count: 0, push_ticks: 0 },
        { id: "L4", pos: [-14.7, 0, -20.2], lit: false, deposited: 0, fuel_units: 0, ever_lit: false, relit_count: 0, push_ticks: 0 },
        { id: "L5", pos: [-23.8, 0, 7.7], lit: false, deposited: 0, fuel_units: 0, ever_lit: false, relit_count: 0, push_ticks: 0 }
      ];

      // Mote spawn points: 8 on r=12m (every 45°), 16 on r=33m (every 22.5°)
      this.spawnPoints.motes = [];
      for (let i = 0; i < 8; i++) {
        const phi = i * (Math.PI / 4);
        this.spawnPoints.motes.push([12 * Math.cos(phi), 0, 12 * Math.sin(phi)]);
      }
      for (let i = 0; i < 16; i++) {
        const phi = i * (Math.PI / 8);
        this.spawnPoints.motes.push([33 * Math.cos(phi), 0, 33 * Math.sin(phi)]);
      }

      // Shade spawn points: 12 on r=37m (15°, 45°, ...)
      this.spawnPoints.shades = [];
      for (let i = 0; i < 12; i++) {
        const phi = ((15 + i * 30) * Math.PI) / 180;
        this.spawnPoints.shades.push([37 * Math.cos(phi), 0, 37 * Math.sin(phi)]);
      }
    } else if (night === 2) {
      // Night 2: Đảo Cau
      this.lanterns = [
        { id: "L1", pos: [0, 0, 20], lit: false, deposited: 0, fuel_units: 0, ever_lit: false, relit_count: 0, push_ticks: 0 },
        { id: "L2", pos: [17, 0, -10], lit: false, deposited: 0, fuel_units: 0, ever_lit: false, relit_count: 0, push_ticks: 0 },
        { id: "L3", pos: [-17, 0, -10], lit: false, deposited: 0, fuel_units: 0, ever_lit: false, relit_count: 0, push_ticks: 0 },
        { id: "L4", pos: [70, 0, 20], lit: false, deposited: 0, fuel_units: 0, ever_lit: false, relit_count: 0, push_ticks: 0 },
        { id: "L5", pos: [87, 0, -10], lit: false, deposited: 0, fuel_units: 0, ever_lit: false, relit_count: 0, push_ticks: 0 },
        { id: "L6", pos: [53, 0, -10], lit: false, deposited: 0, fuel_units: 0, ever_lit: false, relit_count: 0, push_ticks: 0 }
      ];

      this.spawnPoints.motes = [];
      for (let i = 0; i < 4; i++) {
        const phi = i * (Math.PI / 2);
        this.spawnPoints.motes.push([10 * Math.cos(phi), 0, 10 * Math.sin(phi)]);
      }
      for (let i = 0; i < 8; i++) {
        const phi = i * (Math.PI / 4);
        this.spawnPoints.motes.push([22 * Math.cos(phi), 0, 22 * Math.sin(phi)]);
      }
      for (let i = 0; i < 4; i++) {
        const phi = i * (Math.PI / 2);
        this.spawnPoints.motes.push([70 + 10 * Math.cos(phi), 0, 10 * Math.sin(phi)]);
      }
      for (let i = 0; i < 8; i++) {
        const phi = i * (Math.PI / 4);
        this.spawnPoints.motes.push([70 + 22 * Math.cos(phi), 0, 22 * Math.sin(phi)]);
      }

      this.spawnPoints.shades = [];
      for (let i = 0; i < 8; i++) {
        const phi = ((22.5 + i * 45) * Math.PI) / 180;
        this.spawnPoints.shades.push([26 * Math.cos(phi), 0, 26 * Math.sin(phi)]);
        this.spawnPoints.shades.push([70 + 26 * Math.cos(phi), 0, 26 * Math.sin(phi)]);
      }

      this.charms = [{ id: "C1", pos: [35, 0, 0], available: true, respawn_ticks: 0 }];
    } else if (night === 3) {
      // Night 3: Đảo Chuông
      this.lanterns = [
        { id: "L1", pos: [0, 6, 6], lit: false, deposited: 0, fuel_units: 0, ever_lit: false, relit_count: 0, push_ticks: 0 },
        { id: "L2", pos: [18, 3, 10], lit: false, deposited: 0, fuel_units: 0, ever_lit: false, relit_count: 0, push_ticks: 0 },
        { id: "L3", pos: [-18, 3, 10], lit: false, deposited: 0, fuel_units: 0, ever_lit: false, relit_count: 0, push_ticks: 0 },
        { id: "L4", pos: [35, 0, -10], lit: false, deposited: 0, fuel_units: 0, ever_lit: false, relit_count: 0, push_ticks: 0 },
        { id: "L5", pos: [-35, 0, -10], lit: false, deposited: 0, fuel_units: 0, ever_lit: false, relit_count: 0, push_ticks: 0 },
        { id: "L6", pos: [20, 0, -35], lit: false, deposited: 0, fuel_units: 0, ever_lit: false, relit_count: 0, push_ticks: 0 },
        { id: "L7", pos: [-20, 0, -35], lit: false, deposited: 0, fuel_units: 0, ever_lit: false, relit_count: 0, push_ticks: 0 }
      ];

      this.spawnPoints.motes = [];
      for (let i = 0; i < 18; i++) {
        const phi = (i * 20 * Math.PI) / 180;
        this.spawnPoints.motes.push([34 * Math.cos(phi), 0, 34 * Math.sin(phi)]);
      }
      for (let i = 0; i < 8; i++) {
        const phi = ((20 + i * 20) * Math.PI) / 180;
        this.spawnPoints.motes.push([18 * Math.cos(phi), 3, 18 * Math.sin(phi)]);
      }
      for (let i = 0; i < 4; i++) {
        const phi = ((45 + i * 90) * Math.PI) / 180;
        this.spawnPoints.motes.push([5 * Math.cos(phi), 6, 5 * Math.sin(phi)]);
      }

      this.spawnPoints.shades = [];
      for (let i = 0; i < 16; i++) {
        const phi = (i * 22.5 * Math.PI) / 180;
        this.spawnPoints.shades.push([43 * Math.cos(phi), 0, 43 * Math.sin(phi)]);
      }

      this.charms = [
        { id: "C1", pos: [30, 0, 25], available: true, respawn_ticks: 0 },
        { id: "C2", pos: [-30, 0, 25], available: true, respawn_ticks: 0 }
      ];
    }
  }

  getGroundHeight(x, z) {
    if (this.night === 1) {
      if (Math.hypot(x, z) <= 40.0) return 0.0;
      return -Infinity;
    } else if (this.night === 2) {
      if (Math.hypot(x, z) <= 28.0) return 0.0;
      if (Math.hypot(x - 70.0, z) <= 28.0) return 0.0;
      if (x >= 26.0 && x <= 44.0 && z >= -2.0 && z <= 2.0) return 0.0;
      return -Infinity;
    } else if (this.night === 3) {
      const r = Math.hypot(x, z);
      if (r > 45.0) return -Infinity;
      if (r <= 2.0) return 14.0;
      if (r <= 8.0) return 6.0;
      if (r >= 24.0 && r <= 30.0) {
        const angle = (Math.atan2(z, x) * 180 / Math.PI + 360) % 360;
        const diff30 = Math.abs(angle - 30);
        const diff150 = Math.abs(angle - 150);
        if (diff30 <= 3.5 || diff150 <= 3.5) {
          return 3.0 * (30.0 - r) / 6.0;
        }
      }
      if (r >= 12.0 && r <= 24.0 && z > 0) return 3.0;
      return 0.0;
    }
    return 0.0;
  }

  setupScenario(scenario = {}) {
    scenario = scenario || {};

    if (scenario.player) {
      if (scenario.player.pos) this.player.pos = [...scenario.player.pos];
      if (scenario.player.vel) this.player.vel = [...scenario.player.vel];
      if (scenario.player.carried !== undefined) this.player.carried = scenario.player.carried;
      if (scenario.player.flames !== undefined) this.player.flames = scenario.player.flames;
      if (scenario.player.invuln_ticks !== undefined) this.player.invuln_ticks = scenario.player.invuln_ticks;
      if (scenario.player.dash_cd_ticks !== undefined) this.player.dash_cd_ticks = scenario.player.dash_cd_ticks;
      if (scenario.player.pulse_cd_ticks !== undefined) this.player.pulse_cd_ticks = scenario.player.pulse_cd_ticks;
      if (scenario.player.charm_ticks !== undefined) this.player.charm_ticks = scenario.player.charm_ticks;
      if (scenario.player.successful_lights !== undefined) {
        this.player.successful_lights = scenario.player.successful_lights;
        this.player.capacity = Math.min(this.tuning.capacity_max, 10 + 2 * this.player.successful_lights);
      }
      if (scenario.player.capacity !== undefined) {
        this.player.capacity = scenario.player.capacity;
      }
    }

    if (scenario.time_left_s !== undefined) {
      this.time_left_s = scenario.time_left_s;
      this.duration_s = scenario.time_left_s;
    }

    if (Array.isArray(scenario.lanterns)) {
      for (const lData of scenario.lanterns) {
        let l = this.lanterns.find(item => item.id === lData.id);
        if (!l) {
          l = { id: lData.id, pos: [0, 0, 0], lit: false, deposited: 0, fuel_units: 0, ever_lit: false, relit_count: 0, push_ticks: 0 };
          this.lanterns.push(l);
        }
        if (lData.pos) l.pos = [...lData.pos];
        if (lData.lit !== undefined) l.lit = !!lData.lit;
        if (l.lit) {
          l.fuel_units = lData.fuel !== undefined ? Math.round(lData.fuel * 60) : 6000;
          l.ever_lit = lData.ever_lit !== undefined ? !!lData.ever_lit : true;
        } else {
          l.fuel_units = 0;
          l.ever_lit = lData.ever_lit !== undefined ? !!lData.ever_lit : false;
        }
        if (lData.deposited !== undefined) l.deposited = lData.deposited;
        if (lData.relit_count !== undefined) l.relit_count = lData.relit_count;
      }
    }

    if (scenario.motes !== undefined) {
      this.motes = [];
      scenario.motes.forEach((mPos, idx) => {
        this.motes.push({
          id: `M${idx + 1}`,
          pos: [mPos[0], mPos[1] || 0, mPos[2]],
          active: true,
          kind: "random",
          ttl_ticks: null
        });
      });
    } else if (scenario.random_motes !== false) {
      this.motes = [];
      const pts = [...this.spawnPoints.motes];
      const count = Math.min(20, pts.length);
      for (let i = 0; i < count; i++) {
        this.motes.push({
          id: `M${i + 1}`,
          pos: [...pts[i]],
          active: true,
          kind: "random",
          ttl_ticks: null
        });
      }
    }

    if (scenario.shades !== undefined) {
      this.shades = [];
      scenario.shades.forEach((sData, idx) => {
        this.shades.push({
          id: sData.id || `S${idx + 1}`,
          pos: [...sData.pos],
          state: sData.state || "wander",
          state_ticks_left: sData.state_ticks_left || 0,
          push_vec: [0, 0],
          push_ticks_left: 0,
          target_lantern_id: sData.target_lantern_id || null,
          drain_ticks: sData.drain_ticks || 0
        });
      });
    } else if (scenario.random_shades !== false) {
      this.shades = [];
    }

    if (scenario.drifters !== undefined) {
      this.drifters = [];
      scenario.drifters.forEach((dData, idx) => {
        this.drifters.push({
          id: dData.id || `D${idx + 1}`,
          pos: [...dData.pos],
          state: dData.state || "idle",
          stolen: dData.stolen || 0,
          flee_ticks_left: dData.flee_ticks_left || 0
        });
      });
    }

    if (scenario.charms !== undefined) {
      this.charms = [];
      scenario.charms.forEach((cData) => {
        this.charms.push({
          id: cData.id,
          pos: cData.pos || [0, 0, 0],
          available: cData.available !== undefined ? !!cData.available : true,
          respawn_ticks: cData.respawn_ticks || 0
        });
      });
    }
  }

  applyInputFrame(frame) {
    if (!frame) return;
    if (frame.move) this.currentInput.move = [...frame.move];
    if (frame.cam_yaw_deg !== undefined) this.currentInput.cam_yaw_deg = frame.cam_yaw_deg;
    if (frame.jump !== undefined) this.currentInput.jump = !!frame.jump;
    if (frame.interact !== undefined) this.currentInput.interact = !!frame.interact;
    if (frame.pulse !== undefined) this.currentInput.pulse = !!frame.pulse;
    if (frame.dash !== undefined) this.currentInput.dash = !!frame.dash;
    if (frame.pause !== undefined) this.currentInput.pause = !!frame.pause;
  }

  step() {
    const k = this.tick;
    const nextTick = k + 1;
    const stepEvents = [];

    // 1. Read input & handle pause
    const pauseTriggered = this.currentInput.pause && !this.prevInput.pause;
    if (pauseTriggered) {
      this.isPaused = !this.isPaused;
      if (this.isPaused) {
        this.state = "paused";
        const ev = { type: "event", tick: nextTick, name: "paused", data: {} };
        stepEvents.push(ev);
        this.events.push(ev);
        this.tick = nextTick;
        this.prevInput = Object.assign({}, this.currentInput);
        return stepEvents;
      } else {
        this.state = "playing";
        const ev = { type: "event", tick: nextTick, name: "resumed", data: {} };
        stepEvents.push(ev);
        this.events.push(ev);
      }
    }

    if (this.isPaused) {
      this.tick = nextTick;
      this.prevInput = Object.assign({}, this.currentInput);
      return stepEvents;
    }

    if (this.state !== "playing") return [];

    // 2. Decrement counters
    this.time_left_s = Math.max(0, this.duration_s - (this.sim_tick + 1) / 60.0);
    if (this.player.dash_cd_ticks > 0) this.player.dash_cd_ticks--;
    if (this.player.pulse_cd_ticks > 0) this.player.pulse_cd_ticks--;
    if (this.player.invuln_ticks > 0) this.player.invuln_ticks--;
    if (this.player.charm_ticks > 0) this.player.charm_ticks--;

    // TTL of dropped motes
    for (const m of this.motes) {
      if (m.active && m.kind === "dropped" && m.ttl_ticks !== null) {
        m.ttl_ticks--;
        if (m.ttl_ticks <= 0) m.active = false;
      }
    }

    // Charms respawn
    for (const c of this.charms) {
      if (!c.available) {
        c.respawn_ticks--;
        if (c.respawn_ticks <= 0) c.available = true;
      }
    }

    // Wind updates
    if (this.wind_enabled) {
      const cycleTick = (this.sim_tick + 1) % 1800; // 30s
      if (cycleTick === 1680) { // 2s before wind (warning)
        this.wind.warning = true;
      }
      if (cycleTick >= 0 && cycleTick < 300) { // 5s wind
        this.wind.active = true;
        if (cycleTick === 0) {
          this.wind.dir_deg = Math.floor(this.rng() * 360);
        }
      } else {
        this.wind.active = false;
        this.wind.warning = false;
      }
    }

    // Step 2 (Contract v1.2): Trừ dầu (hao hụt + bị hút)
    const shadesSortedById = [...this.shades].sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true })
    );

    for (const l of this.lanterns) {
      if (l.lit) {
        let decayUnits = 1; // 1.0 fuel/s = 1 unit per tick
        let drainUnits = 0;

        for (const s of shadesSortedById) {
          if (s.state === 'drain' && s.target_lantern_id === l.id) {
            drainUnits += 5; // 5.0 fuel/s = 5 units per tick
            s.drain_ticks = (s.drain_ticks || 0) + 1;
          }
        }

        l.fuel_units = Math.max(0, l.fuel_units - (decayUnits + drainUnits));

        // Emit fuel_drain every 60 ticks while draining
        for (const s of shadesSortedById) {
          if (s.state === 'drain' && s.target_lantern_id === l.id) {
            if (s.drain_ticks % 60 === 0) {
              const drainEv = {
                type: "event",
                tick: nextTick,
                name: "fuel_drain",
                data: {
                  lantern_id: l.id,
                  shade_id: s.id,
                  fuel: round1(l.fuel_units / 60.0)
                }
              };
              stepEvents.push(drainEv);
              this.events.push(drainEv);
            }
          }
        }
      }
    }

    // Ngay sau bước 2: Đèn có fuel <= 0 tắt
    for (const l of this.lanterns) {
      if (l.lit && l.fuel_units <= 0) {
        l.lit = false;
        l.fuel_units = 0;
        l.deposited = 0;
        l.ever_lit = true;
        const outEv = {
          type: "event",
          tick: nextTick,
          name: "lantern_out",
          data: { lantern_id: l.id }
        };
        stepEvents.push(outEv);
        this.events.push(outEv);

        // Any shades in drain at this lantern switch to wander
        for (const s of this.shades) {
          if (s.state === 'drain' && s.target_lantern_id === l.id) {
            s.state = 'wander';
            s.drain_ticks = 0;
          }
        }
      }
    }

    // 3. Move Mây (jump, dash, launch pads, wind) & check fall
    if (this.player.falling) {
      this.player.fall_wait_ticks--;
      if (this.player.fall_wait_ticks <= 0) {
        this.player.falling = false;
        this.player.pos = [0, 0, 0];
        this.player.vel = [0, 0, 0];
        this.player.grounded = true;
        this.player.invuln_ticks = 90;
      }
    } else {
      const jumpTriggered = this.currentInput.jump && !this.prevInput.jump;
      const dashTriggered = this.currentInput.dash && !this.prevInput.dash;

      // Dash trigger
      if (dashTriggered && this.player.dash_cd_ticks <= 0 && this.player.dash_active_ticks <= 0) {
        this.player.dash_active_ticks = 12; // 0.2s * 60
        this.player.dash_cd_ticks = this.player.charm_ticks > 0 ? 0 : 90; // 1.5s
        const [mx, mz] = this.currentInput.move;
        if (Math.hypot(mx, mz) > 0.05) {
          const theta = (this.currentInput.cam_yaw_deg * Math.PI) / 180.0;
          let len = Math.hypot(mx, mz);
          let nx = mx / len, nz = mz / len;
          this.player.dash_dir = [nx * Math.cos(theta) + nz * Math.sin(theta), -nx * Math.sin(theta) + nz * Math.cos(theta)];
        } else {
          const theta = (this.currentInput.cam_yaw_deg * Math.PI) / 180.0;
          this.player.dash_dir = [Math.sin(theta), Math.cos(theta)];
        }
        const dashEv = { type: "event", tick: nextTick, name: "dash", data: {} };
        stepEvents.push(dashEv);
        this.events.push(dashEv);
      }

      if (this.player.dash_active_ticks > 0) {
        this.player.dash_active_ticks--;
        this.player.vel[0] = this.player.dash_dir[0] * this.tuning.dash_speed;
        this.player.vel[2] = this.player.dash_dir[1] * this.tuning.dash_speed;
        this.player.vel[1] = 0; // Hold airborne height
      } else if (this.player.launching) {
        this.player.vel[1] -= 20.0 * this.dt; // gravity
      } else {
        const speed = this.player.charm_ticks > 0 ? 7.2 : this.tuning.player_speed;
        const [mx, mz] = this.currentInput.move;
        let len = Math.hypot(mx, mz);
        let normX = len > 1.0 ? mx / len : mx;
        let normZ = len > 1.0 ? mz / len : mz;
        const theta = (this.currentInput.cam_yaw_deg * Math.PI) / 180.0;
        this.player.vel[0] = (normX * Math.cos(theta) + normZ * Math.sin(theta)) * speed;
        this.player.vel[2] = (-normX * Math.sin(theta) + normZ * Math.cos(theta)) * speed;

        // Wind influence
        if (this.wind.active) {
          const wRad = (this.wind.dir_deg * Math.PI) / 180.0;
          this.player.vel[0] += Math.cos(wRad) * 2.0;
          this.player.vel[2] += Math.sin(wRad) * 2.0;
        }

        // Jump
        if (jumpTriggered && this.player.grounded) {
          this.player.vel[1] = 7.0;
          this.player.grounded = false;
        } else if (!this.player.grounded) {
          this.player.vel[1] -= 20.0 * this.dt;
        }
      }

      // Apply velocity
      this.player.pos[0] += this.player.vel[0] * this.dt;
      this.player.pos[1] += this.player.vel[1] * this.dt;
      this.player.pos[2] += this.player.vel[2] * this.dt;

      // Ground collision
      const gHeight = this.getGroundHeight(this.player.pos[0], this.player.pos[2]);
      if (this.player.pos[1] <= gHeight) {
        this.player.pos[1] = gHeight;
        this.player.vel[1] = 0;
        this.player.grounded = true;
        this.player.launching = false;
      } else {
        this.player.grounded = false;
      }

      // Launch Pad collision (Night 2 and Night 3)
      if (this.night === 2 && this.player.grounded) {
        if (distXZ(this.player.pos, [20, 0, 18]) <= 1.0) {
          const hLen = Math.hypot(50, -18);
          this.player.vel[0] = 24.0 * (50 / hLen);
          this.player.vel[2] = 24.0 * (-18 / hLen);
          this.player.vel[1] = 14.0;
          this.player.grounded = false;
          this.player.launching = true;
        } else if (distXZ(this.player.pos, [50, 0, -18]) <= 1.0) {
          const hLen = Math.hypot(-50, 18);
          this.player.vel[0] = 24.0 * (-50 / hLen);
          this.player.vel[2] = 24.0 * (18 / hLen);
          this.player.vel[1] = 14.0;
          this.player.grounded = false;
          this.player.launching = true;
        }
      } else if (this.night === 3 && this.player.grounded) {
        if (distXZ(this.player.pos, [0, 3, 13]) <= 1.0) {
          this.player.vel[0] = 0;
          this.player.vel[2] = -8.0;
          this.player.vel[1] = 12.0;
          this.player.grounded = false;
          this.player.launching = true;
        }
      }

      // Check fall off island
      if (this.player.pos[1] < -10.0) {
        this.player.falling = true;
        this.player.fall_wait_ticks = 60;
        this.player.flames -= 1;
        const lostMotes = this.player.carried;
        this.player.carried = 0;
        const hitEv = {
          type: "event",
          tick: nextTick,
          name: "player_hit",
          data: { by: "fall", flames: this.player.flames, dropped: 0, lost: lostMotes }
        };
        stepEvents.push(hitEv);
        this.events.push(hitEv);

        if (this.player.flames <= 0) {
          this.state = "lost";
          const lossEv = { type: "event", tick: nextTick, name: "game_over", data: { result: "lost", reason: "no_flames" } };
          stepEvents.push(lossEv);
          this.events.push(lossEv);
        }
      }
    }

    // 4. Pickup motes & charms
    if (!this.player.falling && this.state === "playing") {
      for (const m of this.motes) {
        if (m.active) {
          const hDist = distXZ(this.player.pos, m.pos);
          const vDist = Math.abs(this.player.pos[1] - m.pos[1]);
          if (hDist <= this.tuning.pickup_radius && vDist <= 1.5) {
            if (this.player.carried < this.player.capacity) {
              m.active = false;
              this.player.carried += 1;
              const pickEv = { type: "event", tick: nextTick, name: "mote_picked", data: { carried: this.player.carried } };
              stepEvents.push(pickEv);
              this.events.push(pickEv);
            }
          }
        }
      }

      // Charm pickup
      for (const c of this.charms) {
        if (c.available) {
          const hDist = distXZ(this.player.pos, c.pos);
          const vDist = Math.abs(this.player.pos[1] - c.pos[1]);
          if (hDist <= 1.0 && vDist <= 1.5) {
            c.available = false;
            c.respawn_ticks = 2700;
            this.player.charm_ticks = 600;
            const cEv = { type: "event", tick: nextTick, name: "charm_picked", data: { charm_id: c.id, charm_ticks: 600 } };
            stepEvents.push(cEv);
            this.events.push(cEv);
          }
        }
      }
    }

    // 5. Interact with lantern (Contract v1.2)
    const interactTriggered = this.currentInput.interact && !this.prevInput.interact;
    if (interactTriggered && !this.player.falling && this.state === "playing" && this.player.carried > 0) {
      let candidate = null;
      let minDist = Infinity;
      for (const l of this.lanterns) {
        // Can receive if unlit OR (lit and round1(fuel) < 100)
        const f = round1(l.fuel_units / 60.0);
        const canReceive = !l.lit || (l.lit && f < 100.0);
        if (canReceive) {
          const d = distXZ(l.pos, this.player.pos);
          if (d <= this.tuning.interact_radius) {
            if (d < minDist || (Math.abs(d - minDist) < 0.001 && candidate && l.id < candidate.id)) {
              minDist = d;
              candidate = l;
            }
          }
        }
      }

      if (candidate) {
        if (!candidate.lit) {
          // Depositing to light or relight
          const cost = candidate.ever_lit ? this.tuning.relight_cost : this.tuning.lantern_cost;
          const needed = cost - candidate.deposited;
          const amount = Math.min(this.player.carried, needed);
          if (amount > 0) {
            this.player.carried -= amount;
            candidate.deposited += amount;
            this.score += amount * this.tuning.score.per_mote;

            const depEv = {
              type: "event",
              tick: nextTick,
              name: "deposit",
              data: { lantern_id: candidate.id, amount: amount, deposited: candidate.deposited }
            };
            stepEvents.push(depEv);
            this.events.push(depEv);

            if (candidate.deposited >= cost) {
              candidate.lit = true;
              candidate.fuel_units = 6000;
              candidate.push_ticks = 30;
              this.player.successful_lights++;
              this.player.capacity = Math.min(this.tuning.capacity_max, 10 + 2 * this.player.successful_lights);

              const isRelight = !!candidate.ever_lit;
              if (isRelight) {
                candidate.relit_count = (candidate.relit_count || 0) + 1;
                this.score += this.tuning.score.relight;
              } else {
                candidate.ever_lit = true;
                candidate.relit_count = 0;
                this.score += this.tuning.score.light_first;
              }

              // Push shades within 6m to safe edge
              for (const s of this.shades) {
                const sd = distXZ(s.pos, candidate.pos);
                if (sd <= this.tuning.safe_radius) {
                  if (s.state === 'drain' && s.target_lantern_id === candidate.id) {
                    s.state = 'wander';
                    s.drain_ticks = 0;
                  }
                  if (sd > 0.001) {
                    s.pos[0] = candidate.pos[0] + ((s.pos[0] - candidate.pos[0]) / sd) * this.tuning.safe_radius;
                    s.pos[2] = candidate.pos[2] + ((s.pos[2] - candidate.pos[2]) / sd) * this.tuning.safe_radius;
                  } else {
                    s.pos[0] = candidate.pos[0] + this.tuning.safe_radius;
                  }
                }
              }

              const litEv = {
                type: "event",
                tick: nextTick,
                name: "lantern_lit",
                data: { lantern_id: candidate.id, relight: isRelight }
              };
              stepEvents.push(litEv);
              this.events.push(litEv);
            }
          }
        } else {
          // Refueling a lit lantern
          const currentFuel = round1(candidate.fuel_units / 60.0);
          const neededMotes = Math.ceil((100.0 - currentFuel) / 10.0);
          const used = Math.min(this.player.carried, neededMotes);
          if (used > 0) {
            const oldFuel = currentFuel;
            this.player.carried -= used;
            candidate.fuel_units = Math.min(6000, candidate.fuel_units + used * 10 * 60);
            this.score += used * this.tuning.score.per_mote;
            const newFuel = round1(candidate.fuel_units / 60.0);

            const refuelEv = {
              type: "event",
              tick: nextTick,
              name: "refuel",
              data: { lantern_id: candidate.id, amount: used, fuel: newFuel }
            };
            stepEvents.push(refuelEv);
            this.events.push(refuelEv);

            // If fuel was brought from < 30 up to >= 30, push shades out
            if (oldFuel < this.tuning.low_fuel_threshold && (candidate.fuel_units / 60.0) >= this.tuning.low_fuel_threshold) {
              candidate.push_ticks = 30;
              for (const s of this.shades) {
                const sd = distXZ(s.pos, candidate.pos);
                if (sd <= this.tuning.safe_radius) {
                  if (s.state === 'drain' && s.target_lantern_id === candidate.id) {
                    s.state = 'wander';
                    s.drain_ticks = 0;
                  }
                  if (sd > 0.001) {
                    s.pos[0] = candidate.pos[0] + ((s.pos[0] - candidate.pos[0]) / sd) * this.tuning.safe_radius;
                    s.pos[2] = candidate.pos[2] + ((s.pos[2] - candidate.pos[2]) / sd) * this.tuning.safe_radius;
                  } else {
                    s.pos[0] = candidate.pos[0] + this.tuning.safe_radius;
                  }
                }
              }
            }
          }
        }
      }
    }

    // 6. Update safe zone
    for (const l of this.lanterns) {
      if (l.lit && l.push_ticks > 0) {
        l.push_ticks--;
      }
    }

    // 7. Pulse (Tỏa Sáng)
    const pulseTriggered = this.currentInput.pulse && !this.prevInput.pulse;
    if (pulseTriggered && !this.player.falling && this.state === "playing") {
      if (this.player.pulse_cd_ticks <= 0 && this.player.carried >= this.tuning.pulse_cost) {
        this.player.carried -= this.tuning.pulse_cost;
        this.player.pulse_cd_ticks = 180; // 3.0s * 60

        const pulseOrigin = [this.player.pos[0], this.player.pos[1] + 0.8, this.player.pos[2]];
        const stunnedIds = [];

        // Hit shades
        for (const s of this.shades) {
          const d3 = dist3D(pulseOrigin, s.pos);
          if (d3 <= this.tuning.pulse_radius) {
            const wasDrain = (s.state === "drain");
            s.state = "stunned";
            s.drain_ticks = 0;
            s.state_ticks_left = 120; // 120 ticks
            s.push_ticks_left = 15;
            const hDist = distXZ(s.pos, this.player.pos);
            if (hDist > 0.001) {
              s.push_vec = [(s.pos[0] - this.player.pos[0]) / hDist, (s.pos[2] - this.player.pos[2]) / hDist];
            } else {
              s.push_vec = [1.0, 0.0];
            }
            stunnedIds.push(s.id);
            this.score += wasDrain ? this.tuning.score.per_stun_drain : this.tuning.score.per_stun;
          }
        }

        // Hit drifters
        for (const d of this.drifters) {
          const d3 = dist3D(pulseOrigin, d.pos);
          if (d3 <= this.tuning.pulse_radius) {
            if (d.state === "chase") {
              d.state = "flee";
              d.flee_ticks_left = 240;
            } else if (d.state === "flee" && d.stolen > 0) {
              for (let i = 0; i < d.stolen; i++) {
                this.motes.push({
                  id: `M${this.motes.length + 1}`,
                  pos: [...d.pos],
                  active: true,
                  kind: "dropped",
                  ttl_ticks: 480
                });
              }
              const dropEv = { type: "event", tick: nextTick, name: "drifter_drop", data: { drifter_id: d.id, amount: d.stolen } };
              stepEvents.push(dropEv);
              this.events.push(dropEv);
              d.stolen = 0;
              d.flee_ticks_left = 120;
            }
          }
        }

        const pulseEv = { type: "event", tick: nextTick, name: "pulse", data: { stunned_ids: stunnedIds } };
        stepEvents.push(pulseEv);
        this.events.push(pulseEv);
      }
    }

    // 8. Move Shades & Drifters (Contract v1.2)
    const shadeSpeed = (this.night === 3 ? this.tuning.shade_speed_night3 : this.tuning.shade_speed);
    for (const s of this.shades) {
      if (s.state === "stunned") {
        if (s.push_ticks_left > 0) {
          s.push_ticks_left--;
          const stepPush = 4.0 / 15.0; // 4m over 15 ticks
          s.pos[0] += s.push_vec[0] * stepPush;
          s.pos[2] += s.push_vec[1] * stepPush;
        }
        s.state_ticks_left--;
        if (s.state_ticks_left <= 0) s.state = "wander";
      } else if (s.state === "recoil") {
        s.state_ticks_left--;
        const stepPush = 2.0 / 60.0;
        s.pos[0] += s.push_vec[0] * stepPush;
        s.pos[2] += s.push_vec[1] * stepPush;
        if (s.state_ticks_left <= 0) s.state = "wander";
      } else if (s.state === "drain") {
        // Standing still while draining.
        const pd = distXZ(s.pos, this.player.pos);
        if (pd <= 6.0) {
          s.state = "chase";
          s.drain_ticks = 0;
        } else {
          const tLantern = this.lanterns.find(l => l.id === s.target_lantern_id);
          if (!tLantern || !tLantern.lit || (tLantern.fuel_units / 60.0) >= this.tuning.low_fuel_threshold || distXZ(s.pos, tLantern.pos) > 2.0) {
            s.state = "wander";
            s.drain_ticks = 0;
          }
        }
      } else if (s.state === "chase" || s.state === "wander") {
        const pd = distXZ(s.pos, this.player.pos);
        if (s.state === "wander" && pd <= 12.0) {
          s.state = "chase";
        } else if (s.state === "chase" && pd > 18.0) {
          s.state = "wander";
        }

        if (s.state === "chase") {
          if (pd > 0.001) {
            s.pos[0] += ((this.player.pos[0] - s.pos[0]) / pd) * shadeSpeed * this.dt;
            s.pos[2] += ((this.player.pos[2] - s.pos[2]) / pd) * shadeSpeed * this.dt;
          }
        } else if (s.state === "wander") {
          // Priority 1: Lit lantern with fuel < 30 (closest, ties broken by id)
          // Priority 2: Unlit lantern (closest, ties broken by id)
          let targetLantern = null;
          let minLDist = Infinity;

          for (const l of this.lanterns) {
            if (l.lit && (l.fuel_units / 60.0) < this.tuning.low_fuel_threshold) {
              const ld = distXZ(s.pos, l.pos);
              if (ld < minLDist || (Math.abs(ld - minLDist) < 0.001 && targetLantern && l.id < targetLantern.id)) {
                minLDist = ld;
                targetLantern = l;
              }
            }
          }

          if (!targetLantern) {
            minLDist = Infinity;
            for (const l of this.lanterns) {
              if (!l.lit) {
                const ld = distXZ(s.pos, l.pos);
                if (ld < minLDist || (Math.abs(ld - minLDist) < 0.001 && targetLantern && l.id < targetLantern.id)) {
                  minLDist = ld;
                  targetLantern = l;
                }
              }
            }
          }

          if (targetLantern) {
            s.target_lantern_id = targetLantern.id;
            const ld = distXZ(s.pos, targetLantern.pos);

            if (targetLantern.lit && (targetLantern.fuel_units / 60.0) < this.tuning.low_fuel_threshold && ld <= 2.0) {
              s.state = "drain";
              s.drain_ticks = 0;
            } else if (ld > 0.001) {
              s.pos[0] += ((targetLantern.pos[0] - s.pos[0]) / ld) * shadeSpeed * this.dt;
              s.pos[2] += ((targetLantern.pos[2] - s.pos[2]) / ld) * shadeSpeed * this.dt;
            }
          }
        }

        // Safe zone repulsion: Active for lit lanterns with fuel >= 30 or push_ticks > 0
        for (const l of this.lanterns) {
          if (l.lit && ((l.fuel_units / 60.0) >= this.tuning.low_fuel_threshold || l.push_ticks > 0)) {
            const ld = distXZ(s.pos, l.pos);
            if (ld < this.tuning.safe_radius) {
              if (ld > 0.001) {
                s.pos[0] = l.pos[0] + ((s.pos[0] - l.pos[0]) / ld) * this.tuning.safe_radius;
                s.pos[2] = l.pos[2] + ((s.pos[2] - l.pos[2]) / ld) * this.tuning.safe_radius;
              }
            }
          }
        }
      }
    }

    // Drifters movement
    for (const d of this.drifters) {
      if (d.state === "idle") {
        const pd = distXZ(d.pos, this.player.pos);
        if (this.player.carried >= 5 && pd <= 15.0) {
          d.state = "chase";
        }
      } else if (d.state === "chase") {
        const pd = distXZ(d.pos, this.player.pos);
        if (this.player.carried < 5 || pd > 15.0) {
          d.state = "idle";
        } else if (pd > 0.001) {
          d.pos[0] += ((this.player.pos[0] - d.pos[0]) / pd) * 7.0 * this.dt;
          d.pos[2] += ((this.player.pos[2] - d.pos[2]) / pd) * 7.0 * this.dt;
        }
      } else if (d.state === "flee") {
        const pd = distXZ(d.pos, this.player.pos);
        if (pd > 0.001) {
          d.pos[0] += ((d.pos[0] - this.player.pos[0]) / pd) * 7.0 * this.dt;
          d.pos[2] += ((d.pos[2] - this.player.pos[2]) / pd) * 7.0 * this.dt;
        }
        d.flee_ticks_left--;
        if (d.flee_ticks_left <= 0) d.state = "removed";
      }
    }

    // 9. Contacts: Drifter steals first, then Shades inflict hits
    if (!this.player.falling && this.state === "playing") {
      // Drifters
      for (const d of this.drifters) {
        if (d.state === "chase") {
          const hDist = distXZ(d.pos, this.player.pos);
          if (hDist <= 1.2) {
            const stolen = Math.min(3, this.player.carried);
            this.player.carried -= stolen;
            d.stolen += stolen;
            d.state = "flee";
            d.flee_ticks_left = 240;
            const stealEv = {
              type: "event",
              tick: nextTick,
              name: "drifter_steal",
              data: { drifter_id: d.id, amount: stolen, carried: this.player.carried }
            };
            stepEvents.push(stealEv);
            this.events.push(stealEv);
          }
        }
      }

      // Shades (increasing id order)
      const sortedShades = [...this.shades].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
      let flameLostThisTick = false;

      for (const s of sortedShades) {
        if (s.state !== "stunned" && s.state !== "recoil" && s.state !== "spawning") {
          // Check if within pushing lantern
          let protectedByPush = false;
          for (const l of this.lanterns) {
            if (l.lit && l.push_ticks > 0 && distXZ(s.pos, l.pos) <= this.tuning.safe_radius) {
              protectedByPush = true;
              break;
            }
          }
          if (protectedByPush) continue;

          const hDist = distXZ(s.pos, this.player.pos);
          const vDist = Math.abs(s.pos[1] - this.player.pos[1]);
          if (hDist <= this.tuning.shade_hit_radius && vDist <= 1.5) {
            if (this.player.invuln_ticks <= 0 && this.player.flames > 0 && !flameLostThisTick) {
              flameLostThisTick = true;
              this.player.flames -= 1;
              this.player.invuln_ticks = 90;
              const dropped = Math.floor(this.player.carried * this.tuning.hit_drop_ratio);
              this.player.carried -= dropped;

              // Scatter dropped motes around ring 1.5-2.5m
              for (let i = 0; i < dropped; i++) {
                const angle = this.rng() * Math.PI * 2;
                const r = 1.5 + this.rng() * 1.0;
                this.motes.push({
                  id: `M${this.motes.length + 1}`,
                  pos: [this.player.pos[0] + r * Math.cos(angle), this.player.pos[1], this.player.pos[2] + r * Math.sin(angle)],
                  active: true,
                  kind: "dropped",
                  ttl_ticks: 480
                });
              }

              // Recoil shade 2m over 60 ticks
              s.state = "recoil";
              s.state_ticks_left = 60;
              if (hDist > 0.001) {
                s.push_vec = [(s.pos[0] - this.player.pos[0]) / hDist, (s.pos[2] - this.player.pos[2]) / hDist];
              } else {
                s.push_vec = [1, 0];
              }

              const hitEv = {
                type: "event",
                tick: nextTick,
                name: "player_hit",
                data: { by: "shade", flames: this.player.flames, dropped: dropped, lost: 0 }
              };
              stepEvents.push(hitEv);
              this.events.push(hitEv);

              if (this.player.flames <= 0) {
                this.state = "lost";
                const lossEv = { type: "event", tick: nextTick, name: "game_over", data: { result: "lost", reason: "no_flames" } };
                stepEvents.push(lossEv);
                this.events.push(lossEv);
                break;
              }
            }
          }
        }
      }
    }

    // 10. Spawn motes, Shades, Drifters on schedule
    // Motes respawn at ticks 240, 480, 720...
    if ((this.sim_tick + 1) % 240 === 0) {
      const activeCount = this.motes.filter(m => m.active).length;
      if (activeCount < 30) {
        for (const pt of this.spawnPoints.motes) {
          const occupied = this.motes.some(m => m.active && distXZ(m.pos, pt) < 2.0);
          if (!occupied) {
            this.motes.push({
              id: `M${this.motes.length + 1}`,
              pos: [...pt],
              active: true,
              kind: "random",
              ttl_ticks: null
            });
            break;
          }
        }
      }
    }

    // Shades spawn: 2 at tick 300, then interval based on Night
    const sInterval = this.night === 1 ? 480 : (this.night === 2 ? 420 : 360);
    const sMax = this.night === 1 ? 6 : (this.night === 2 ? 8 : 10);
    if ((this.sim_tick + 1) === 300) {
      for (let i = 0; i < 2; i++) {
        if (this.shades.length < sMax) {
          const pt = this.spawnPoints.shades.find(p => distXZ(p, this.player.pos) >= 15.0 && !this.shades.some(s => distXZ(s.pos, p) < 3.0));
          if (pt) {
            const sid = `S${this.shades.length + 1}`;
            this.shades.push({ id: sid, pos: [...pt], state: "wander", state_ticks_left: 0, push_vec: [0, 0], push_ticks_left: 0, target_lantern_id: null, drain_ticks: 0 });
            const sEv = { type: "event", tick: nextTick, name: "shade_spawned", data: { id: sid } };
            stepEvents.push(sEv);
            this.events.push(sEv);
          }
        }
      }
    } else if ((this.sim_tick + 1) > 300 && ((this.sim_tick + 1) - 300) % sInterval === 0) {
      if (this.shades.length < sMax) {
        const pt = this.spawnPoints.shades.find(p => distXZ(p, this.player.pos) >= 15.0 && !this.shades.some(s => distXZ(s.pos, p) < 3.0));
        if (pt) {
          const sid = `S${this.shades.length + 1}`;
          this.shades.push({ id: sid, pos: [...pt], state: "wander", state_ticks_left: 0, push_vec: [0, 0], push_ticks_left: 0, target_lantern_id: null, drain_ticks: 0 });
          const sEv = { type: "event", tick: nextTick, name: "shade_spawned", data: { id: sid } };
          stepEvents.push(sEv);
          this.events.push(sEv);
        }
      }
    }

    // Drifters spawn (Night 2 and 3 at 1200, 2400...)
    if ((this.night === 2 || this.night === 3) && (this.sim_tick + 1) % 1200 === 0) {
      if (this.drifters.filter(d => d.state !== "removed").length < 2) {
        const did = `D${this.drifters.length + 1}`;
        const pt = this.spawnPoints.shades[Math.floor(this.rng() * this.spawnPoints.shades.length)] || [30, 0, 0];
        this.drifters.push({ id: did, pos: [...pt], state: "idle", stolen: 0, flee_ticks_left: 0 });
      }
    }

    // 11. Check win / loss (Contract v1.2)
    // Runs after all updates of the tick; no_flames always loses first
    if (this.state === "playing") {
      if (this.player.flames <= 0) {
        this.state = "lost";
        const lossEv = { type: "event", tick: nextTick, name: "game_over", data: { result: "lost", reason: "no_flames" } };
        stepEvents.push(lossEv);
        this.events.push(lossEv);
      } else if (this.time_left_s <= 0) {
        const litCount = this.lanterns.filter(l => l.lit).length;
        const totalCount = this.lanterns.length;
        const reqThreshold = Math.ceil(this.tuning.win_ratio * totalCount);

        if (litCount >= reqThreshold) {
          this.state = "won";
          let dawnBonus = 0;
          for (const l of this.lanterns) {
            if (l.lit) {
              dawnBonus += this.tuning.score.per_lantern_dawn + Math.floor(l.fuel_units / 60.0);
            }
          }
          dawnBonus += this.player.flames * this.tuning.score.per_flame_dawn;
          this.score += dawnBonus;

          const winEv = { type: "event", tick: nextTick, name: "game_over", data: { result: "won", reason: "dawn_survived" } };
          stepEvents.push(winEv);
          this.events.push(winEv);
        } else {
          this.state = "lost";
          const lossEv = { type: "event", tick: nextTick, name: "game_over", data: { result: "lost", reason: "dawn" } };
          stepEvents.push(lossEv);
          this.events.push(lossEv);
        }
      }
    }

    // Update simulation counters
    this.tick = nextTick;
    this.sim_tick = nextTick;
    this.prevInput = Object.assign({}, this.currentInput);

    return stepEvents;
  }

  getSnapshot() {
    const motesActive = this.motes.filter(m => m.active).length;
    return {
      type: "snapshot",
      tick: this.tick,
      sim_tick: this.sim_tick,
      night: this.night,
      state: this.state,
      time_left_s: round3(this.time_left_s),
      score: this.score,
      wind: {
        active: !!this.wind.active,
        dir_deg: this.wind.active ? round3(this.wind.dir_deg) : 0
      },
      player: {
        pos: roundPos(this.player.pos),
        vel: roundPos(this.player.vel),
        grounded: !!this.player.grounded,
        flames: this.player.flames,
        carried: this.player.carried,
        capacity: this.player.capacity,
        invuln: this.player.invuln_ticks > 0,
        dash_cd_s: round3(this.player.dash_cd_ticks / 60.0),
        pulse_cd_s: round3(this.player.pulse_cd_ticks / 60.0),
        charm_s: round3(this.player.charm_ticks / 60.0)
      },
      lanterns: this.lanterns.map(l => ({
        id: l.id,
        pos: roundPos(l.pos),
        lit: l.lit,
        deposited: l.deposited,
        fuel: l.lit ? round1(l.fuel_units / 60.0) : 0,
        ever_lit: !!l.ever_lit,
        relit_count: l.relit_count || 0
      })),
      shades: this.shades.map(s => ({
        id: s.id,
        pos: roundPos(s.pos),
        state: s.state
      })),
      motes_active: motesActive,
      motes: this.motes.filter(m => m.active).map(m => ({
        id: m.id,
        pos: roundPos(m.pos),
        kind: m.kind || "random",
        ttl_s: m.ttl_ticks !== null && m.ttl_ticks !== undefined ? round3(m.ttl_ticks / 60.0) : null
      })),
      drifters: this.drifters.filter(d => d.state !== "removed").map(d => ({
        id: d.id,
        pos: roundPos(d.pos),
        state: d.state,
        stolen: d.stolen
      })),
      charms: this.charms.map(c => ({
        id: c.id,
        available: !!c.available,
        respawn_s: round3(c.respawn_ticks / 60.0)
      }))
    };
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { GameSimulation, round1, round3, roundPos, distXZ, dist3D, createMulberry32 };
}
