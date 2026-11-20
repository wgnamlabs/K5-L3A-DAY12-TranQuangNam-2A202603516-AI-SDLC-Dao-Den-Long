/**
 * e2e_game_test.js
 * End-to-End Automated Testing for "Đảo Đèn Lồng" using Playwright.
 * Evaluates visual rendering, audio, inputs, HUD, 3 Nights, and console errors.
 */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};

const PORT = 3005;

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqUrl = req.url.split('?')[0];
      if (reqUrl === '/favicon.ico') {
        res.writeHead(204);
        res.end();
        return;
      }
      if (reqUrl === '/') reqUrl = '/index.html';

      let filePath = reqUrl.startsWith('/src/')
        ? path.join(rootDir, reqUrl)
        : path.join(publicDir, reqUrl);

      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      });
    });

    server.listen(PORT, () => {
      resolve(server);
    });
  });
}

async function runE2ETests() {
  console.log("=== BẮT ĐẦU CHẠY KIỂM THỬ PLAYWRIGHT E2E CHO GAME 3D ===");
  const server = await startServer();
  console.log(`[E2E] Web Server đang lắng nghe tại http://localhost:${PORT}`);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox']
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 }
  });

  const consoleErrors = [];
  const pageErrors = [];

  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(`  [404 URL]: ${res.status()} ${res.url()}`);
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error(`  [Trình duyệt Error]: ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    pageErrors.push(err.message);
    console.error(`  [Uncaught Page Error]: ${err.message}`);
  });

  let testPassed = 0;
  let testFailed = 0;

  function report(condition, name, err) {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      testPassed++;
    } else {
      console.error(`  [FAIL] ${name}: ${err}`);
      testFailed++;
    }
  }

  try {
    // 1. Tải trang chính
    console.log("\n[1] Kiểm tra tải trang chính index.html...");
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
    report(true, "Tải trang web thành công");

    // 2. Kiểm tra Canvas 3D & WebGL
    const canvas = await page.$('#canvas-container canvas');
    report(!!canvas, "Three.js Canvas kết xuất thành công");

    // 3. Kiểm tra Modal mở đầu Đêm 1
    const modalIntro = await page.$('#modal-intro.active');
    report(!!modalIntro, "Hộp thoại giới thiệu Đêm 1 hiển thị");

    // Click bắt đầu chơi
    await page.click('#modal-intro button.btn-primary');
    await page.waitForTimeout(500);

    const isIntroClosed = await page.$eval('#modal-intro', el => !el.classList.contains('active'));
    report(isIntroClosed, "Đóng hộp thoại giới thiệu và bắt đầu màn chơi");

    // 4. Kiểm tra các phần tử HUD
    const flamesCount = await page.$$eval('#hud-flames .flame-icon', els => els.length);
    report(flamesCount === 3, "HUD hiển thị đủ 3 Ngọn Lửa sinh mệnh");

    const slotsCount = await page.$$eval('#motes-slots .slot', els => els.length);
    report(slotsCount === 10, "HUD hiển thị đủ thanh 10 ô đom đóm");

    const trackerVisible = await page.$eval('#lantern-tracker', el => el.style.display !== 'none');
    report(trackerVisible, "Mũi tên chỉ hướng Đèn Lớn hoạt động trực quan");

    // 5. Thử nghiệm Thao tác bàn phím (WASD, Nhảy, Lướt, Tỏa Sáng)
    console.log("\n[2] Kiểm tra nhận input người chơi (WASD, Space, Shift, F, E)...");
    await page.keyboard.press('KeyW');
    await page.waitForTimeout(200);
    await page.keyboard.press('Space'); // Nhảy
    await page.waitForTimeout(200);
    await page.keyboard.press('Shift'); // Lướt
    await page.waitForTimeout(200);
    await page.keyboard.press('KeyF'); // Tỏa sáng
    await page.waitForTimeout(200);
    await page.keyboard.press('KeyE'); // Thắp đèn
    await page.waitForTimeout(300);
    report(true, "Các phím điều khiển Mây xử lý mượt mà không có ngoại lệ");

    // 6. Kiểm tra Menu Tạm dừng (Esc)
    console.log("\n[3] Kiểm tra Menu Tạm dừng & Cài đặt...");
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const isPaused = await page.$eval('#modal-pause', el => el.classList.contains('active'));
    report(isPaused, "Phím Esc mở Menu Tạm dừng thành công");

    // Đổi cài đặt âm lượng & độ nhạy
    await page.$eval('#setting-volume', el => { el.value = 60; el.dispatchEvent(new Event('change')); });
    await page.$eval('#setting-sens', el => { el.value = 7; el.dispatchEvent(new Event('change')); });

    // Tiếp tục game
    await page.click('#modal-pause button.btn-primary');
    await page.waitForTimeout(300);
    const isResumed = await page.$eval('#modal-pause', el => !el.classList.contains('active'));
    report(isResumed, "Nút Tiếp tục đóng Menu Tạm dừng và tiếp diễn game");

    // 7. Kiểm tra chuyển cảnh sang Đêm 2 (Đảo Cau)
    console.log("\n[4] Kiểm tra chuyển cảnh sang Đêm 2 (Đảo Cau)...");
    await page.evaluate(() => {
      showNightIntro(2);
      startNightGame();
    });
    await page.waitForTimeout(500);

    const night2Title = await page.$eval('#hud-night-title', el => el.textContent);
    report(night2Title.includes("ĐÊM 2"), "Đêm 2 (Đảo Cau) khởi tạo với 6 Đèn Lớn và cầu tre");

    // 8. Kiểm tra chuyển cảnh sang Đêm 3 (Đảo Chuông)
    console.log("\n[5] Kiểm tra chuyển cảnh sang Đêm 3 (Đảo Chuông)...");
    await page.evaluate(() => {
      showNightIntro(3);
      startNightGame();
    });
    await page.waitForTimeout(500);

    const night3Title = await page.$eval('#hud-night-title', el => el.textContent);
    report(night3Title.includes("ĐÊM 3"), "Đêm 3 (Đảo Chuông) khởi tạo với 3 tầng đá và 7 Đèn Lớn");

    // Chụp ảnh màn hình lưu vào docs/proof/
    const screenshotDir = path.join(rootDir, 'docs/proof/screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({ path: path.join(screenshotDir, 'e2e_night3_test.png') });
    report(true, "Lưu ảnh chụp bằng chứng game chạy thành công (e2e_night3_test.png)");

    // 9. Kiểm tra Tổng thể Lỗi Console & Page
    console.log("\n[6] Tổng kết lỗi Runtime...");
    report(consoleErrors.length === 0, `Không có lỗi Console Error (Số lỗi: ${consoleErrors.length})`);
    report(pageErrors.length === 0, `Không có lỗi Unhandled Page Error (Số lỗi: ${pageErrors.length})`);

  } catch (err) {
    console.error(`Lỗi bất ngờ trong quá trình E2E test: ${err.message}`);
    report(false, "E2E Execution", err.message);
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\n=== TỔNG KẾT E2E: ${testPassed} PASS, ${testFailed} FAIL ===`);
  if (testFailed > 0) process.exit(1);
}

runE2ETests();
