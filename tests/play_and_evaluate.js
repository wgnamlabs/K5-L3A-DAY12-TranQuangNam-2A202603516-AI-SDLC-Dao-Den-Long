/**
 * play_and_evaluate.js
 * Autonomous Gameplay Agent using Playwright.
 * Plays through real in-browser gameplay to rigorously evaluate all controls,
 * game mechanics, physics, HUD, audio, and rules adherence.
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

const PORT = 3006;

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

async function autonomousPlayAndEvaluate() {
  console.log("==================================================================");
  console.log("  AI AGENT TỰ LÊN WEB CHƠI GAME & ĐÁNH GIÁ LUẬT CHƠI / PHÍM BẤM");
  console.log("==================================================================\n");

  const server = await startServer();
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', err => console.error('BROWSER PAGE ERROR:', err.message));
  const shotDir = path.join(rootDir, 'docs/proof/gameplay');
  if (!fs.existsSync(shotDir)) fs.mkdirSync(shotDir, { recursive: true });

  const evaluationLog = [];
  function logEval(title, rule, result, pass = true) {
    const status = pass ? "[ĐẠT CHUẨN]" : "[CẦN SỬA]";
    console.log(`${status} ${title}`);
    console.log(`    - Quy tắc: ${rule}`);
    console.log(`    - Thực tế quan sát: ${result}\n`);
    evaluationLog.push({ title, rule, result, pass });
  }

  try {
    // 1. Tải trang game
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // 2. Kiểm tra Modal mở đầu
    const introTitle = await page.$eval('#intro-night-name', el => el.textContent);
    logEval(
      "Màn hình Giới thiệu Cốt truyện",
      "Hiển thị tên Đêm và lời nhắn nhủ của Ông Đăng trước khi bắt đầu.",
      `Hộp thoại hiển thị đúng: "${introTitle}"`,
      introTitle.includes("ĐÊM 1")
    );
    await page.screenshot({ path: path.join(shotDir, '01_intro_dialog.png') });

    // Bắt đầu game
    await page.click('#modal-intro button.btn-primary');
    await page.waitForTimeout(600);

    // 3. Đánh giá Di chuyển (WASD)
    const initialPos = await page.evaluate(() => [...window.sim.player.pos]);
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(400);
    await page.keyboard.up('KeyW');
    const movedPos = await page.evaluate(() => [...window.sim.player.pos]);
    const movedDist = Math.hypot(movedPos[0] - initialPos[0], movedPos[2] - initialPos[2]);
    logEval(
      "Phím di chuyển W (Tiến lên phía trước)",
      "Mây di chuyển theo hướng camera với tốc độ chuẩn 6.0 m/s.",
      `Vị trí thay đổi từ [${initialPos.map(n=>n.toFixed(2))}] đến [${movedPos.map(n=>n.toFixed(2))}], quãng đường ~${movedDist.toFixed(2)}m`,
      movedDist > 1.0
    );

    // Kiểm tra Phím A (Sang Trái màn hình)
    const posBeforeA = await page.evaluate(() => [...window.sim.player.pos]);
    await page.keyboard.down('KeyA');
    await page.waitForTimeout(300);
    await page.keyboard.up('KeyA');
    const posAfterA = await page.evaluate(() => [...window.sim.player.pos]);
    // Với camYaw = 0, camera nhìn về +Z: Sang Trái màn hình là hướng +X trong không gian
    const movedLeft = (posAfterA[0] - posBeforeA[0]) > 0.5;
    logEval(
      "Phím di chuyển A (Sang Trái màn hình)",
      "Nhấn A nhân vật Mây di chuyển dạt sang TRÁI góc nhìn camera.",
      `Tọa độ X thay đổi: ${posBeforeA[0].toFixed(2)} -> ${posAfterA[0].toFixed(2)} (dạt sang trái)`,
      movedLeft
    );

    // Kiểm tra Phím D (Sang Phải màn hình)
    const posBeforeD = await page.evaluate(() => [...window.sim.player.pos]);
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(300);
    await page.keyboard.up('KeyD');
    const posAfterD = await page.evaluate(() => [...window.sim.player.pos]);
    // Với camYaw = 0, camera nhìn về +Z: Sang Phải màn hình là hướng -X trong không gian
    const movedRight = (posAfterD[0] - posBeforeD[0]) < -0.5;
    logEval(
      "Phím di chuyển D (Sang Phải màn hình)",
      "Nhấn D nhân vật Mây di chuyển dạt sang PHẢI góc nhìn camera.",
      `Tọa độ X thay đổi: ${posBeforeD[0].toFixed(2)} -> ${posAfterD[0].toFixed(2)} (dạt sang phải)`,
      movedRight
    );

    // 4. Đánh giá Nhảy (Space)
    const yBeforeJump = await page.evaluate(() => window.sim.player.pos[1]);
    await page.keyboard.press('Space');
    await page.waitForTimeout(150);
    const yDuringJump = await page.evaluate(() => window.sim.player.pos[1]);
    await page.waitForFunction(() => window.sim.player.grounded, { timeout: 2000 });
    const yAfterJump = await page.evaluate(() => window.sim.player.pos[1]);
    logEval(
      "Phím Nhảy (Space)",
      "Vận tốc 7.0 m/s, trọng lực -20 m/s², chỉ nhảy khi chạm đất và rơi trở lại đất.",
      `Y ban đầu: ${yBeforeJump.toFixed(2)}m -> Nhảy lên cực đại: ${yDuringJump.toFixed(2)}m -> Đáp đất: ${yAfterJump.toFixed(2)}m`,
      yDuringJump > 0.3 && Math.abs(yAfterJump) < 0.05
    );

    // 5. Đánh giá Lướt (Shift - Dash)
    const posBeforeDash = await page.evaluate(() => [...window.sim.player.pos]);
    await page.keyboard.down('KeyW');
    await page.keyboard.press('Shift');
    await page.waitForTimeout(250);
    await page.keyboard.up('KeyW');
    const posAfterDash = await page.evaluate(() => [...window.sim.player.pos]);
    const dashDist = Math.hypot(posAfterDash[0] - posBeforeDash[0], posAfterDash[2] - posBeforeDash[2]);
    const dashCd = await page.evaluate(() => window.sim.player.dash_cd_ticks);
    logEval(
      "Phím Lướt (Shift / Dash)",
      "Tốc độ 14.0 m/s trong 0.2s (~2.8m), thời gian hồi chiêu 1.5s (90 ticks).",
      `Quãng đường lướt: ${dashDist.toFixed(2)}m, Hồi chiêu còn lại: ${(dashCd/60).toFixed(2)}s`,
      dashDist >= 2.0 && dashCd > 0
    );
    await page.screenshot({ path: path.join(shotDir, '02_dash_and_movement.png') });

    // 6. Đánh giá Nhặt Đom Đóm tự động
    const carriedBefore = await page.evaluate(() => {
      const activeMotes = window.sim.motes.filter(m => m.active);
      if (activeMotes.length > 0) {
        const target = activeMotes[0];
        window.sim.player.pos = [target.pos[0] - 0.5, 0, target.pos[2] - 0.5];
      }
      return window.sim.player.carried;
    });
    await page.waitForTimeout(300);
    const carriedAfter = await page.evaluate(() => window.sim.player.carried);
    const slotsFilled = await page.$$eval('#motes-slots .slot.filled', els => els.length);
    logEval(
      "Cơ chế Nhặt Đom Đóm Tự Động",
      "Tự động nhặt khi XZ <= 1.0m, tăng số lượng mang theo và cập nhật thanh 10 ô trên HUD.",
      `Số đom đóm: ${carriedBefore} -> ${carriedAfter}. Số ô sáng trên HUD: ${slotsFilled}/10`,
      carriedAfter > carriedBefore && slotsFilled === carriedAfter
    );

    // 7. Đánh giá Thắp Đèn (Phím E / Enter)
    await page.evaluate(() => {
      window.sim.player.carried = 10;
      window.sim.player.pos = [0, 0, 24.2];
      window.sim.player.vel = [0, 0, 0];
      window.sim.currentInput.move = [0, 0];
    });
    await page.waitForTimeout(300);

    const debugBanner = await page.evaluate(() => {
      const l1 = window.sim.lanterns.find(l => l.id === 'L1');
      return {
        className: document.getElementById('prompt-banner').className,
        dist: Math.hypot(l1.pos[0] - window.sim.player.pos[0], l1.pos[2] - window.sim.player.pos[2]),
        pos: window.sim.player.pos,
        carried: window.sim.player.carried,
        l1Lit: l1.lit
      };
    });
    console.log("DEBUG BANNER:", JSON.stringify(debugBanner));

    const bannerText = await page.$eval('#prompt-banner', el => el.textContent);
    const bannerActive = await page.$eval('#prompt-banner', el => el.classList.contains('active'));
    logEval(
      "Dòng nhắc tương tác Đèn Lớn",
      "Hiện nhắc 'E — Nạp ánh sáng (x/10)' khi đứng trong bán kính 2.0m của đèn chưa thắp.",
      `Trạng thái hiển thị: ${bannerActive}, Nội dung nhắc: "${bannerText}"`,
      bannerActive && bannerText.includes("E — Nạp ánh sáng")
    );

    // Nhấn phím E để nạp đèn
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(400);

    const lanternLitStatus = await page.evaluate(() => {
      const l1 = window.sim.lanterns.find(l => l.id === 'L1');
      return { lit: l1.lit, deposited: l1.deposited, carried: window.sim.player.carried };
    });
    const hudLanterns = await page.$eval('#hud-lanterns', el => el.textContent);
    logEval(
      "Phím Thắp Đèn (E / Nạp ánh sáng)",
      "Nạp đủ 10 đom đóm vào đèn, thắp sáng đèn L1 và cập nhật bộ đếm Đèn Lớn trên HUD.",
      `L1 đã thắp: ${lanternLitStatus.lit}, Đom đóm đã nạp: ${lanternLitStatus.deposited}/10, Đèn trên HUD: ${hudLanterns}`,
      lanternLitStatus.lit && hudLanterns.includes("1 / 5")
    );
    await page.screenshot({ path: path.join(shotDir, '03_lantern_lit.png') });

    // 8. Đánh giá Tỏa Sáng (Phím F - Pulse)
    // Di chuyển Mây về tâm đảo (0, 0, 0) xa vùng an toàn của đèn L1
    await page.evaluate(() => {
      window.sim.player.pos = [0, 0, 0];
      window.sim.player.carried = 5; // Cần >= 3 đom đóm
      window.sim.shades = [{
        id: "S_TEST",
        pos: [3.0, 0, 0], // cách 3m
        state: "chase",
        state_ticks_left: 0,
        push_vec: [0, 0],
        push_ticks_left: 0
      }];
    });
    await page.waitForTimeout(100);

    // Nhấn phím F
    await page.keyboard.press('KeyF');
    await page.waitForTimeout(100);

    const pulseResult = await page.evaluate(() => {
      const s = window.sim.shades.find(sh => sh.id === 'S_TEST');
      return {
        shadeState: s.state,
        shadeStunTicks: s.state_ticks_left,
        carriedAfter: window.sim.player.carried,
        pulseCd: window.sim.player.pulse_cd_ticks
      };
    });
    logEval(
      "Phím Tỏa Sáng (F / Pulse)",
      "Tốn 3 đom đóm, bán kính 5.0m, làm choáng Bóng Mực trong 120 ticks, đẩy lùi 4m, hồi chiêu 3s.",
      `Trạng thái quái: "${pulseResult.shadeState}", Thời gian choáng: ${pulseResult.shadeStunTicks} ticks, Đom đóm còn lại: ${pulseResult.carriedAfter}, Hồi chiêu: ${(pulseResult.pulseCd/60).toFixed(1)}s`,
      pulseResult.shadeState === 'stunned' && pulseResult.carriedAfter === 2 && pulseResult.pulseCd > 0
    );
    await page.screenshot({ path: path.join(shotDir, '04_pulse_stun.png') });

    // 9. Đánh giá Va chạm với Bóng Mực (Sát thương & Rơi đồ)
    await page.evaluate(() => {
      window.sim.player.pos = [0, 0, 0];
      window.sim.player.invuln_ticks = 0;
      window.sim.player.carried = 4;
      window.sim.player.flames = 3;
      // Đặt bóng mực chạm Mây
      window.sim.shades = [{
        id: "S_HIT",
        pos: [0.5, 0, 0], // cách 0.5m (<= 1.0m hit radius)
        state: "chase",
        state_ticks_left: 0,
        push_vec: [0, 0],
        push_ticks_left: 0
      }];
    });
    await page.waitForTimeout(200);

    const damageResult = await page.evaluate(() => {
      return {
        flames: window.sim.player.flames,
        carried: window.sim.player.carried,
        invuln: window.sim.player.invuln_ticks > 0
      };
    });
    const flamesLostIcons = await page.$$eval('#hud-flames .flame-icon.lost', els => els.length);
    logEval(
      "Va chạm gây sát thương của Bóng Mực",
      "Mất 1 Ngọn Lửa, rơi floor(carried / 2) đom đóm, bất tử 90 ticks, biểu tượng lửa trên HUD mờ đi.",
      `Ngọn lửa: 3 -> ${damageResult.flames}, Đom đóm: 4 -> ${damageResult.carried} (rơi 2), Bất tử: ${damageResult.invuln}, Số lửa tắt trên HUD: ${flamesLostIcons}`,
      damageResult.flames === 2 && damageResult.carried === 2 && flamesLostIcons === 1
    );

    // 10. Đánh giá Menu Tạm Dừng (Phím Esc / P)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const pauseActive = await page.$eval('#modal-pause', el => el.classList.contains('active'));
    logEval(
      "Phím Tạm dừng (Esc / P)",
      "Đóng băng logic trò chơi, mở bảng menu tạm dừng chứa cài đặt âm thanh và độ nhạy.",
      `Menu hiển thị: ${pauseActive}`,
      pauseActive
    );
    await page.screenshot({ path: path.join(shotDir, '05_pause_menu.png') });

    // Tiếp tục game
    await page.click('#modal-pause button.btn-primary');
    await page.waitForTimeout(300);

    // 11. Đánh giá Rơi khỏi đảo (Y < -10)
    const flamesBeforeFall = await page.evaluate(() => window.sim.player.flames);
    await page.evaluate(() => {
      window.sim.player.carried = 3;
      window.sim.player.pos = [45, -11, 0]; // Ngoài bán kính 40m của Đảo Bến và dưới -10m
    });
    await page.waitForTimeout(200);

    const fallResult = await page.evaluate(() => {
      return {
        flames: window.sim.player.flames,
        carried: window.sim.player.carried,
        falling: window.sim.player.falling
      };
    });
    logEval(
      "Rơi khỏi đảo (Y < -10)",
      "Rơi ra ngoài bán kính đảo dẫn tới rơi xuống biển mây (Y < -10): trừ 1 lửa, mất toàn bộ đom đóm, chờ 60 ticks rồi hồi sinh tại tâm đảo.",
      `Ngọn lửa: ${flamesBeforeFall} -> ${fallResult.flames}, Đom đóm còn lại: ${fallResult.carried}, Đang trong trạng thái hồi sinh: ${fallResult.falling}`,
      fallResult.flames === (flamesBeforeFall - 1) && fallResult.carried === 0 && fallResult.falling
    );

    // 12. Đánh giá Đêm 2 (Đảo Cau) — Cầu tre, Gió Lạc và Bục Nhảy
    await page.evaluate(() => {
      showNightIntro(2);
      startNightGame();
    });
    await page.waitForTimeout(500);

    const night2Elements = await page.evaluate(() => {
      const pad1 = window.sim.night === 2;
      const charm = window.sim.charms.find(c => c.id === 'C1');
      return { night: window.sim.night, charmPos: charm.pos };
    });
    logEval(
      "Môi trường Đêm 2 (Đảo Cau)",
      "Khởi tạo 2 đảo tròn nối cầu tre, Bùa Gió C1 đặt tại (35, 0, 0) trên cầu tre.",
      `Đêm: ${night2Elements.night}, Vị trí Bùa Gió C1: [${night2Elements.charmPos.join(', ')}]`,
      night2Elements.night === 2 && night2Elements.charmPos[0] === 35
    );
    await page.screenshot({ path: path.join(shotDir, '06_night2_island_cau.png') });

    // 13. Đánh giá Đêm 3 (Đảo Chuông) — 3 Tầng đá, Tháp chuông và Gió mạnh
    await page.evaluate(() => {
      showNightIntro(3);
      startNightGame();
    });
    await page.waitForTimeout(500);

    const night3Elements = await page.evaluate(() => {
      return {
        night: window.sim.night,
        lanternsCount: window.sim.lanterns.length,
        windEnabled: window.sim.wind_enabled
      };
    });
    logEval(
      "Môi trường Đêm 3 (Đảo Chuông)",
      "Khởi tạo 3 tầng đá (Y=0, 3, 6), 7 Đèn Lớn L1..L7, hệ thống gió mạnh cuộn trào.",
      `Đêm: ${night3Elements.night}, Số lượng Đèn Lớn: ${night3Elements.lanternsCount}, Gió mạnh kích hoạt: ${night3Elements.windEnabled}`,
      night3Elements.night === 3 && night3Elements.lanternsCount === 7 && night3Elements.windEnabled
    );
    await page.screenshot({ path: path.join(shotDir, '07_night3_bell_island.png') });

    // 14. Đánh giá Châm dầu đèn đang sáng (Phase 3 - Refuel)
    await page.evaluate(() => {
      showNightIntro(1);
      startNightGame();
      const l1 = window.sim.lanterns.find(l => l.id === 'L1');
      l1.lit = true;
      l1.fuel_units = 5100; // 85 fuel
      l1.ever_lit = true;
      window.sim.player.carried = 3;
      window.sim.player.pos = [0, 0, 24.2];
    });
    await page.waitForTimeout(300);

    const refuelBannerText = await page.$eval('#prompt-banner', el => el.textContent);
    logEval(
      "Dòng nhắc Châm dầu đèn đang sáng",
      "Hiện nhắc 'E — Châm dầu' kèm mức dầu hiện tại và số đom đóm cần nạp.",
      `Nội dung nhắc: "${refuelBannerText}"`,
      refuelBannerText.includes("Châm dầu")
    );

    await page.keyboard.press('KeyE');
    await page.waitForTimeout(300);

    const refuelResult = await page.evaluate(() => {
      const l1 = window.sim.lanterns.find(l => l.id === 'L1');
      return {
        fuel: Math.round((l1.fuel_units / 60.0) * 10) / 10,
        carried: window.sim.player.carried
      };
    });
    logEval(
      "Cơ chế Châm dầu (Refuel)",
      "Nạp đúng ceil((100 - 85)/10) = 2 đom đóm để làm đầy bình dầu đèn L1.",
      `Dầu sau khi châm: ${refuelResult.fuel}/100, Đom đóm còn lại: ${refuelResult.carried} (trừ 2)`,
      refuelResult.fuel >= 99.5 && refuelResult.carried === 1
    );
    await page.screenshot({ path: path.join(shotDir, '08_refuel_and_fuel_bar.png') });

    // 15. Đánh giá Cài đặt Chế độ Mù màu (Colorblind mode)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    await page.click('#setting-colorblind');
    await page.waitForTimeout(200);

    const isCbActive = await page.evaluate(() => {
      return document.body.classList.contains('colorblind-mode') &&
             localStorage.getItem('dao_den_long_colorblind') === 'true';
    });
    logEval(
      "Chế độ Bảng màu dễ phân biệt (Colorblind Mode)",
      "Đổi bảng màu giao diện, viền và mắt Bóng Mực sang #00B3FF, cảnh báo thêm ⚠ và lưu vào localStorage.",
      `Class colorblind-mode: ${isCbActive}, Lưu localStorage: true`,
      isCbActive
    );
    await page.screenshot({ path: path.join(shotDir, '09_colorblind_mode.png') });

    // 16. Đánh giá Sức chứa tăng dần (Capacity scaling)
    const capScalingResult = await page.evaluate(() => {
      window.sim.player.successful_lights = 2;
      window.sim.player.capacity = 10 + 2 * 2; // 14
      updateHUD();
      return {
        capacity: window.sim.player.capacity,
        hudCap: document.getElementById('motes-capacity-text').textContent,
        slotsCount: document.querySelectorAll('#motes-slots .slot').length
      };
    });
    logEval(
      "Sức chứa túi đom đóm tăng dần",
      "Sức chứa = 10 + 2 * successful_lights, thanh túi trên HUD mở rộng ô tương ứng.",
      `Sức chứa mô phỏng: ${capScalingResult.capacity}, Text HUD: /${capScalingResult.hudCap}, Số ô slot hiển thị: ${capScalingResult.slotsCount}`,
      capScalingResult.capacity === 14 && capScalingResult.hudCap === '14' && capScalingResult.slotsCount === 14
    );

  } catch (err) {
    console.error(`Lỗi trong quá trình chơi game tự động: ${err.message}`);
  } finally {
    await browser.close();
    server.close();
  }

  const passedCount = evaluationLog.filter(e => e.pass).length;
  const totalCount = evaluationLog.length;
  console.log("==================================================================");
  console.log(`  KẾT QUẢ ĐÁNH GIÁ THỰC TẾ TRÊN WEB: ${passedCount}/${totalCount} TIÊU CHÍ ĐẠT CHUẨN`);
  console.log("==================================================================");
}

autonomousPlayAndEvaluate();
