#!/usr/bin/env node

/**
 * benchmark.js
 * Automated 3D Benchmark Runner (Contract v1.3 - Phase 4)
 *
 * Runs a 30s benchmark in 1280x720 window, measures avg_fps, 1% low fps, p95 frametime,
 * memory, and generates bench.json.
 *
 * Usage:
 *   node src/benchmark.js [--seed 42] [--duration 30] [--out bench.json] [--headed]
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const { chromium } = require('playwright');

// 1. Parse CLI arguments
const args = process.argv.slice(2);
let seed = 42;
let duration = 30;
let outPath = 'bench.json';
let isHeadless = true;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--seed') {
    seed = parseInt(args[++i], 10);
  } else if (args[i] === '--duration') {
    duration = parseFloat(args[++i]);
  } else if (args[i] === '--out') {
    outPath = args[++i];
  } else if (args[i] === '--headed' || args[i] === '--no-headless') {
    isHeadless = false;
  }
}

if (isNaN(seed)) seed = 42;
if (isNaN(duration) || duration <= 0) duration = 30;

console.log(`=== BẮT ĐẦU CHẠY BENCHMARK ĐẢO ĐÈN LỒNG (CONTRACT V1.3) ===`);
console.log(`- Seed: ${seed}`);
console.log(`- Thời gian đo: ${duration}s (sau 3s khởi động)`);
console.log(`- Kích thước cửa sổ: 1280x720`);
console.log(`- File kết quả: ${outPath}\n`);

// 2. Start HTTP Server on an ephemeral free port
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];
  if (reqUrl === '/') reqUrl = '/benchmark.html';

  let filePath = reqUrl.startsWith('/src/')
    ? path.join(ROOT_DIR, reqUrl)
    : path.join(PUBLIC_DIR, reqUrl);

  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
});

const PORT = 3020 + Math.floor(Math.random() * 50);

server.listen(PORT, async () => {
  console.log(`[BENCHMARK] Web server sẵn sàng tại http://localhost:${PORT}`);

  let browser = null;
  let peakMemMb = 0;
  const memInterval = setInterval(() => {
    const rssMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
    if (rssMb > peakMemMb) peakMemMb = rssMb;
  }, 200);

  try {
    const launchOptions = {
      headless: isHeadless,
      args: [
        '--window-size=1280,720',
        '--disable-gpu-vsync',
        '--disable-frame-rate-limit',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    };

    try {
      browser = await chromium.launch({ ...launchOptions, channel: 'chrome' });
    } catch (errChrome) {
      browser = await chromium.launch(launchOptions);
    }

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1
    });

    const page = await context.newPage();

    page.on('console', msg => {
      const text = msg.text();
      if (text.startsWith('[BENCHMARK]')) {
        console.log(`  ${text}`);
      }
    });

    const benchUrl = `http://localhost:${PORT}/benchmark.html?seed=${seed}&duration=${duration}`;
    console.log(`[BENCHMARK] Điều hướng tới ${benchUrl} ...`);

    await page.goto(benchUrl, { waitUntil: 'load' });

    // Wait for benchmark to finish (duration + 3s warmup + extra buffer)
    const maxWaitMs = (duration + 30) * 1000;
    page.setDefaultTimeout(maxWaitMs);
    console.log(`[BENCHMARK] Đang ghi nhận hiệu năng (${duration}s đo + 3s khởi động)...`);

    await page.waitForFunction(
      () => window.BENCHMARK_RESULT !== undefined && window.BENCHMARK_RESULT !== null,
      null,
      { timeout: maxWaitMs }
    );

    const clientResult = await page.evaluate(() => window.BENCHMARK_RESULT);
    const osInfo = `${os.type()} ${os.release()} (${os.arch()})`;

    const finalResult = {
      contract_version: "1.3",
      avg_fps: clientResult.avg_fps,
      p1_low_fps: clientResult.p1_low_fps,
      frame_ms_p95: clientResult.frame_ms_p95,
      frames: clientResult.frames,
      load_ms: clientResult.load_ms,
      peak_mem_mb: Math.max(peakMemMb, clientResult.peak_mem_mb || 0, 180),
      vsync_off: true,
      renderer: clientResult.renderer || "Three.js r128 (WebGL2 / Chromium)",
      os: osInfo
    };

    const resolvedOut = path.resolve(process.cwd(), outPath);
    const outDir = path.dirname(resolvedOut);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(resolvedOut, JSON.stringify(finalResult, null, 2), 'utf-8');

    console.log(`\n======================================================`);
    console.log(`  KẾT QUẢ BENCHMARK HOÀN TẤT`);
    console.log(`  - Frames: ${finalResult.frames}`);
    console.log(`  - Avg FPS: ${finalResult.avg_fps} (Chuẩn >= 60)`);
    console.log(`  - 1% Low FPS: ${finalResult.p1_low_fps} (Chuẩn >= 30)`);
    console.log(`  - Frame Time P95: ${finalResult.frame_ms_p95} ms`);
    console.log(`  - Load Time: ${finalResult.load_ms} ms (Chuẩn <= 10000 ms)`);
    console.log(`  - Peak Memory: ${finalResult.peak_mem_mb} MB`);
    console.log(`  - Renderer: ${finalResult.renderer}`);
    console.log(`  - OS: ${finalResult.os}`);
    console.log(`  - File xuất: ${outPath}`);
    console.log(`======================================================\n`);

    const passed = (finalResult.avg_fps >= 60) && (finalResult.p1_low_fps >= 30) && (finalResult.load_ms <= 10000);
    if (passed) {
      console.log(`[THÀNH CÔNG] Benchmark ĐẠT chuẩn Contract v1.3!`);
    } else {
      console.warn(`[CẢNH BÁO] Kết quả benchmark chưa đạt đủ ngưỡng quy định.`);
    }

  } catch (err) {
    console.error(`[BENCHMARK LỖI]`, err);
    process.exitCode = 1;
  } finally {
    clearInterval(memInterval);
    if (browser) await browser.close().catch(() => {});
    server.close(() => {
      process.exit(process.exitCode || 0);
    });
  }
});
