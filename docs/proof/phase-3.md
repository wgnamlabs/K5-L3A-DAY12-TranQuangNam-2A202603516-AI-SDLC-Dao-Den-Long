# Bằng chứng Kiểm chứng Phase 3 (Proof of Verification v1.2)

Tài liệu này chứng minh dự án đã hoàn thành toàn diện các yêu cầu của **Ticket-03 — Change Request "Đèn cạn dầu"** và **Test Contract v1.2**.

---

## 1. Kết quả Kiểm thử Tự động Headless (39/39 PASS)

Lệnh thực thi:
```bash
npm test
```

Chi tiết log kiểm thử:
```text
> dao-den-long@1.0.0 test
> node tests/run_all_tests.js

=== BẮT ĐẦU CHẠY BỘ TEST KIỂM THỬ CONTRACT V1.2 (PHASE 3) ===
  [PASS] Test 1: Nhặt đom đóm (Regression)
  [PASS] Test 1: Kết thúc đúng tick
  [PASS] Test 2: Nạp ánh sáng đủ 10 đom đóm
  [PASS] Test 2: Thắp sáng đèn L1 (relight: false)
  [PASS] Test 3: Tỏa sáng làm choáng Bóng Mực (cost 3)
  [PASS] Test 4: Tính tất định (Determinism v1.2)
  [PASS] Test 5: Bắt lỗi file inputs sai (Mã thoát 2)
  [PASS] Test 6: Kích hoạt Lướt (Dash event)
  [PASS] Test 6: Nhân vật di chuyển nhanh khi lướt (14 m/s)
  [PASS] Test 7: Gió Lạc cướp đúng 3 đom đóm
  [PASS] Test 8: Nhặt Bùa Gió tăng tốc & giảm hồi lướt
  [PASS] Test 9: Rơi khỏi đảo trừ 1 lửa & mất hết đom đóm
  [PASS] Test 10: Sự kiện Tạm dừng và Tiếp tục (paused / resumed)
  [PASS] Test 10: Snapshot ghi nhận state: 'paused'
  [PASS] Test 11: Hiệu năng Đêm 3 đạt chuẩn (1.18s <= 30s)
  [PASS] Test 12: Đèn tắt khi cạn dầu và phát sự kiện lantern_out tại tick 30
  [PASS] Test 12: Đèn tắt nhớ ever_lit = true và fuel = 0
  [PASS] Test 13: Thắp lại chỉ nạp 5 đom đóm (relight_cost = 5)
  [PASS] Test 13: Phát sự kiện lantern_lit với relight: true
  [PASS] Test 13: Snapshot ghi nhận relit_count: 1 và fuel đầy
  [PASS] Test 14: Châm dầu đèn đang sáng nạp ceil((100-85)/10)=2 đom đóm
  [PASS] Test 14: Mây bị trừ đúng 2 đom đóm (5 -> 3)
  [PASS] Test 15: Đèn đầy dầu không nhận tương tác và không phát sự kiện
  [PASS] Test 15: Đom đóm mang theo không bị trừ khi đèn đầy
  [PASS] Test 16: Bóng Mực hút 5/s phát fuel_drain tại tick 60 còn 14 fuel
  [PASS] Test 16: Trạng thái Bóng Mực trong snapshot là 'drain'
  [PASS] Test 17: Bóng Mực không bị đẩy lùi và tiếp cận đèn yếu (fuel < 30)
  [PASS] Test 18: Đèn được châm dầu lên >= 30
  [PASS] Test 18: Bóng Mực bị đẩy ra mép vùng 6m và thoát khỏi trạng thái drain
  [PASS] Test 19: Tỏa Sáng trúng Bóng Mực đang drain
  [PASS] Test 19: Cộng đủ +15 điểm khi choáng Bóng Mực đang drain
  [PASS] Test 20: Sức chứa = 10 + 2 * 3 = 16 (tối đa 20)
  [PASS] Test 21: Thắng bình minh phát game_over với reason: dawn_survived
  [PASS] Test 21: Tính đúng điểm bình minh (50+fuel mỗi đèn + 50 mỗi ngọn lửa = 527)
  [PASS] Test 22: Thua bình minh phát game_over với reason: dawn
  [PASS] Test 23: Thắp hết đèn không kết thúc Đêm (không còn thắng sớm all_lit)
  [PASS] Test 23: Trạng thái game vẫn là 'playing' khi tất cả đèn sáng
  [PASS] Test 24: Snapshot player có capacity
  [PASS] Test 24: Snapshot mỗi đèn có fuel (1 số thập phân), ever_lit, relit_count

=== TỔNG KẾT PHASE 3: 39 PASS, 0 FAIL ===
Toàn bộ test Phase 3 (Contract v1.2) đã ĐẠT hoàn hảo 100%!
```

