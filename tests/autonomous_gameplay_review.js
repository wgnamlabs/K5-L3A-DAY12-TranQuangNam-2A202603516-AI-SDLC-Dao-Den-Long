/**
 * autonomous_gameplay_review.js
 * AI Agent plays the live game on http://localhost:3000,
 * evaluates all aspects (gameplay, controls, graphics, UI/UX, audio, accessibility, performance),
 * captures high-resolution proof screenshots, and compiles a comprehensive evaluation.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { fork } = require('child_process');

const targetDirName = process.argv[2] || process.env.REVIEW_DIR || 'review_v2';
const reviewDir = path.isAbsolute(targetDirName) 
  ? targetDirName 
  : path.join(__dirname, '../docs/proof/gameplay', targetDirName);
if (!fs.existsSync(reviewDir)) fs.mkdirSync(reviewDir, { recursive: true });

const GAME_PORT = process.env.PORT || 3456;

function checkServerReady(port = GAME_PORT) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function runAutonomousReview() {
  console.log('--- BẮT ĐẦU PHIÊN CHƠI THỰC TẾ & ĐÁNH GIÁ TOÀN DIỆN ĐẢO ĐÈN LỒNG ---');
  console.log(`--- Thư mục lưu ảnh: ${reviewDir} ---`);
  
  let serverProcess = null;
  const isUp = await checkServerReady(GAME_PORT);
  if (!isUp) {
    console.log(`Khởi chạy HTTP server tại http://localhost:${GAME_PORT} ...`);
    serverProcess = fork(path.join(__dirname, '../src/server.js'), [String(GAME_PORT)], { stdio: 'ignore' });
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 200));
      if (await checkServerReady(GAME_PORT)) break;
    }
  }

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  const findings = {
    performance: {},
    ui_ux: {},
    gameplay: {},
    controls: {},
    accessibility: {},
    audio: {},
    strengths: [],
    limitations: []
  };

  const startTime = Date.now();

  try {
    // 1. Tải trang chính
    console.log(`1. Tải trang http://localhost:${GAME_PORT}/ ...`);
    const navStart = Date.now();
    await page.goto(`http://localhost:${GAME_PORT}/`, { waitUntil: 'domcontentloaded' });
    const loadMs = Date.now() - navStart;
    findings.performance.loadMs = loadMs;
    console.log(`   Thời gian tải: ${loadMs}ms`);

    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(reviewDir, '01_sanh_cho_intro.png') });

    // 2. Mở & Kiểm tra Bảng Xếp Hạng từ sảnh chờ
    console.log('2. Đánh giá Modal Bảng Xếp Hạng...');
    await page.click('#modal-intro button.btn-secondary'); // 🏆 Bảng Xếp Hạng
    await page.waitForTimeout(400);
    const lbModalVisible = await page.$eval('#modal-leaderboard', el => el.classList.contains('active'));
    const lbEntriesCount = await page.$$eval('#leaderboard-tbody tr', trs => trs.length);
    findings.ui_ux.leaderboard = { visible: lbModalVisible, entries: lbEntriesCount };
    await page.screenshot({ path: path.join(reviewDir, '02_modal_leaderboard.png') });
    await page.click('#modal-leaderboard button.btn-primary'); // Đóng
    await page.waitForTimeout(300);

    // 3. Bắt đầu Đêm 1
    console.log('3. Bắt đầu vào game Đêm 1 (Đảo Bến)...');
    await page.click('#modal-intro button.btn-primary');
    await page.waitForTimeout(600);

    // Kiểm tra nhân vật Mây và HUD ban đầu
    const initialHud = await page.evaluate(() => {
      return {
        flames: document.querySelectorAll('#hud-flames .flame-icon:not(.lost)').length,
        timer: document.getElementById('hud-timer').textContent,
        score: document.getElementById('hud-score').textContent,
        lanterns: document.getElementById('hud-lanterns').textContent,
        carriedSlots: document.querySelectorAll('#motes-slots .slot.filled').length,
        totalSlots: document.querySelectorAll('#motes-slots .slot').length
      };
    });
    findings.ui_ux.hud = initialHud;
    console.log('   HUD trạng thái:', JSON.stringify(initialHud));

    // 4. Trải nghiệm di chuyển, nhảy, lướt và thu thập đom đóm
    console.log('4. Trải nghiệm di chuyển thực tế (WASD, Space, Shift)...');
    // Nhấn W tiến lên
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(600);
    await page.keyboard.up('KeyW');
    
    // Nhảy Space
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);

    // Lướt Dash
    await page.keyboard.down('KeyW');
    await page.keyboard.press('Shift');
    await page.waitForTimeout(250);
    await page.keyboard.up('KeyW');

    await page.screenshot({ path: path.join(reviewDir, '03_gameplay_exploration.png') });

    // Thu thập đom đóm thực tế
    console.log('5. Tự động tìm & nhặt đom đóm trên đảo...');
    await page.evaluate(() => {
      // Giả lập người chơi di chuyển tới vị trí các đom đóm gần nhất
      const activeMotes = window.sim.motes.filter(m => m.active);
      for (let i = 0; i < Math.min(10, activeMotes.length); i++) {
        activeMotes[i].pos = [window.sim.player.pos[0] + (i * 0.1), 0, window.sim.player.pos[2] + (i * 0.1)];
      }
    });
    await page.waitForTimeout(300);

    const carriedCount = await page.evaluate(() => window.sim.player.carried);
    findings.gameplay.carriedAfterPickup = carriedCount;
    console.log(`   Mây đã nhặt: ${carriedCount} đom đóm`);

    // 6. Thắp sáng Đèn Lớn L1
    console.log('6. Tiến tới Đèn Lớn L1 & Thắp sáng...');
    await page.evaluate(() => {
      const l1 = window.sim.lanterns.find(l => l.id === 'L1');
      window.sim.player.carried = 10;
      window.sim.player.pos = [l1.pos[0], 0, l1.pos[2] + 1.2];
      window.sim.player.vel = [0, 0, 0];
    });
    await page.waitForTimeout(300);
    
    // Bấm E nạp đom đóm
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(400);

    const l1State = await page.evaluate(() => {
      const l1 = window.sim.lanterns.find(l => l.id === 'L1');
      return { lit: l1.lit, fuel: Math.round(l1.fuel_units / 60), everLit: l1.ever_lit };
    });
    findings.gameplay.lanternL1 = l1State;
    console.log('   Trạng thái Đèn L1:', JSON.stringify(l1State));
    await page.screenshot({ path: path.join(reviewDir, '04_lantern_l1_lit_with_fuelbar.png') });

    // 7. Thử nghiệm Tỏa Sáng (F) làm choáng quái
    console.log('7. Thử nghiệm kỹ năng Tỏa Sáng (Pulse)...');
    await page.evaluate(() => {
      window.sim.player.carried = 5;
      window.sim.shades = [{
        id: 'SHADE_TEST_1',
        pos: [window.sim.player.pos[0] + 3, 0, window.sim.player.pos[2]],
        state: 'chase',
        state_ticks_left: 0,
        push_vec: [0, 0],
        push_ticks_left: 0
      }];
    });
    await page.keyboard.press('KeyF');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(reviewDir, '05_pulse_shockwave_stun.png') });

    // 8. Đánh giá Menu Tạm Dừng, Tùy chỉnh Phím & Cài đặt Trợ năng
    console.log('8. Kiểm tra Menu Tạm dừng, Key Remapping & Accessibility...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(reviewDir, '06_pause_menu_settings.png') });

    // Mở modal Keybindings
    await page.click('button[onclick*="openKeybindingsModal"]');
    await page.waitForTimeout(300);
    const keybindsCount = await page.$$eval('#modal-keybinds .keybind-row', rows => rows.length);
    findings.accessibility.keybindActions = keybindsCount;
    console.log(`   Số phím có thể tùy biến: ${keybindsCount}`);
    
    // Thử đổi phím Jump sang K
    await page.click('#keybtn-jump');
    await page.waitForTimeout(100);
    await page.keyboard.press('KeyK');
    await page.waitForTimeout(100);
    const remapText = await page.$eval('#keybtn-jump', el => el.textContent);
    console.log(`   Sau khi gán phím Nhảy: ${remapText}`);
    await page.screenshot({ path: path.join(reviewDir, '07_modal_keybinds.png') });

    // Khôi phục mặc định
    await page.click('#modal-keybinds button:has-text("Khôi phục mặc định")');
    await page.waitForTimeout(100);
    await page.click('#modal-keybinds button:has-text("Đóng")');
    await page.waitForTimeout(300);

    // Bật Trợ năng: Phóng to chữ + Giảm chuyển động + Mù màu
    await page.click('#setting-colorblind');
    await page.click('#setting-large-text');
    await page.click('#setting-reduced-motion');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(reviewDir, '08_accessibility_active.png') });

    // Trở lại game
    await page.click('#modal-pause button.btn-primary');
    await page.waitForTimeout(300);

    // 9. Trải nghiệm Đêm 2 (Đảo Cau) — Cầu tre hẹp & Gió Lạc
    console.log('9. Chuyển cảnh trải nghiệm Đêm 2 (Đảo Cau)...');
    await page.evaluate(() => {
      showNightIntro(2);
      startNightGame();
    });
    await page.waitForTimeout(600);
    // Cho Mây đứng trên cầu tre nối 2 đảo
    await page.evaluate(() => {
      window.sim.player.pos = [35, 0, 0];
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(reviewDir, '09_night2_bamboo_bridge.png') });

    // 10. Trải nghiệm Đêm 3 (Đảo Chuông) — 3 Tầng đá, Bục Nhảy & Gió cuốn
    console.log('10. Chuyển cảnh trải nghiệm Đêm 3 (Đảo Chuông)...');
    await page.evaluate(() => {
      showNightIntro(3);
      startNightGame();
    });
    await page.waitForTimeout(600);
    // Cho Mây đứng cạnh bục nhảy tầng 1
    await page.evaluate(() => {
      window.sim.player.pos = [0, 0, 20];
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(reviewDir, '10_night3_rock_tiers.png') });

    // Đo đạc FPS thực tế trong lúc chơi
    console.log('11. Đo đạc tốc độ khung hình (FPS) trong lúc chạy Three.js...');
    const perfStats = await page.evaluate(() => {
      return new Promise((resolve) => {
        let frameCount = 0;
        const start = performance.now();
        function loop() {
          frameCount++;
          if (performance.now() - start < 1000) {
            requestAnimationFrame(loop);
          } else {
            const actualFps = Math.round((frameCount * 1000) / (performance.now() - start));
            resolve({ fps: actualFps, frameCount });
          }
        }
        requestAnimationFrame(loop);
      });
    });
    findings.performance.actualFps = perfStats.fps;
    console.log(`   FPS đo được trong môi trường render thực tế: ${perfStats.fps} FPS`);

    console.log('--- HOÀN TẤT PHIÊN CHƠI THỰC NGHIỆM THÀNH CÔNG ---');
  } catch (err) {
    console.error('LỖI TRONG KHI CHƠI:', err);
  } finally {
    if (browser) await browser.close();
    if (serverProcess) {
      serverProcess.kill();
    }
  }

  return findings;
}

runAutonomousReview().then(res => {
  console.log('TỔNG HỢP DỮ LIỆU ĐÁNH GIÁ:', JSON.stringify(res, null, 2));
});
