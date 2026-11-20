/**
 * run_all_tests.js
 * Automated test suite for Đảo Đèn Lồng - Headless Test Contract v1.0
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

console.log("=== BẮT ĐẦU CHẠY BỘ TEST KIỂM THỬ CONTRACT V1.0 ===");

// Test 1: Mote Pickup
try {
  const outPath = path.join(outDir, 'test_pickup.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --scenario tests/scenarios/pickup.scenario.json --inputs tests/scenarios/pickup.inputs.json --ticks 60 --out "${outPath}"`, { cwd: rootDir });
  
  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const pickupEv = lines.find(l => l.type === 'event' && l.name === 'mote_picked');
  const endLine = lines.find(l => l.type === 'end');

  assert(!!pickupEv && pickupEv.data.carried === 1, "Test 1: Nhặt đom đóm", "Không tìm thấy sự kiện mote_picked hoặc carried != 1");
  assert(endLine && endLine.ticks === 60, "Test 1: Kết thúc đúng tick", "End line không đúng tick 60");
} catch (e) {
  assert(false, "Test 1: Nhặt đom đóm", e.message);
}

// Test 2: Deposit and Light Lantern
try {
  const outPath = path.join(outDir, 'test_deposit.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --scenario tests/scenarios/deposit.scenario.json --inputs tests/scenarios/deposit.inputs.json --ticks 20 --out "${outPath}"`, { cwd: rootDir });
  
  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const depEv = lines.find(l => l.type === 'event' && l.name === 'deposit');
  const litEv = lines.find(l => l.type === 'event' && l.name === 'lantern_lit');

  assert(!!depEv && depEv.data.lantern_id === 'L1' && depEv.data.deposited === 5, "Test 2: Nạp ánh sáng", "Không tìm thấy sự kiện deposit hợp lệ");
  assert(!!litEv && litEv.data.lantern_id === 'L1', "Test 2: Thắp sáng đèn L1", "Không tìm thấy sự kiện lantern_lit");
} catch (e) {
  assert(false, "Test 2: Nạp ánh sáng & Thắp đèn", e.message);
}

// Test 3: Pulse Stun
try {
  const outPath = path.join(outDir, 'test_pulse.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --scenario tests/scenarios/pulse.scenario.json --inputs tests/scenarios/pulse.inputs.json --ticks 20 --out "${outPath}"`, { cwd: rootDir });
  
  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const pulseEv = lines.find(l => l.type === 'event' && l.name === 'pulse');

  assert(!!pulseEv && Array.isArray(pulseEv.data.stunned_ids) && pulseEv.data.stunned_ids.includes("S1"), "Test 3: Tỏa sáng làm choáng Bóng Mực", "S1 không bị stunned");
} catch (e) {
  assert(false, "Test 3: Tỏa sáng", e.message);
}

// Test 4: Determinism Check (Hai lần chạy cùng seed/scenario/inputs phải cho output giống hệt nhau)
try {
  const out1 = path.join(outDir, 'det_run1.jsonl');
  const out2 = path.join(outDir, 'det_run2.jsonl');
  
  execSync(`node src/headless.js --seed 777 --night 1 --ticks 180 --out "${out1}"`, { cwd: rootDir });
  execSync(`node src/headless.js --seed 777 --night 1 --ticks 180 --out "${out2}"`, { cwd: rootDir });

  const content1 = fs.readFileSync(out1, 'utf-8');
  const content2 = fs.readFileSync(out2, 'utf-8');

  assert(content1 === content2, "Test 4: Tính tất định (Determinism)", "Hai lần chạy cùng seed 777 cho output khác nhau!");
} catch (e) {
  assert(false, "Test 4: Tính tất định", e.message);
}

// Test 5: Malformed Inputs Validation (Mã thoát 2 khi tick không tăng nghiêm ngặt)
try {
  const badInputsPath = path.join(outDir, 'bad_inputs.json');
  fs.writeFileSync(badInputsPath, JSON.stringify({
    frames: [
      { tick: 10, move: [1, 0] },
      { tick: 5, move: [0, 1] } // Sai: tick giảm
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

// Test 6: Win Condition (Thắp cả 5 đèn)
try {
  const winScenarioPath = path.join(outDir, 'win_scenario.json');
  fs.writeFileSync(winScenarioPath, JSON.stringify({
    player: { pos: [0, 0, 21.0], carried: 5, flames: 3 },
    random_motes: false,
    random_shades: false,
    motes: [],
    shades: [],
    lanterns: [
      { id: "L1", pos: [0, 0, 22.0], lit: false, deposited: 0 },
      { id: "L2", pos: [20.92, 0, 6.8], lit: true, deposited: 5 },
      { id: "L3", pos: [12.93, 0, -17.8], lit: true, deposited: 5 },
      { id: "L4", pos: [-12.93, 0, -17.8], lit: true, deposited: 5 },
      { id: "L5", pos: [-20.92, 0, 6.8], lit: true, deposited: 5 }
    ]
  }));

  const winOut = path.join(outDir, 'test_win.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --scenario "${winScenarioPath}" --inputs tests/scenarios/deposit.inputs.json --ticks 30 --out "${winOut}"`, { cwd: rootDir });

  const lines = fs.readFileSync(winOut, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const winEv = lines.find(l => l.type === 'event' && l.name === 'game_over' && l.data.result === 'won' && l.data.reason === 'all_lit');
  const endLine = lines.find(l => l.type === 'end');

  assert(!!winEv, "Test 6: Điều kiện Thắng (All 5 lit)", "Không tìm thấy sự kiện game_over won all_lit");
  assert(endLine && endLine.state === 'won', "Test 6: Trạng thái End Line won", `End line state: ${endLine ? endLine.state : 'null'}`);
} catch (e) {
  assert(false, "Test 6: Điều kiện Thắng", e.message);
}

// Test 7: Shade Chase & Player Hit
try {
  const hitScenarioPath = path.join(outDir, 'hit_scenario.json');
  fs.writeFileSync(hitScenarioPath, JSON.stringify({
    player: { pos: [0, 0, 0], carried: 4, flames: 3 },
    random_motes: false,
    random_shades: false,
    motes: [],
    shades: [{ id: "S1", pos: [0, 0, 0.5] }], // Within shade_hit_radius (1.0m)
    lanterns: []
  }));

  const hitOut = path.join(outDir, 'test_hit.jsonl');
  execSync(`node src/headless.js --seed 123 --night 1 --scenario "${hitScenarioPath}" --ticks 5 --out "${hitOut}"`, { cwd: rootDir });

  const lines = fs.readFileSync(hitOut, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const hitEv = lines.find(l => l.type === 'event' && l.name === 'player_hit');

  assert(!!hitEv && hitEv.data.flames === 2 && hitEv.data.dropped === 2, "Test 7: Bóng Mực gây sát thương và rơi đom đóm", "Không tìm thấy sự kiện player_hit đúng");
} catch (e) {
  assert(false, "Test 7: Bóng Mực gây sát thương", e.message);
}

console.log(`\n=== TỔNG KẾT: ${passed} PASS, ${failed} FAIL ===`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("Toàn bộ test đã ĐẠT chuẩn xác!");
}
