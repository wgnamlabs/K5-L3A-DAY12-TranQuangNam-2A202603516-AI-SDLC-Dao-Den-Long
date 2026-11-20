#!/usr/bin/env node

/**
 * headless.js
 * CLI Runner for Test Contract v1.1
 * Usage:
 *   node src/headless.js --seed <int> --night <1|2|3> [--scenario <file.json>] [--inputs <file.json>]
 *                        --ticks <int> --out <file.jsonl> [--snapshot-every <int, default 10>]
 */

const fs = require('fs');
const path = require('path');
const { GameSimulation } = require('./engine/GameSimulation');

function printErrorAndExit(msg, code = 1) {
  process.stderr.write(`[HEADLESS ERROR] ${msg}\n`);
  process.exit(code);
}

// 1. Parse arguments
const args = process.argv.slice(2);
const params = {
  seed: null,
  night: 1,
  scenario: null,
  inputs: null,
  ticks: null,
  out: null,
  snapshotEvery: 10
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--seed') {
    params.seed = parseInt(args[++i], 10);
  } else if (arg === '--night') {
    params.night = parseInt(args[++i], 10);
  } else if (arg === '--scenario') {
    params.scenario = args[++i];
  } else if (arg === '--inputs') {
    params.inputs = args[++i];
  } else if (arg === '--ticks') {
    params.ticks = parseInt(args[++i], 10);
  } else if (arg === '--out') {
    params.out = args[++i];
  } else if (arg === '--snapshot-every') {
    params.snapshotEvery = parseInt(args[++i], 10);
  } else {
    printErrorAndExit(`Unknown argument: ${arg}`, 1);
  }
}

if (params.seed === null || isNaN(params.seed)) {
  printErrorAndExit("Missing or invalid mandatory argument --seed <int>", 1);
}
if (params.night !== 1 && params.night !== 2 && params.night !== 3) {
  printErrorAndExit("Argument --night must be 1, 2, or 3", 1);
}
if (params.ticks === null || isNaN(params.ticks) || params.ticks < 0) {
  printErrorAndExit("Missing or invalid mandatory argument --ticks <int>", 1);
}
if (!params.out) {
  printErrorAndExit("Missing mandatory argument --out <file.jsonl>", 1);
}
if (isNaN(params.snapshotEvery) || params.snapshotEvery <= 0) {
  params.snapshotEvery = 10;
}

// 2. Load and validate scenario
let scenarioData = null;
if (params.scenario) {
  try {
    const rawScenario = fs.readFileSync(params.scenario, 'utf-8');
    scenarioData = JSON.parse(rawScenario);
    if (typeof scenarioData !== 'object' || scenarioData === null || Array.isArray(scenarioData)) {
      printErrorAndExit("Scenario file must be a JSON object", 2);
    }
  } catch (err) {
    printErrorAndExit(`Failed to parse scenario file: ${err.message}`, 2);
  }
}

// 3. Load and validate inputs
let inputsData = null;
const framesMap = new Map();
if (params.inputs) {
  try {
    const rawInputs = fs.readFileSync(params.inputs, 'utf-8');
    inputsData = JSON.parse(rawInputs);
    if (!inputsData || !Array.isArray(inputsData.frames)) {
      printErrorAndExit("Inputs file must contain a 'frames' array", 2);
    }

    let lastTick = -1;
    for (const frame of inputsData.frames) {
      if (typeof frame.tick !== 'number' || frame.tick <= lastTick) {
        printErrorAndExit(`Input frame ticks must be strictly increasing. Found tick ${frame.tick} after ${lastTick}`, 2);
      }
      lastTick = frame.tick;
      framesMap.set(frame.tick, frame);
    }
  } catch (err) {
    printErrorAndExit(`Failed to parse inputs file: ${err.message}`, 2);
  }
}

// Load tuning from game.contract.json if available
let contractTuning = {};
try {
  const contractPath = path.resolve(__dirname, '../game.contract.json');
  if (fs.existsSync(contractPath)) {
    const cData = JSON.parse(fs.readFileSync(contractPath, 'utf-8'));
    if (cData && cData.tuning) {
      contractTuning = cData.tuning;
    }
  }
} catch (e) {
  // Use defaults
}

// 4. Initialize Game Simulation
let sim;
try {
  sim = new GameSimulation({
    seed: params.seed,
    night: params.night,
    tuning: contractTuning,
    scenario: scenarioData
  });
} catch (err) {
  printErrorAndExit(`Initialization error: ${err.message}`, 1);
}

// Ensure output directory exists
try {
  const outDir = path.dirname(path.resolve(params.out));
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
} catch (e) {
  printErrorAndExit(`Cannot create output directory: ${e.message}`, 1);
}

const outStream = fs.createWriteStream(params.out, { encoding: 'utf-8' });
outStream.on('error', (err) => {
  printErrorAndExit(`Cannot write output file: ${err.message}`, 1);
});

function writeLine(obj) {
  outStream.write(JSON.stringify(obj) + '\n');
}

// Tick 0 Snapshot: initial state after scenario setup, before applying inputs
writeLine(sim.getSnapshot());

// Emit night_start event at tick 0
writeLine({
  type: "event",
  tick: 0,
  name: "night_start",
  data: { night: params.night }
});

// 5. Execution loop: N steps (k = 0 .. ticks - 1)
const targetTicks = params.ticks;

for (let k = 0; k < targetTicks; k++) {
  if (framesMap.has(k)) {
    sim.applyInputFrame(framesMap.get(k));
  }

  const events = sim.step();

  for (const ev of events) {
    writeLine(ev);
  }

  if ((k + 1) % params.snapshotEvery === 0) {
    writeLine(sim.getSnapshot());
  }

  if (sim.state !== 'playing' && sim.state !== 'paused') {
    break;
  }
}

// End line: mandatory last line
const endLine = {
  type: "end",
  ticks: sim.sim_tick,
  state: sim.state,
  score: sim.score
};
writeLine(endLine);

outStream.end(() => {
  process.exit(0);
});
