/**
 * GameSimulation.js
 * Single source of truth for "Đảo Đèn Lồng" core game simulation.
 * Complies 100% with Test Contract v1.0.
 * Deterministic 60 tick/s simulation for both Headless CLI and 3D Web game.
 */

// Simple deterministic PRNG: Mulberry32
function createMulberry32(seed) {
  let s = (seed >>> 0) || 1;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round3(n) {
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

class GameSimulation {
  constructor(options = {}) {
    this.seed = options.seed !== undefined ? options.seed : 42;
    this.rng = createMulberry32(this.seed);
    
    // Tuning values matching game.contract.json
    this.tuning = Object.assign({
      player_speed: 6.0,
      carry_capacity: 10,
      lantern_cost: 5,
      lantern_count_night1: 5,
      pickup_radius: 1.8,
      interact_radius: 2.5,
      pulse_cost: 1,
      pulse_radius: 6.0,
      night1_duration_s: 300,
      flames: 3,
      invuln_s: 1.5,
      hit_drop_ratio: 0.5,
      pulse_stun_s: 3.0,
      pulse_push_m: 2.5,
      pulse_cooldown_s: 1.0,
      safe_radius: 4.5,
      shade_speed: 3.2,
      shade_hit_radius: 1.0,
      fall_enabled: false,
      score: {
        per_mote: 10,
        per_lantern: 100,
        per_stun: 25,
        per_second_left: 2,
        per_flame_left: 100
      }
    }, options.tuning || {});

    this.islandRadius = 32.0;
    this.dt = 1.0 / 60.0;
    this.tick = 0;
    this.sim_tick = 0;
    this.state = "playing"; // "playing" | "won" | "lost"
    this.score = 0;
    this.duration_s = this.tuning.night1_duration_s;
    this.time_left_s = this.duration_s;

    this.player = {
      pos: [0, 0, 0],
      carried: 0,
      flames: this.tuning.flames,
      invuln_timer: 0.0,
      pulse_cooldown_timer: 0.0
    };

    // 5 Grand Lanterns placed gracefully on Đảo Bến
    this.lanterns = [
      { id: "L1", pos: [0, 0, 22], lit: false, deposited: 0 },
      { id: "L2", pos: [20.92, 0, 6.8], lit: false, deposited: 0 },
      { id: "L3", pos: [12.93, 0, -17.8], lit: false, deposited: 0 },
      { id: "L4", pos: [-12.93, 0, -17.8], lit: false, deposited: 0 },
      { id: "L5", pos: [-20.92, 0, 6.8], lit: false, deposited: 0 }
    ];

    this.motes = [];
    this.shades = [];
    this.events = [];

    // Persistent input state
    this.currentInput = {
      move: [0, 0],
      cam_yaw_deg: 0,
      jump: false,
      interact: false,
      pulse: false,
      dash: false
    };
    this.prevInput = Object.assign({}, this.currentInput);

    // Apply scenario or defaults
    this.setupScenario(options.scenario);
  }

  setupScenario(scenario = {}) {
    scenario = scenario || {};

    if (scenario.player) {
      if (scenario.player.pos) this.player.pos = [...scenario.player.pos];
      if (scenario.player.carried !== undefined) this.player.carried = scenario.player.carried;
      if (scenario.player.flames !== undefined) this.player.flames = scenario.player.flames;
    }

    if (scenario.time_left_s !== undefined) {
      this.time_left_s = scenario.time_left_s;
      this.duration_s = scenario.time_left_s;
    }

    // Lanterns update
    if (Array.isArray(scenario.lanterns)) {
      for (const lData of scenario.lanterns) {
        let l = this.lanterns.find(item => item.id === lData.id);
        if (!l) {
          l = { id: lData.id, pos: [0, 0, 0], lit: false, deposited: 0 };
          this.lanterns.push(l);
        }
        if (lData.pos) l.pos = [...lData.pos];
        if (lData.lit !== undefined) l.lit = !!lData.lit;
        if (lData.deposited !== undefined) l.deposited = lData.deposited;
      }
    }

    // Motes setup
    if (scenario.motes !== undefined) {
      this.motes = [];
      scenario.motes.forEach((mPos, idx) => {
        this.motes.push({
          id: `M${idx + 1}`,
          pos: [mPos[0], mPos[1] || 0, mPos[2]],
          active: true
        });
      });
    } else if (scenario.random_motes !== false) {
      // Spawn 25 initial motes deterministically
      this.motes = [];
      const count = 25;
      for (let i = 0; i < count; i++) {
        const angle = this.rng() * Math.PI * 2;
        const dist = 3.0 + this.rng() * (this.islandRadius - 5.0);
        this.motes.push({
          id: `M${i + 1}`,
          pos: [dist * Math.cos(angle), 0, dist * Math.sin(angle)],
          active: true
        });
      }
    }

    // Shades setup
    if (scenario.shades !== undefined) {
      this.shades = [];
      scenario.shades.forEach((sData, idx) => {
        this.shades.push({
          id: sData.id || `S${idx + 1}`,
          pos: [...sData.pos],
          state: sData.state || "chase",
          stun_timer: 0.0
        });
      });
    } else if (scenario.random_shades !== false) {
      // Spawn 3 initial shades deterministically
      this.shades = [];
      for (let i = 0; i < 3; i++) {
        const angle = (i * (Math.PI * 2 / 3)) + (this.rng() * 0.3);
        const dist = 18.0 + this.rng() * 8.0;
        this.shades.push({
          id: `S${i + 1}`,
          pos: [dist * Math.cos(angle), 0, dist * Math.sin(angle)],
          state: "chase",
          stun_timer: 0.0
        });
      }
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
  }

  step() {
    if (this.state !== "playing") return [];

    const k = this.tick;
    const nextTick = k + 1;
    const stepEvents = [];

    // Edge detections
    const pulseTriggered = this.currentInput.pulse && !this.prevInput.pulse;
    const interactTriggered = this.currentInput.interact && !this.prevInput.interact;

    // 1. Move Player
    const [mx, mz] = this.currentInput.move;
    let len = Math.sqrt(mx * mx + mz * mz);
    let normX = mx;
    let normZ = mz;
    if (len > 1.0) {
      normX /= len;
      normZ /= len;
    }

    const theta = (this.currentInput.cam_yaw_deg * Math.PI) / 180.0;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const worldDx = normX * cosT + normZ * sinT;
    const worldDz = -normX * sinT + normZ * cosT;

    this.player.pos[0] += worldDx * this.tuning.player_speed * this.dt;
    this.player.pos[2] += worldDz * this.tuning.player_speed * this.dt;

    // Island bounds check
    const pDist = Math.sqrt(this.player.pos[0] * this.player.pos[0] + this.player.pos[2] * this.player.pos[2]);
    if (!this.tuning.fall_enabled && pDist > this.islandRadius) {
      this.player.pos[0] = (this.player.pos[0] / pDist) * this.islandRadius;
      this.player.pos[2] = (this.player.pos[2] / pDist) * this.islandRadius;
    }

    // 2. Timers
    if (this.player.invuln_timer > 0) {
      this.player.invuln_timer = Math.max(0, this.player.invuln_timer - this.dt);
    }
    if (this.player.pulse_cooldown_timer > 0) {
      this.player.pulse_cooldown_timer = Math.max(0, this.player.pulse_cooldown_timer - this.dt);
    }

    // 3. Player Pulse (Tỏa sáng)
    if (pulseTriggered) {
      if (this.player.pulse_cooldown_timer <= 0 && this.player.carried >= this.tuning.pulse_cost) {
        this.player.carried -= this.tuning.pulse_cost;
        this.player.pulse_cooldown_timer = this.tuning.pulse_cooldown_s;

        const stunnedIds = [];
        for (const shade of this.shades) {
          const d = distXZ(shade.pos, this.player.pos);
          if (d <= this.tuning.pulse_radius) {
            shade.state = "stunned";
            shade.stun_timer = this.tuning.pulse_stun_s;
            stunnedIds.push(shade.id);

            // Push back
            if (d > 0.001) {
              const pushX = (shade.pos[0] - this.player.pos[0]) / d;
              const pushZ = (shade.pos[2] - this.player.pos[2]) / d;
              shade.pos[0] += pushX * this.tuning.pulse_push_m;
              shade.pos[2] += pushZ * this.tuning.pulse_push_m;
            } else {
              shade.pos[0] += this.tuning.pulse_push_m;
            }
            this.score += this.tuning.score.per_stun;
          }
        }

        const ev = {
          type: "event",
          tick: nextTick,
          name: "pulse",
          data: { stunned_ids: stunnedIds }
        };
        stepEvents.push(ev);
        this.events.push(ev);
      }
    }

    // 4. Interact (Deposit motes into Lantern)
    if (interactTriggered) {
      // Find closest unlit lantern within interact_radius
      let targetLantern = null;
      let minDist = Infinity;
      for (const l of this.lanterns) {
        if (!l.lit) {
          const d = distXZ(l.pos, this.player.pos);
          if (d <= this.tuning.interact_radius && d < minDist) {
            minDist = d;
            targetLantern = l;
          }
        }
      }

      if (targetLantern && this.player.carried > 0) {
        const needed = this.tuning.lantern_cost - targetLantern.deposited;
        const amount = Math.min(this.player.carried, needed);
        if (amount > 0) {
          this.player.carried -= amount;
          targetLantern.deposited += amount;

          const depEv = {
            type: "event",
            tick: nextTick,
            name: "deposit",
            data: {
              lantern_id: targetLantern.id,
              amount: amount,
              deposited: targetLantern.deposited
            }
          };
          stepEvents.push(depEv);
          this.events.push(depEv);

          if (targetLantern.deposited >= this.tuning.lantern_cost) {
            targetLantern.lit = true;
            this.score += this.tuning.score.per_lantern;

            const litEv = {
              type: "event",
              tick: nextTick,
              name: "lantern_lit",
              data: { lantern_id: targetLantern.id }
            };
            stepEvents.push(litEv);
            this.events.push(litEv);

            // Check Win Condition: All 5 lit
            const allLit = this.lanterns.every(l => l.lit);
            if (allLit) {
              this.state = "won";
              const timeBonus = Math.floor(Math.max(0, this.time_left_s)) * this.tuning.score.per_second_left;
              const flameBonus = this.player.flames * this.tuning.score.per_flame_left;
              this.score += timeBonus + flameBonus;

              const winEv = {
                type: "event",
                tick: nextTick,
                name: "game_over",
                data: { result: "won", reason: "all_lit" }
              };
              stepEvents.push(winEv);
              this.events.push(winEv);
            }
          }
        }
      }
    }

    // 5. Motes pickup
    for (const mote of this.motes) {
      if (mote.active) {
        const d = distXZ(this.player.pos, mote.pos);
        if (d <= this.tuning.pickup_radius) {
          if (this.player.carried < this.tuning.carry_capacity) {
            mote.active = false;
            this.player.carried += 1;
            this.score += this.tuning.score.per_mote;

            const pickEv = {
              type: "event",
              tick: nextTick,
              name: "mote_picked",
              data: { carried: this.player.carried }
            };
            stepEvents.push(pickEv);
            this.events.push(pickEv);
          }
        }
      }
    }

    // 6. Shades Update
    if (this.state === "playing") {
      for (const shade of this.shades) {
        if (shade.state === "stunned") {
          shade.stun_timer -= this.dt;
          if (shade.stun_timer <= 0) {
            shade.state = "chase";
          }
        } else {
          // Check repulsion by safe_radius of any lit lantern
          let inSafeZone = false;
          let safeRepelX = 0;
          let safeRepelZ = 0;
          for (const l of this.lanterns) {
            if (l.lit) {
              const ld = distXZ(shade.pos, l.pos);
              if (ld <= this.tuning.safe_radius) {
                inSafeZone = true;
                if (ld > 0.001) {
                  safeRepelX += (shade.pos[0] - l.pos[0]) / ld;
                  safeRepelZ += (shade.pos[2] - l.pos[2]) / ld;
                }
              }
            }
          }

          if (inSafeZone) {
            const repelLen = Math.sqrt(safeRepelX * safeRepelX + safeRepelZ * safeRepelZ);
            if (repelLen > 0.001) {
              shade.pos[0] += (safeRepelX / repelLen) * this.tuning.shade_speed * this.dt;
              shade.pos[2] += (safeRepelZ / repelLen) * this.tuning.shade_speed * this.dt;
            }
          } else {
            // Chase player
            const pd = distXZ(shade.pos, this.player.pos);
            if (pd > 0.001) {
              shade.pos[0] += ((this.player.pos[0] - shade.pos[0]) / pd) * this.tuning.shade_speed * this.dt;
              shade.pos[2] += ((this.player.pos[2] - shade.pos[2]) / pd) * this.tuning.shade_speed * this.dt;
            }
          }

          // Check hit player
          const hitDist = distXZ(shade.pos, this.player.pos);
          if (hitDist <= this.tuning.shade_hit_radius) {
            if (this.player.invuln_timer <= 0 && this.player.flames > 0) {
              this.player.flames -= 1;
              this.player.invuln_timer = this.tuning.invuln_s;
              const dropped = Math.floor(this.player.carried * this.tuning.hit_drop_ratio);
              this.player.carried -= dropped;

              const hitEv = {
                type: "event",
                tick: nextTick,
                name: "player_hit",
                data: {
                  by: "shade",
                  flames: this.player.flames,
                  dropped: dropped
                }
              };
              stepEvents.push(hitEv);
              this.events.push(hitEv);

              if (this.player.flames <= 0) {
                this.state = "lost";
                const lossEv = {
                  type: "event",
                  tick: nextTick,
                  name: "game_over",
                  data: { result: "lost", reason: "no_flames" }
                };
                stepEvents.push(lossEv);
                this.events.push(lossEv);
                break;
              }
            }
          }
        }
      }
    }

    // 7. Time Update
    this.time_left_s = Math.max(0, this.duration_s - nextTick / 60.0);
    if (this.time_left_s <= 0 && this.state === "playing") {
      this.state = "lost";
      const timeoutEv = {
        type: "event",
        tick: nextTick,
        name: "game_over",
        data: { result: "lost", reason: "dawn" }
      };
      stepEvents.push(timeoutEv);
      this.events.push(timeoutEv);
    }

    // Update tick counters and prevInput
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
      state: this.state,
      time_left_s: round3(this.time_left_s),
      score: this.score,
      player: {
        pos: roundPos(this.player.pos),
        flames: this.player.flames,
        carried: this.player.carried
      },
      lanterns: this.lanterns.map(l => ({
        id: l.id,
        pos: roundPos(l.pos),
        lit: l.lit,
        deposited: l.deposited
      })),
      shades: this.shades.map(s => ({
        id: s.id,
        pos: roundPos(s.pos),
        state: s.state
      })),
      motes_active: motesActive,
      motes: this.motes.filter(m => m.active).map(m => ({
        id: m.id,
        pos: roundPos(m.pos)
      }))
    };
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { GameSimulation, round3, roundPos, distXZ, createMulberry32 };
}