---

## 2. Kiểm chứng Hiệu năng Mô phỏng (Benchmark Đêm 3)
- **Quy định Contract v1.2:** Mô phỏng headless đầy đủ 21.600 ticks (Đêm 3) phải hoàn thành trong $\le 30.0\text{ giây}$.
- **Kết quả thực nghiệm:** **1.18 giây** (tương đương $> 18.300\text{ ticks/giây}$, nhanh hơn gấp 25 lần tiêu chuẩn).

---

## 3. Bằng chứng Trực quan trên Trình duyệt (Playwright Autonomous Evaluator)

Lệnh thực thi:
```bash
node tests/play_and_evaluate.js
```

Kết quả: **19/19 TIÊU CHÍ ĐẠT CHUẨN (100% PASS)**

| STT | Tiêu chí Kiểm định Visual E2E | Quy tắc kiểm tra | Kết quả quan sát thực tế | Đánh giá |
| :---: | :--- | :--- | :--- | :---: |
| 1 | Cốt truyện & Tên Đêm | Hiển thị tiêu đề Đêm 1 và lời thoại Ông Đăng | "ĐÊM 1 — ĐẢO BẾN" | **ĐẠT** |
| 2 | Di chuyển Tiến (Phím W) | Tốc độ chuẩn 6.0 m/s theo góc camera | Tọa độ Z tăng từ 0.00 -> 1.80m | **ĐẠT** |
| 3 | Di chuyển Trái (Phím A) | Dạt sang trái góc nhìn camera | Tọa độ X thay đổi dạt sang trái | **ĐẠT** |
| 4 | Di chuyển Phải (Phím D) | Dạt sang phải góc nhìn camera | Tọa độ X thay đổi dạt sang phải | **ĐẠT** |
| 5 | Nhảy cao (Phím Space) | Vận tốc 7.0 m/s, trọng lực -20 m/s² | Đạt đỉnh 1.03m và chạm đất an toàn | **ĐẠT** |
| 6 | Kỹ năng Lướt (Shift / Dash) | Tốc độ 14.0 m/s trong 0.2s, hồi chiêu 1.5s | Quãng đường 2.90m, hồi chiêu 1.30s | **ĐẠT** |
| 7 | Nhặt Đom Đóm tự động | XZ $\le 1.0\text{m}$, tăng số lượng và cập nhật HUD | Đom đóm: 0 -> 1, HUD sáng 1/10 | **ĐẠT** |
| 8 | Nhắc tương tác Đèn Lớn | Hiện nhắc tương tác khi đứng gần $\le 2.0\text{m}$ | Hiển thị "E — Nạp ánh sáng (0/10)" | **ĐẠT** |
| 9 | Thắp Đèn Lớn (Phím E) | Nạp đủ 10 đom đóm, thắp sáng đèn L1 | L1 sáng, HUD đếm 1 / 5 | **ĐẠT** |
| 10 | Tỏa Sáng (Phím F / Pulse) | Tốn 3 đom đóm, bán kính 5m, gây choáng 120 ticks | Quái chuyển "stunned", choáng 112 ticks | **ĐẠT** |
| 11 | Va chạm Bóng Mực | Trừ 1 lửa, rơi nửa số đom đóm, bất tử 90 ticks | Lửa: 3 -> 2, rơi 2 đom đóm, bất tử: true | **ĐẠT** |
| 12 | Tạm dừng (Esc / P) | Đóng băng logic, hiển thị bảng cài đặt | Menu tạm dừng mở thành công | **ĐẠT** |
| 13 | Rơi khỏi đảo (Y < -10) | Trừ 1 lửa, mất sạch đom đóm, hồi sinh tâm đảo | Lửa: 2 -> 1, đom đóm: 0, hồi sinh: true | **ĐẠT** |
| 14 | Môi trường Đêm 2 (Đảo Cau) | 2 đảo nối cầu tre, Bùa Gió tại (35,0,0) | Đêm 2, Bùa Gió tại [35, 0, 0] | **ĐẠT** |
| 15 | Môi trường Đêm 3 (Đảo Chuông) | 3 tầng đá (Y=0, 3, 6), 7 Đèn Lớn, gió cuộn trào | Đêm 3, 7 Đèn Lớn, gió kích hoạt | **ĐẠT** |
| 16 | Nhắc Châm dầu đèn đang sáng | Hiện nhắc châm dầu kèm mức dầu và lượng cần | "E — Châm dầu (Dầu: 84.8/100, cần 2 đom đóm)" | **ĐẠT** |
| 17 | Cơ chế Châm dầu (Refuel) | Nạp $\lceil(100-85)/10\rceil = 2$ đom đóm | Dầu: 85 -> 99.8/100, đom đóm: 3 -> 1 | **ĐẠT** |
| 18 | Chế độ Bảng màu dễ phân biệt | Quái đổi mắt/viền xanh #00B3FF, cảnh báo thêm ⚠ | Class `colorblind-mode` và lưu localStorage | **ĐẠT** |
| 19 | Sức chứa túi đom đóm | $\text{capacity} = 10 + 2 \times \text{lights}$, mở rộng slot | Sức chứa: 14, HUD: /14, 14 ô slot | **ĐẠT** |

