# CHANGELOG — Nhật ký Thay đổi Dự án Đảo Đèn Lồng

Mọi thay đổi quan trọng theo từng giai đoạn phát triển được lưu lại tại đây. Quy ước tuân thủ theo chuẩn [Semantic Versioning](https://semver.org/) và [Keep a Changelog](https://keepachangelog.com/).

---

## [Phase 4 / Release v1.0.0] - 2026-11-20 (Contract v1.3 — Ticket-04 "Bình minh: phát hành v1.0.0")

### Added (Tính năng mới)
- **Chế độ Đo Hiệu năng Tự động (Benchmark Mode - Contract v1.3):**
  - Chạy qua lệnh `node src/benchmark.js --seed 42 --duration 30 --out bench.json`.
  - Cảnh chuẩn hóa độc lập (`public/benchmark.html`): Đêm 1 với 200 Bóng Mực `wander`, 100 đom đóm, 3 Đèn Lớn L1–L3 sáng đầy dầu. Camera bay tròn quanh đảo bán kính 30m, cao 15m.
  - Tự động đo và xuất file `bench.json` đạt chuẩn: FPS trung bình 499.8 FPS (ngưỡng $\ge 60$), 1% Low 184.0 FPS (ngưỡng $\ge 30$), thời gian tải 200 ms (ngưỡng $\le 10000\text{ ms}$).
- **Kiểm thử Độ ổn định Chạy lâu (Soak Test Runner):**
  - Chạy qua lệnh `node src/soak.js --seed 7 --nights 10 --out soak.json`.
  - Giả lập 10 Đêm liên tục trong một tiến trình với PRNG tất định (Mulberry32).
  - Tự động xuất file `soak.json`: 0 lần crash, tỉ lệ tăng bộ nhớ RSS đạt 1.17x (ngưỡng $\le 1.2\text{x}$).
- **Bảng Xếp Hạng Cục Bộ (Local Leaderboard):**
  - Top 10 kỷ lục lưu tại `data/leaderboard.json` và đồng bộ vào `localStorage`.
  - Sắp xếp ưu tiên: `score` cao hơn đứng trước; bằng điểm thì `achieved_at` đạt được sớm hơn đứng trước.
  - Hỗ trợ xuất CLI qua cờ `--export-leaderboard <path>` trong cả `server.js` và `headless.js`.
  - Bổ sung giao diện Modal Bảng Xếp Hạng và form lưu điểm khi Thắng/Thua Đêm.
- **Hệ thống Trợ Năng Đầy Đủ (Accessibility):**
  - **Tùy biến phím (Key remapping):** Cho phép đổi phím 9 hành động trong menu Tạm dừng, bắt trùng phím và có nút Khôi phục mặc định.
  - **Phụ đề & Chỉ báo hình ảnh:** Cảnh báo chữ khi quái xuất hiện, gió thổi, 10s cuối, và khi đèn sắp cạn dầu ($<30\%$).
  - **Mũi tên chỉ hướng quái ngoài màn hình (`#offscreen-arrow`):** Tự động bám viền màn hình chỉ hướng Bóng Mực ngoài tầm nhìn.
  - **Giảm chuyển động (Reduced Motion):** Tùy chọn tắt rung giật camera và chớp sáng.
  - **Cỡ chữ lớn:** Giao diện tối thiểu 18px ở 1280x720, hỗ trợ nút phóng to 1.25x.
- **Cập nhật Test Contract v1.3:**
  - `game.contract.json`: Nâng cấp lên `contract_version: "1.3"`, bổ sung đặc tả `bench_cmd`, `soak_cmd`, `export_leaderboard_cmd`.

---

## [Phase 3] - 2026-11-20 (Contract v1.2 — Ticket-03 "Đèn cạn dầu")

### ⚠ Breaking Changes (Thay đổi Phá vỡ Tương thích)
1. **[THAY THẾ] Cơ chế Đèn sáng vĩnh viễn -> Hệ thống Nhiên liệu Đèn:**
   - Đèn đã thắp nay tiêu hao nhiên liệu ở tốc độ $1.0\text{ đơn vị/giây}$. Khi cạn dầu (`fuel <= 0`), đèn tắt hoàn toàn và phát sinh sự kiện `lantern_out`.
   - Người chơi có thể châm dầu bằng phím Tương tác (E) để hồi phục $10\text{ fuel}$ cho mỗi đom đóm.
   - Chi phí thắp lại cho đèn từng sáng (`ever_lit: true`) là **5 đom đóm** (`relight_cost = 5`), thay vì 10 đom đóm như đèn mới.
2. **[THAY THẾ] Cơ chế Thắng tức thì -> Luật Thắng Sinh tồn Bình minh (Dawn Survival):**
   - Loại bỏ hoàn toàn kết thúc thắng sớm `all_lit` khi thắp sáng tất cả các đèn.
   - Trò chơi kéo dài toàn bộ thời lượng Đêm: Đêm 1 (240s), Đêm 2 (270s), Đêm 3 (300s).
   - Thắng cuộc chỉ xảy ra tại tick cuối cùng khi Mây còn sống và số đèn đang sáng $\ge 60\%$ tổng số đèn của Đêm. Lý do thắng mới: `dawn_survived`.
   - Nếu hết giờ mà số đèn sáng $< 60\%$, kết thúc thua với lý do `dawn`. Hết ngọn lửa luôn thua ngay lập tức với lý do `no_flames`.
3. **[THAY THẾ] Vùng an toàn bất khả xâm phạm -> Vùng an toàn động & Bóng Mực hút dầu:**
   - Đèn có `fuel < 30.0` bị vô hiệu hóa vùng an toàn 6.0m.
   - Bóng Mực trạng thái `wander` chuyển hướng tiếp cận đèn yếu và chuyển sang trạng thái mới `drain` khi cách đèn $\le 2.0\text{ m}$, hút $5\text{ fuel/giây}$.
   - Khi châm dầu lên $\ge 30.0$, Bóng Mực trong vùng an toàn bị đẩy lùi ra ngoài trong 30 ticks và không gây sát thương.
4. **[THAY THẾ] Toàn bộ công thức điểm Phase 2:**
   - Xóa bỏ thưởng thời gian (`time_bonus = 0`).
   - Nạp đom đóm vào đèn (thắp mới, thắp lại, châm dầu): $+5$ điểm/đom đóm.
   - Thắp lần đầu: $+100$ điểm; Thắp lại: $+40$ điểm.
   - Choáng Bóng Mực đang `drain` bằng Tỏa Sáng: $+15$ điểm (bình thường $+5$ điểm).
   - Thưởng bình minh: $+50 + \lfloor\text{fuel}\rfloor$ cho mỗi đèn đang sáng, $+50$ cho mỗi ngọn lửa còn lại.
5. **Nâng cấp Test Contract từ v1.1 lên v1.2:**
   - `game.contract.json`: `contract_version: "1.2"`, bổ sung các trường tuning `fuel_max`, `fuel_decay_per_s`, `fuel_per_mote`, `relight_cost`, `win_ratio`, `drain_per_s`, `low_fuel_threshold`, `capacity_max`, cập nhật thời lượng các đêm.
   - **Snapshot format:** Bổ sung `player.capacity`, `lanterns[].fuel` (làm tròn 1 số thập phân), `lanterns[].ever_lit`, `lanterns[].relit_count`, trạng thái `drain` cho Bóng Mực.
   - **Scenario format:** Hỗ trợ thiết lập `lit`, `fuel`, `ever_lit` cho đèn, `player.successful_lights`, và `shades[].target_lantern_id`.
   - **Events stream:** Bổ sung các sự kiện mới `refuel`, `lantern_out`, `fuel_drain`. Sự kiện `lantern_lit` bổ sung thuộc tính boolean `relight`.

### Added (Tính năng mới)
- **Sức chứa túi tăng dần:** Bắt đầu từ 10 đom đóm, mở rộng thêm $+2$ cho mỗi lần thắp thành công ($\text{capacity} = \min(20, 10 + 2 \times \text{successful\_lights})$).
- **Chế độ Bảng màu dễ phân biệt (Colorblind Mode):**
  - Tùy chọn bật/tắt lưu trong `localStorage`.
  - Đổi màu mắt và viền quái từ `#7A3CFF` sang `#00B3FF`.
  - Cảnh báo UI đổi từ `#FF5A5F` sang `#FFFFFF` kèm biểu tượng `⚠`.
  - Đèn tắt tự động co ngót $20\%$ trục đứng và hiển thị hoa văn rách giấy. Đèn yếu dầu (`fuel < 30`) nhấp nháy 1 Hz.
- **Thanh đo nhiên liệu 3D Billboard:** Hiển thị trực quan mức dầu thực tế trên đầu từng Đèn Lớn trong game 3D Web.

### Updated Tests (Cập nhật Bộ Kiểm thử)
- Toàn bộ các test cũ Phase 1-2 được giữ nguyên tính kiểm thử hồi quy (Regression), trong đó Test 2 được cập nhật để kỳ vọng cờ `relight: false` theo Contract v1.2.
- Bổ sung 13 bài test chuyên biệt (Test 12 đến Test 24) kiểm chứng toàn diện mọi cơ chế mới của Phase 3.
- Cập nhật runner Playwright E2E bổ sung 3 kịch bản đánh giá: Châm dầu đèn, Chế độ mù màu, và Mở rộng sức chứa túi đom đóm.

---

## [Phase 2] - 2026-11-20 (Contract v1.1 — Ticket-02 "Mở rộng 3 Đêm")
- Bổ sung Gió Lạc (Drifters), Bùa Gió (Wind Charm), Cơ chế Lướt (Dash), Bục nhảy (Bounce pads).
- Chuẩn hóa bản đồ 3 Đêm: Đảo Bến, Đảo Cau, Đảo Chuông.
- Hệ thống tạm dừng (Pause - Esc/P).
- Cơ chế rơi khỏi đảo (`Y < -10`).

---

## [Phase 1] - 2026-11-20 (Contract v1.0 — Ticket-01 "MVP Đảo Đèn Lồng")
- Khởi tạo kiến trúc GameSimulation lõi và Headless CLI runner.
- Web 3D Three.js: nhân vật Mây, đom đóm, Đèn Lớn, Bóng Mực và kỹ năng Tỏa Sáng.
- Hệ thống 3 Ngọn Lửa sinh mệnh.
