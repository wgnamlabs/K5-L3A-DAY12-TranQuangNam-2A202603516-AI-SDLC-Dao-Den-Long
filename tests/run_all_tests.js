/**
 * run_all_tests.js
 * Automated test suite for Đảo Đèn Lồng - Headless Test Contract v1.2 (Phase 3)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outDir = path.resolve(rootDir, 'tests/outputs');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

let passed = 0;
let failed = 0;

function assert(condition, testName, message) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}: ${message}`);
    failed++;
  }
}

console.log("=== BẮT ĐẦU CHẠY BỘ TEST KIỂM THỬ CONTRACT V1.2 (PHASE 3) ===");

// Test 1: Mote Pickup (Regression)
try {
  const outPath = path.join(outDir, 'test_pickup.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --scenario tests/scenarios/pickup.scenario.json --inputs tests/scenarios/pickup.inputs.json --ticks 60 --out "${outPath}"`, { cwd: rootDir });
  
  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const pickupEv = lines.find(l => l.type === 'event' && l.name === 'mote_picked');
  const endLine = lines.find(l => l.type === 'end');

  assert(!!pickupEv && pickupEv.data.carried === 1, "Test 1: Nhặt đom đóm (Regression)", "Không tìm thấy sự kiện mote_picked");
  assert(endLine && endLine.ticks === 60, "Test 1: Kết thúc đúng tick", "End line không đúng tick 60");
} catch (e) {
  assert(false, "Test 1: Nhặt đom đóm", e.message);
}

// Test 2: Deposit and Light Lantern (Regression with cost = 10, relight = false)
try {
  const outPath = path.join(outDir, 'test_deposit.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --scenario tests/scenarios/deposit.scenario.json --inputs tests/scenarios/deposit.inputs.json --ticks 20 --out "${outPath}"`, { cwd: rootDir });
  
  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const depEv = lines.find(l => l.type === 'event' && l.name === 'deposit');
  const litEv = lines.find(l => l.type === 'event' && l.name === 'lantern_lit');

  assert(!!depEv && depEv.data.lantern_id === 'L1' && depEv.data.deposited === 10, "Test 2: Nạp ánh sáng đủ 10 đom đóm", "Deposit amount/deposited != 10");
  assert(!!litEv && litEv.data.lantern_id === 'L1' && litEv.data.relight === false, "Test 2: Thắp sáng đèn L1 (relight: false)", "lantern_lit event thiếu hoặc relight != false");
} catch (e) {
  assert(false, "Test 2: Nạp ánh sáng & Thắp đèn", e.message);
}

// Test 3: Pulse Stun (Regression with cost = 3, stun 120 ticks, push 4m)
try {
  const outPath = path.join(outDir, 'test_pulse.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --scenario tests/scenarios/pulse.scenario.json --inputs tests/scenarios/pulse.inputs.json --ticks 20 --out "${outPath}"`, { cwd: rootDir });
  
  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const pulseEv = lines.find(l => l.type === 'event' && l.name === 'pulse');

  assert(!!pulseEv && Array.isArray(pulseEv.data.stunned_ids) && pulseEv.data.stunned_ids.includes("S1"), "Test 3: Tỏa sáng làm choáng Bóng Mực (cost 3)", "S1 không bị stunned");
} catch (e) {
  assert(false, "Test 3: Tỏa sáng", e.message);
}

// Test 4: Determinism Check (Regression under Contract v1.2)
try {
  const out1 = path.join(outDir, 'det_run1.jsonl');
  const out2 = path.join(outDir, 'det_run2.jsonl');
  
  execSync(`node src/headless.js --seed 777 --night 1 --ticks 180 --out "${out1}"`, { cwd: rootDir });
  execSync(`node src/headless.js --seed 777 --night 1 --ticks 180 --out "${out2}"`, { cwd: rootDir });

  const content1 = fs.readFileSync(out1, 'utf-8');
  const content2 = fs.readFileSync(out2, 'utf-8');

  assert(content1 === content2, "Test 4: Tính tất định (Determinism v1.2)", "Hai lần chạy cùng seed 777 cho output khác nhau!");
} catch (e) {
  assert(false, "Test 4: Tính tất định", e.message);
}

// Test 5: Malformed Inputs Validation (Mã thoát 2)
try {
  const badInputsPath = path.join(outDir, 'bad_inputs.json');
  fs.writeFileSync(badInputsPath, JSON.stringify({
    frames: [
      { tick: 10, move: [1, 0] },
      { tick: 5, move: [0, 1] }
    ]
  }));

  const dummyOut = path.join(outDir, 'dummy.jsonl');
  let exitCode = 0;
  try {
    execSync(`node src/headless.js --seed 123 --night 1 --inputs "${badInputsPath}" --ticks 30 --out "${dummyOut}"`, { cwd: rootDir, stdio: 'pipe' });
  } catch (err) {
    exitCode = err.status;
  }

  assert(exitCode === 2, "Test 5: Bắt lỗi file inputs sai (Mã thoát 2)", `Kỳ vọng mã thoát 2, nhận được ${exitCode}`);
} catch (e) {
  assert(false, "Test 5: Bắt lỗi inputs sai", e.message);
}

// Test 6: Dash (Lướt - Regression)
try {
  const dashOut = path.join(outDir, 'test_dash.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --inputs tests/scenarios/dash.inputs.json --ticks 20 --out "${dashOut}"`, { cwd: rootDir });

  const lines = fs.readFileSync(dashOut, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const dashEv = lines.find(l => l.type === 'event' && l.name === 'dash');
  const snap10 = lines.find(l => l.type === 'snapshot' && l.tick === 10);

  assert(!!dashEv && dashEv.tick === 6, "Test 6: Kích hoạt Lướt (Dash event)", "Không tìm thấy dash event tại tick 6");
  assert(snap10 && snap10.player.pos[2] > 1.0, "Test 6: Nhân vật di chuyển nhanh khi lướt (14 m/s)", "Vị trí không tăng đúng khi lướt");
} catch (e) {
  assert(false, "Test 6: Lướt", e.message);
}

// Test 7: Drifter Steal (Gió Lạc cướp đom đóm - Regression)
try {
  const drifterOut = path.join(outDir, 'test_drifter.jsonl');
  execSync(`node src/headless.js --seed 123 --night 2 --scenario tests/scenarios/drifter.scenario.json --ticks 10 --out "${drifterOut}"`, { cwd: rootDir });

  const lines = fs.readFileSync(drifterOut, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const stealEv = lines.find(l => l.type === 'event' && l.name === 'drifter_steal');

  assert(!!stealEv && stealEv.data.amount === 3 && stealEv.data.carried === 3, "Test 7: Gió Lạc cướp đúng 3 đom đóm", "Gió Lạc cướp không đúng");
} catch (e) {
  assert(false, "Test 7: Gió Lạc", e.message);
}

// Test 8: Wind Charm Pickup (Bùa Gió - Regression)
try {
  const charmScenarioPath = path.join(outDir, 'charm_scenario.json');
  fs.writeFileSync(charmScenarioPath, JSON.stringify({
    player: { pos: [35, 0, 0], carried: 0, flames: 3 },
    random_motes: false,
    random_shades: false,
    motes: [],
    shades: [],
    charms: [{ id: "C1", pos: [35, 0, 0], available: true }]
  }));

  const charmOut = path.join(outDir, 'test_charm.jsonl');
  execSync(`node src/headless.js --seed 123 --night 2 --scenario "${charmScenarioPath}" --ticks 5 --out "${charmOut}"`, { cwd: rootDir });

  const lines = fs.readFileSync(charmOut, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const charmEv = lines.find(l => l.type === 'event' && l.name === 'charm_picked');

  assert(!!charmEv && charmEv.data.charm_id === 'C1' && charmEv.data.charm_ticks === 600, "Test 8: Nhặt Bùa Gió tăng tốc & giảm hồi lướt", "Không tìm thấy charm_picked event");
} catch (e) {
  assert(false, "Test 8: Bùa Gió", e.message);
}

// Test 9: Fall Off Island (Rơi khỏi đảo Y < -10 - Regression)
try {
  const fallScenarioPath = path.join(outDir, 'fall_scenario.json');
  fs.writeFileSync(fallScenarioPath, JSON.stringify({
    player: { pos: [45, -11, 0], carried: 4, flames: 3 },
    random_motes: false,
    random_shades: false,
    motes: [],
    shades: []
  }));

  const fallOut = path.join(outDir, 'test_fall.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --scenario "${fallScenarioPath}" --ticks 5 --out "${fallOut}"`, { cwd: rootDir });

  const lines = fs.readFileSync(fallOut, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const fallEv = lines.find(l => l.type === 'event' && l.name === 'player_hit' && l.data.by === 'fall');

  assert(!!fallEv && fallEv.data.flames === 2 && fallEv.data.lost === 4, "Test 9: Rơi khỏi đảo trừ 1 lửa & mất hết đom đóm", "Fall event không đúng");
} catch (e) {
  assert(false, "Test 9: Rơi khỏi đảo", e.message);
}

// Test 10: Pause / Resume Logic (Regression)
try {
  const pauseInputsPath = path.join(outDir, 'pause_inputs.json');
  fs.writeFileSync(pauseInputsPath, JSON.stringify({
    frames: [
      { tick: 5, pause: true },
      { tick: 6, pause: false },
      { tick: 15, pause: true },
      { tick: 16, pause: false }
    ]
  }));

  const pauseOut = path.join(outDir, 'test_pause.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --inputs "${pauseInputsPath}" --ticks 25 --out "${pauseOut}"`, { cwd: rootDir });

  const lines = fs.readFileSync(pauseOut, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const pausedEv = lines.find(l => l.type === 'event' && l.name === 'paused');
  const resumedEv = lines.find(l => l.type === 'event' && l.name === 'resumed');
  const snap10 = lines.find(l => l.type === 'snapshot' && l.tick === 10);

  assert(!!pausedEv && !!resumedEv, "Test 10: Sự kiện Tạm dừng và Tiếp tục (paused / resumed)", "Thiếu paused hoặc resumed event");
  assert(snap10 && snap10.state === 'paused', "Test 10: Snapshot ghi nhận state: 'paused'", `Snapshot state: ${snap10 ? snap10.state : 'null'}`);
} catch (e) {
  assert(false, "Test 10: Tạm dừng / Tiếp tục", e.message);
}

// Test 11: Performance Benchmark (Đêm đầy đủ 18,000 - 21,600 ticks <= 30s)
try {
  const tStart = Date.now();
  const perfOut = path.join(outDir, 'test_perf.jsonl');
  execSync(`node src/headless.js --seed 42 --night 3 --ticks 18000 --snapshot-every 3600 --out "${perfOut}"`, { cwd: rootDir });
  const durationMs = Date.now() - tStart;
  const durationSec = durationMs / 1000.0;

  assert(durationSec <= 30.0, `Test 11: Hiệu năng Đêm 3 đạt chuẩn (${durationSec.toFixed(2)}s <= 30s)`, `Quá thời gian: ${durationSec}s`);
} catch (e) {
  assert(false, "Test 11: Hiệu năng", e.message);
}

// ==========================================
// CÁC TEST MỚI PHASE 3 — CONTRACT V1.2
// ==========================================

// Test 12: Nhiên liệu đèn tự tiêu hao 1.0/s và tắt khi fuel <= 0 (lantern_out)
try {
  const outPath = path.join(outDir, 'test_lantern_out.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --scenario tests/scenarios/fuel_decay.scenario.json --ticks 35 --out "${outPath}"`, { cwd: rootDir });

  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const outEv = lines.find(l => l.type === 'event' && l.name === 'lantern_out');
  const snapEnd = lines.filter(l => l.type === 'snapshot').pop();
  const l1Snap = snapEnd ? snapEnd.lanterns.find(l => l.id === 'L1') : null;

  assert(!!outEv && outEv.data.lantern_id === 'L1' && outEv.tick === 30, "Test 12: Đèn tắt khi cạn dầu và phát sự kiện lantern_out tại tick 30", `outEv: ${JSON.stringify(outEv)}`);
  assert(l1Snap && l1Snap.lit === false && l1Snap.fuel === 0 && l1Snap.ever_lit === true && l1Snap.deposited === 0, "Test 12: Đèn tắt nhớ ever_lit = true và fuel = 0", `l1Snap: ${JSON.stringify(l1Snap)}`);
} catch (e) {
  assert(false, "Test 12: Đèn cạn dầu & lantern_out", e.message);
}

// Test 13: Thắp lại đèn từng sáng (ever_lit) chỉ tốn 5 đom đóm (relight = true)
try {
  const outPath = path.join(outDir, 'test_relight.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --scenario tests/scenarios/relight.scenario.json --inputs tests/scenarios/relight.inputs.json --ticks 10 --out "${outPath}"`, { cwd: rootDir });

  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const depEv = lines.find(l => l.type === 'event' && l.name === 'deposit');
  const litEv = lines.find(l => l.type === 'event' && l.name === 'lantern_lit');
  const snapEnd = lines.filter(l => l.type === 'snapshot').pop();
  const l1Snap = snapEnd ? snapEnd.lanterns.find(l => l.id === 'L1') : null;

  assert(!!depEv && depEv.data.amount === 5, "Test 13: Thắp lại chỉ nạp 5 đom đóm (relight_cost = 5)", `deposit: ${JSON.stringify(depEv)}`);
  assert(!!litEv && litEv.data.relight === true, "Test 13: Phát sự kiện lantern_lit với relight: true", `litEv: ${JSON.stringify(litEv)}`);
  assert(l1Snap && l1Snap.relit_count === 1 && l1Snap.fuel > 90, "Test 13: Snapshot ghi nhận relit_count: 1 và fuel đầy", `l1Snap: ${JSON.stringify(l1Snap)}`);
} catch (e) {
  assert(false, "Test 13: Thắp lại đèn", e.message);
}

// Test 14: Châm dầu đèn đang sáng (refuel event)
try {
  const outPath = path.join(outDir, 'test_refuel.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --scenario tests/scenarios/refuel.scenario.json --inputs tests/scenarios/refuel.inputs.json --ticks 10 --out "${outPath}"`, { cwd: rootDir });

  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const refuelEv = lines.find(l => l.type === 'event' && l.name === 'refuel');
  const snapEnd = lines.filter(l => l.type === 'snapshot').pop();

  assert(!!refuelEv && refuelEv.data.lantern_id === 'L1' && refuelEv.data.amount === 2 && refuelEv.data.fuel === 100, "Test 14: Châm dầu đèn đang sáng nạp ceil((100-85)/10)=2 đom đóm", `refuelEv: ${JSON.stringify(refuelEv)}`);
  assert(snapEnd && snapEnd.player.carried === 3, "Test 14: Mây bị trừ đúng 2 đom đóm (5 -> 3)", `carried: ${snapEnd ? snapEnd.player.carried : null}`);
} catch (e) {
  assert(false, "Test 14: Châm dầu", e.message);
}

// Test 15: Đèn đầy dầu (used = 0) không tương tác, không phát sự kiện
try {
  const outPath = path.join(outDir, 'test_refuel_full.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --scenario tests/scenarios/refuel_full.scenario.json --inputs tests/scenarios/refuel.inputs.json --ticks 10 --out "${outPath}"`, { cwd: rootDir });

  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const refuelEv = lines.find(l => l.type === 'event' && l.name === 'refuel');
  const depEv = lines.find(l => l.type === 'event' && l.name === 'deposit');
  const snapEnd = lines.filter(l => l.type === 'snapshot').pop();

  assert(!refuelEv && !depEv, "Test 15: Đèn đầy dầu không nhận tương tác và không phát sự kiện", `Tìm thấy refuel hoặc deposit`);
  assert(snapEnd && snapEnd.player.carried === 5, "Test 15: Đom đóm mang theo không bị trừ khi đèn đầy", `carried: ${snapEnd ? snapEnd.player.carried : null}`);
} catch (e) {
  assert(false, "Test 15: Đèn đầy dầu", e.message);
}

// Test 16: Bóng Mực hút dầu (drain) phát fuel_drain mỗi 60 ticks
try {
  const outPath = path.join(outDir, 'test_shade_drain.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --scenario tests/scenarios/shade_drain.scenario.json --ticks 65 --out "${outPath}"`, { cwd: rootDir });

  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const drainEv = lines.find(l => l.type === 'event' && l.name === 'fuel_drain');
  const snapEnd = lines.filter(l => l.type === 'snapshot').pop();

  // 60 ticks hút: 60 * 1/60 (tự hao) + 60 * 5/60 (hút) = 1.0 + 5.0 = 6.0 fuel. 20 - 6 = 14.0 fuel
  assert(!!drainEv && drainEv.tick === 60 && drainEv.data.lantern_id === 'L1' && drainEv.data.shade_id === 'S1' && drainEv.data.fuel === 14, "Test 16: Bóng Mực hút 5/s phát fuel_drain tại tick 60 còn 14 fuel", `drainEv: ${JSON.stringify(drainEv)}`);
  assert(snapEnd && snapEnd.shades.find(s => s.id === 'S1').state === 'drain', "Test 16: Trạng thái Bóng Mực trong snapshot là 'drain'", `shades: ${JSON.stringify(snapEnd.shades)}`);
} catch (e) {
  assert(false, "Test 16: Bóng Mực hút dầu", e.message);
}

// Test 17: Mất vùng an toàn khi fuel < 30 & Bóng Mực wander tự tìm đèn yếu
try {
  const outPath = path.join(outDir, 'test_safe_zone_fuel.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --scenario tests/scenarios/safe_zone_fuel.scenario.json --ticks 30 --out "${outPath}"`, { cwd: rootDir });

  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const snapEnd = lines.filter(l => l.type === 'snapshot').pop();
  const s1 = snapEnd ? snapEnd.shades.find(s => s.id === 'S1') : null;

  assert(s1 && (s1.state === 'drain' || s1.pos[2] < 26.5), "Test 17: Bóng Mực không bị đẩy lùi và tiếp cận đèn yếu (fuel < 30)", `s1: ${JSON.stringify(s1)}`);
} catch (e) {
  assert(false, "Test 17: Vùng an toàn khi cạn dầu", e.message);
}

// Test 18: Đẩy lùi Bóng Mực khi châm dầu lên >= 30
try {
  const outPath = path.join(outDir, 'test_refuel_push.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --scenario tests/scenarios/refuel_push.scenario.json --inputs tests/scenarios/refuel_push.inputs.json --ticks 5 --snapshot-every 5 --out "${outPath}"`, { cwd: rootDir });

  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const refuelEv = lines.find(l => l.type === 'event' && l.name === 'refuel');
  const snapEnd = lines.filter(l => l.type === 'snapshot').pop();
  const s1 = snapEnd ? snapEnd.shades.find(s => s.id === 'S1') : null;

  // L1 at [0, 0, 25], safe_radius 6.0m -> S1 pushed to edge at distance 6.0m ([0, 0, 31])
  assert(!!refuelEv && refuelEv.data.fuel >= 30, "Test 18: Đèn được châm dầu lên >= 30", `refuel: ${JSON.stringify(refuelEv)}`);
  assert(s1 && s1.state !== 'drain' && s1.pos[2] >= 30.0, "Test 18: Bóng Mực bị đẩy ra mép vùng 6m và thoát khỏi trạng thái drain", `s1: ${JSON.stringify(s1)}`);
} catch (e) {
  assert(false, "Test 18: Đẩy lùi Bóng Mực khi châm dầu", e.message);
}

// Test 19: Tỏa Sáng trúng Bóng Mực đang drain nhận +15 điểm
try {
  const outPath = path.join(outDir, 'test_pulse_drain.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --scenario tests/scenarios/pulse_drain.scenario.json --inputs tests/scenarios/pulse_drain.inputs.json --ticks 5 --snapshot-every 5 --out "${outPath}"`, { cwd: rootDir });

  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const pulseEv = lines.find(l => l.type === 'event' && l.name === 'pulse');
  const snapEnd = lines.filter(l => l.type === 'snapshot').pop();

  assert(!!pulseEv && pulseEv.data.stunned_ids.includes('S1'), "Test 19: Tỏa Sáng trúng Bóng Mực đang drain", `pulse: ${JSON.stringify(pulseEv)}`);
  assert(snapEnd && snapEnd.score === 15, "Test 19: Cộng đủ +15 điểm khi choáng Bóng Mực đang drain", `score: ${snapEnd ? snapEnd.score : null}`);
} catch (e) {
  assert(false, "Test 19: Điểm choáng drain", e.message);
}

// Test 20: Sức chứa tăng dần (Capacity scaling)
try {
  const { GameSimulation } = require('../src/engine/GameSimulation');
  const sim = new GameSimulation({
    scenario: { player: { successful_lights: 3 } }
  });
  const snap = sim.getSnapshot();

  assert(snap.player.capacity === 16, "Test 20: Sức chứa = 10 + 2 * 3 = 16 (tối đa 20)", `capacity: ${snap.player.capacity}`);
} catch (e) {
  assert(false, "Test 20: Sức chứa tăng dần", e.message);
}

// Test 21: Luật thắng bình minh dawn_survived & tính điểm bình minh
try {
  const outPath = path.join(outDir, 'test_dawn_win.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --scenario tests/scenarios/dawn_win.scenario.json --ticks 10 --out "${outPath}"`, { cwd: rootDir });

  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const winEv = lines.find(l => l.type === 'event' && l.name === 'game_over' && l.data.result === 'won');
  const endLine = lines.find(l => l.type === 'end');

  assert(!!winEv && winEv.data.reason === 'dawn_survived', "Test 21: Thắng bình minh phát game_over với reason: dawn_survived", `winEv: ${JSON.stringify(winEv)}`);
  // 3 đèn sáng (100, 80, 50 fuel sau 6 ticks hao 0.1: 99.9, 79.9, 49.9 -> floor: 99, 79, 49) + 3 lửa (150)
  // Điểm: (50 + 99) + (50 + 79) + (50 + 49) + 3 * 50 = 149 + 129 + 99 + 150 = 527
  assert(endLine && endLine.score === 527, "Test 21: Tính đúng điểm bình minh (50+fuel mỗi đèn + 50 mỗi ngọn lửa = 527)", `score: ${endLine ? endLine.score : null}`);
} catch (e) {
  assert(false, "Test 21: Thắng bình minh", e.message);
}

// Test 22: Thua bình minh khi số đèn sáng dưới 60% (reason: dawn)
try {
  const outPath = path.join(outDir, 'test_dawn_loss.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --scenario tests/scenarios/dawn_loss.scenario.json --ticks 10 --out "${outPath}"`, { cwd: rootDir });

  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const lossEv = lines.find(l => l.type === 'event' && l.name === 'game_over' && l.data.result === 'lost');

  assert(!!lossEv && lossEv.data.reason === 'dawn', "Test 22: Thua bình minh phát game_over với reason: dawn", `lossEv: ${JSON.stringify(lossEv)}`);
} catch (e) {
  assert(false, "Test 22: Thua bình minh", e.message);
}

// Test 23: Không thắng sớm khi thắp hết đèn
try {
  const outPath = path.join(outDir, 'test_no_early_win.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --scenario tests/scenarios/no_early_win.scenario.json --ticks 60 --out "${outPath}"`, { cwd: rootDir });

  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const gameOverEv = lines.find(l => l.type === 'event' && l.name === 'game_over');
  const snapEnd = lines.filter(l => l.type === 'snapshot').pop();

  assert(!gameOverEv, "Test 23: Thắp hết đèn không kết thúc Đêm (không còn thắng sớm all_lit)", `Tìm thấy gameOverEv: ${JSON.stringify(gameOverEv)}`);
  assert(snapEnd && snapEnd.state === 'playing', "Test 23: Trạng thái game vẫn là 'playing' khi tất cả đèn sáng", `state: ${snapEnd ? snapEnd.state : null}`);
} catch (e) {
  assert(false, "Test 23: Không thắng sớm", e.message);
}

// Test 24: Kiểm tra định dạng Snapshot Contract v1.2
try {
  const outPath = path.join(outDir, 'test_snapshot_v12.jsonl');
  execSync(`node src/headless.js --seed 42 --night 1 --ticks 10 --out "${outPath}"`, { cwd: rootDir });

  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const snap = lines.find(l => l.type === 'snapshot' && l.tick === 0);

  const hasCapacity = snap && typeof snap.player.capacity === 'number';
  const hasLanternFuel = snap && snap.lanterns.every(l => typeof l.fuel === 'number' && typeof l.ever_lit === 'boolean' && typeof l.relit_count === 'number');

  assert(hasCapacity, "Test 24: Snapshot player có capacity", `player: ${JSON.stringify(snap ? snap.player : null)}`);
  assert(hasLanternFuel, "Test 24: Snapshot mỗi đèn có fuel (1 số thập phân), ever_lit, relit_count", `lanterns: ${JSON.stringify(snap ? snap.lanterns : null)}`);
} catch (e) {
  assert(false, "Test 24: Snapshot Contract v1.2", e.message);
}

console.log(`\n=== TỔNG KẾT PHASE 3: ${passed} PASS, ${failed} FAIL ===`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("Toàn bộ test Phase 3 (Contract v1.2) đã ĐẠT hoàn hảo 100%!");
}
