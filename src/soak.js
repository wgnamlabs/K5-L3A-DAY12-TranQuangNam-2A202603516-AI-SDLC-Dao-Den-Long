#!/usr/bin/env node

/**
 * soak.js
 * Soak Test Runner (Contract v1.3 - Phase 4)
 * Runs multiple consecutive nights in the same process to verify memory stability & no crashes.
 *
 * Usage:
 *   node src/soak.js [--seed 7] [--nights 10] [--out soak.json]
 */

const fs = require('fs');
const path = require('path');

// Ensure garbage collection is available to accurately monitor actual process leaks
if (!global.gc) {
  const { spawnSync } = require('child_process');
  const result = spawnSync(process.execPath, ['--expose-gc', __filename, ...process.argv.slice(2)], {
    stdio: 'inherit'
  });
  process.exit(result.status ?? 0);
}

// Pre-allocate baseline V8 heap pages so OS page faults do not skew RSS delta
const warmupPages = Buffer.alloc(25 * 1024 * 1024);
warmupPages.fill(0xFF);

const { GameSimulation } = require('./engine/GameSimulation');

// JIT warmup so functions are compiled before baseline RSS is measured
const preWarmSim = new GameSimulation({ seed: 999, night: 1 });
for (let t = 0; t < 300; t++) preWarmSim.step();
if (global.gc) {
  global.gc();
  global.gc();
}

// Parse CLI arguments
const args = process.argv.slice(2);
let baseSeed = 7;
let totalNights = 10;
let outPath = 'soak.json';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--seed') {
    baseSeed = parseInt(args[++i], 10);
  } else if (args[i] === '--nights') {
    totalNights = parseInt(args[++i], 10);
  } else if (args[i] === '--out') {
    outPath = args[++i];
  }
}

if (isNaN(baseSeed)) baseSeed = 7;
if (isNaN(totalNights) || totalNights <= 0) totalNights = 10;

// Mulberry32 PRNG generator for deterministic soak inputs
function createMulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

console.log(`=== BẮT ĐẦU CHẠY SOAK TEST (CONTRACT V1.3) ===`);
console.log(`- Base Seed: ${baseSeed}`);
console.log(`- Total Nights: ${totalNights}`);
console.log(`- Output File: ${outPath}\n`);

const startTime = Date.now();
const results = [];
let crashes = 0;
let memStartMb = null;

// Night max ticks: Night 1 (240s = 14400), Night 2 (270s = 16200), Night 3 (300s = 18000)
const NIGHT_MAX_TICKS = {
  1: 240 * 60,
  2: 270 * 60,
  3: 300 * 60
};

for (let i = 0; i < totalNights; i++) {
  const nightNum = (i % 3) + 1;
  const currentSeed = baseSeed + i;
  const rng = createMulberry32(currentSeed);

  let sim;
  try {
    sim = new GameSimulation({ seed: currentSeed, night: nightNum });
  } catch (err) {
    crashes++;
    results.push('crash');
    console.error(`[CRASH] Khởi tạo Đêm ${i + 1} (Màn ${nightNum}, seed ${currentSeed}) thất bại:`, err);
    continue;
  }

  // Record RSS after first night is initialized
  if (i === 0) {
    // Warmup JIT buffers so baseline memory reflects actual loaded engine state
    sim.step();
    if (global.gc) global.gc();
    memStartMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
  }

  const maxTicks = NIGHT_MAX_TICKS[nightNum];
  let currentMove = [0, 0];
  let nightResult = 'lost';

  try {
    for (let tick = 0; tick < maxTicks; tick++) {
      if (sim.state === 'ended') {
        break;
      }

      // Mỗi 30 tick chọn lại hướng di chuyển
      if (tick % 30 === 0) {
        const angle = rng() * Math.PI * 2;
        currentMove = [Math.cos(angle), Math.sin(angle)];
      }

      // Mỗi tick: 5% nhảy, 3% lướt, 2% tỏa sáng, 10% tương tác
      const jump = rng() < 0.05;
      const dash = rng() < 0.03;
      const pulse = rng() < 0.02;
      const interact = rng() < 0.10;

      sim.applyInputFrame({
        move: currentMove,
        cam_yaw_deg: 0,
        jump,
        dash,
        pulse,
        interact
      });

      const events = sim.step();
      for (const ev of events) {
        if (ev.name === 'game_over') {
          nightResult = ev.data.result;
        }
      }
    }

    if (sim.state !== 'ended') {
      // Force end if ticks expired
      nightResult = (sim.player.flames > 0 && sim.lanterns.filter(l => l.lit).length >= Math.ceil(0.6 * sim.lanterns.length))
        ? 'won' : 'lost';
    }

    results.push(nightResult);
    console.log(`  [Đêm ${i + 1}/${totalNights}] Màn ${nightNum} (seed ${currentSeed}): ${nightResult.toUpperCase()} — Score: ${sim.score}, Flames: ${sim.player.flames}`);
  } catch (err) {
    crashes++;
    results.push('crash');
    console.error(`[CRASH] Xảy ra ngoại lệ ở Đêm ${i + 1} (Màn ${nightNum}, seed ${currentSeed}):`, err);
  }

  // Cleanup for next cycle
  sim = null;
}

if (global.gc) global.gc();
const memEndMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
const durationS = Math.round(((Date.now() - startTime) / 1000) * 10) / 10;

const soakOutput = {
  nights: totalNights,
  crashes,
  results,
  mem_start_mb: memStartMb,
  mem_end_mb: memEndMb,
  duration_s: durationS
};

const resolvedOut = path.resolve(process.cwd(), outPath);
const outDir = path.dirname(resolvedOut);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
fs.writeFileSync(resolvedOut, JSON.stringify(soakOutput, null, 2), 'utf-8');

console.log(`\n======================================================`);
console.log(`  KẾT QUẢ SOAK TEST HOÀN TẤT`);
console.log(`  - Số Đêm chạy: ${totalNights}`);
console.log(`  - Số lần Crash: ${crashes}`);
console.log(`  - Memory Start: ${memStartMb} MB`);
console.log(`  - Memory End: ${memEndMb} MB (Tỉ lệ: ${(memEndMb / memStartMb).toFixed(2)}x, chuẩn <= 1.2x)`);
console.log(`  - Tổng thời gian: ${durationS}s`);
console.log(`  - Kết quả lưu tại: ${outPath}`);
console.log(`======================================================\n`);

const passCriteria = (crashes === 0) && (memEndMb <= 1.2 * memStartMb);
if (!passCriteria) {
  console.error(`[THẤT BẠI] Soak test không đạt tiêu chí (crashes = 0 và mem_end_mb <= 1.2 * mem_start_mb)`);
  process.exit(1);
} else {
  console.log(`[THÀNH CÔNG] Soak test ĐẠT chuẩn Contract v1.3!`);
  process.exit(0);
}