---

## 4. Danh mục Ảnh chụp Bằng chứng Trực quan (Screenshots)

Các ảnh chụp màn hình trực tiếp từ phiên kiểm thử Playwright được lưu trữ tại `docs/proof/gameplay/`:

1. [01_intro_dialog.png](file:///D:/K5-L3A-DAY12-TranQuangNam-2A202603516-AI-SDLC-Dao-Den-Long/docs/proof/gameplay/01_intro_dialog.png): Hộp thoại cốt truyện Đêm 1 và lời nhắn nhủ của Ông Đăng.
2. [02_dash_and_movement.png](file:///D:/K5-L3A-DAY12-TranQuangNam-2A202603516-AI-SDLC-Dao-Den-Long/docs/proof/gameplay/02_dash_and_movement.png): Kỹ năng Lướt (Dash) tạo vệt mờ chuyển động 14 m/s.
3. [03_lantern_lit.png](file:///D:/K5-L3A-DAY12-TranQuangNam-2A202603516-AI-SDLC-Dao-Den-Long/docs/proof/gameplay/03_lantern_lit.png): Đèn Lớn L1 tỏa sáng rực rỡ và vùng an toàn bao bọc.
4. [04_pulse_stun.png](file:///D:/K5-L3A-DAY12-TranQuangNam-2A202603516-AI-SDLC-Dao-Den-Long/docs/proof/gameplay/04_pulse_stun.png): Sóng Tỏa Sáng lan tỏa làm choáng Bóng Mực.
5. [05_pause_menu.png](file:///D:/K5-L3A-DAY12-TranQuangNam-2A202603516-AI-SDLC-Dao-Den-Long/docs/proof/gameplay/05_pause_menu.png): Menu Tạm dừng tích hợp cài đặt âm lượng và Chế độ mù màu.
6. [06_night2_island_cau.png](file:///D:/K5-L3A-DAY12-TranQuangNam-2A202603516-AI-SDLC-Dao-Den-Long/docs/proof/gameplay/06_night2_island_cau.png): Không gian Đêm 2 với 2 đảo tròn và cầu tre nối liền.
7. [07_night3_bell_island.png](file:///D:/K5-L3A-DAY12-TranQuangNam-2A202603516-AI-SDLC-Dao-Den-Long/docs/proof/gameplay/07_night3_bell_island.png): Không gian Đêm 3 với 3 tầng đá, tháp chuông và gió giật.
8. [08_refuel_and_fuel_bar.png](file:///D:/K5-L3A-DAY12-TranQuangNam-2A202603516-AI-SDLC-Dao-Den-Long/docs/proof/gameplay/08_refuel_and_fuel_bar.png): Thanh dầu 3D Billboard hiển thị trên đầu Đèn Lớn và cơ chế châm dầu.
9. [09_colorblind_mode.png](file:///D:/K5-L3A-DAY12-TranQuangNam-2A202603516-AI-SDLC-Dao-Den-Long/docs/proof/gameplay/09_colorblind_mode.png): Bảng màu tương phản cao (#00B3FF) cho mắt quái và cảnh báo có biểu tượng `⚠`.

---

## 5. Kiểm tra Chạy Headless Mẫu (Contract CLI)

Thực thi lệnh:
```bash
node src/headless.js --seed 42 --night 1 --ticks 300 --out tests/outputs/p3_sample.jsonl
```
Kết quả: Xuất file JSONL hợp lệ gồm dòng đầu metadata contract v1.2, các dòng snapshot định kỳ chứa `player.capacity`, `lanterns[].fuel`, `ever_lit`, `relit_count` và dòng cuối `end` ghi nhận trạng thái game.
