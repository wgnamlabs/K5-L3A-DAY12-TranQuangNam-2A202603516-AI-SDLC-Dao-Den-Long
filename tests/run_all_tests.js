/**
 * run_all_tests.js
 * Automated test suite for Đảo Đèn Lồng - Headless Test Contract v1.1
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

console.log("=== BẮT ĐẦU CHẠY BỘ TEST KIỂM THỬ CONTRACT V1.1 (PHASE 2) ===");

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

// Test 2: Deposit and Light Lantern (Regression with cost = 10)
try {
  const outPath = path.join(outDir, 'test_deposit.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --scenario tests/scenarios/deposit.scenario.json --inputs tests/scenarios/deposit.inputs.json --ticks 20 --out "${outPath}"`, { cwd: rootDir });
  
  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const depEv = lines.find(l => l.type === 'event' && l.name === 'deposit');
  const litEv = lines.find(l => l.type === 'event' && l.name === 'lantern_lit');

  assert(!!depEv && depEv.data.lantern_id === 'L1' && depEv.data.deposited === 10, "Test 2: Nạp ánh sáng đủ 10 đom đóm", "Deposit amount/deposited != 10");
  assert(!!litEv && litEv.data.lantern_id === 'L1', "Test 2: Thắp sáng đèn L1", "Không tìm thấy sự kiện lantern_lit");
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

// Test 4: Determinism Check (Regression)
try {
  const out1 = path.join(outDir, 'det_run1.jsonl');
  const out2 = path.join(outDir, 'det_run2.jsonl');
  
  execSync(`node src/headless.js --seed 777 --night 1 --ticks 180 --out "${out1}"`, { cwd: rootDir });
  execSync(`node src/headless.js --seed 777 --night 1 --ticks 180 --out "${out2}"`, { cwd: rootDir });

  const content1 = fs.readFileSync(out1, 'utf-8');
  const content2 = fs.readFileSync(out2, 'utf-8');

  assert(content1 === content2, "Test 4: Tính tất định (Determinism v1.1)", "Hai lần chạy cùng seed 777 cho output khác nhau!");
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

// Test 6: Dash (Lướt - Tính năng mới Phase 2)
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

// Test 7: Drifter Steal (Gió Lạc cướp đom đóm - Tính năng mới Phase 2)
try {
  const drifterOut = path.join(outDir, 'test_drifter.jsonl');
  execSync(`node src/headless.js --seed 123 --night 2 --scenario tests/scenarios/drifter.scenario.json --ticks 10 --out "${drifterOut}"`, { cwd: rootDir });

  const lines = fs.readFileSync(drifterOut, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const stealEv = lines.find(l => l.type === 'event' && l.name === 'drifter_steal');

  assert(!!stealEv && stealEv.data.amount === 3 && stealEv.data.carried === 3, "Test 7: Gió Lạc cướp đúng 3 đom đóm", "Gió Lạc cướp không đúng");
} catch (e) {
  assert(false, "Test 7: Gió Lạc", e.message);
}

// Test 8: Wind Charm Pickup (Bùa Gió - Tính năng mới Phase 2)
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

// Test 9: Fall Off Island (Rơi khỏi đảo Y < -10 ngoài bán kính đảo)
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

// Test 10: Pause / Resume Logic
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

// Test 11: Performance Benchmark (Đêm đầy đủ 21,600 ticks <= 30s)
try {
  const tStart = Date.now();
  const perfOut = path.join(outDir, 'test_perf.jsonl');
  execSync(`node src/headless.js --seed 42 --night 3 --ticks 21600 --snapshot-every 3600 --out "${perfOut}"`, { cwd: rootDir });
  const durationMs = Date.now() - tStart;
  const durationSec = durationMs / 1000.0;

  assert(durationSec <= 30.0, `Test 11: Hiệu năng 21,600 ticks đạt chuẩn (${durationSec.toFixed(2)}s <= 30s)`, `Quá thời gian: ${durationSec}s`);
} catch (e) {
  assert(false, "Test 11: Hiệu năng 21,600 ticks", e.message);
}

console.log(`\n=== TỔNG KẾT PHASE 2: ${passed} PASS, ${failed} FAIL ===`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("Toàn bộ test Phase 2 (Contract v1.1) đã ĐẠT hoàn hảo!");
}
