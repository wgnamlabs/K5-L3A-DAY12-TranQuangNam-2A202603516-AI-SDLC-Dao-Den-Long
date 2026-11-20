# Bằng chứng Kiểm chứng Phase 2 (Proof of Verification v1.1)

Tài liệu này chứng minh dự án đã hoàn thành toàn diện các yêu cầu của **Ticket-02** và **Test Contract v1.1**.

---

## 1. Kết quả Kiểm thử Tự động (15/15 PASS)

Lệnh thực thi:
```bash
npm test
```

Chi tiết kết quả:
```text
=== BẮT ĐẦU CHẠY BỘ TEST KIỂM THỬ CONTRACT V1.1 (PHASE 2) ===
  [PASS] Test 1: Nhặt đom đóm (Regression)
  [PASS] Test 1: Kết thúc đúng tick
  [PASS] Test 2: Nạp ánh sáng đủ 10 đom đóm
  [PASS] Test 2: Thắp sáng đèn L1
  [PASS] Test 3: Tỏa sáng làm choáng Bóng Mực (cost 3)
  [PASS] Test 4: Tính tất định (Determinism v1.1)
  [PASS] Test 5: Bắt lỗi file inputs sai (Mã thoát 2)
  [PASS] Test 6: Kích hoạt Lướt (Dash event)
  [PASS] Test 6: Nhân vật di chuyển nhanh khi lướt (14 m/s)
  [PASS] Test 7: Gió Lạc cướp đúng 3 đom đóm
  [PASS] Test 8: Nhặt Bùa Gió tăng tốc & giảm hồi lướt
  [PASS] Test 9: Rơi khỏi đảo trừ 1 lửa & mất hết đom đóm
  [PASS] Test 10: Sự kiện Tạm dừng và Tiếp tục (paused / resumed)
  [PASS] Test 10: Snapshot ghi nhận state: 'paused'
  [PASS] Test 11: Hiệu năng 21,600 ticks đạt chuẩn (0.82s <= 30s)

=== TỔNG KẾT PHASE 2: 15 PASS, 0 FAIL ===
Toàn bộ test Phase 2 (Contract v1.1) đã ĐẠT hoàn hảo!
```

---

## 2. Kiểm chứng Hiệu năng Chạy Đêm Đầy Đủ (Benchmark)
- Yêu cầu Contract v1.1: Chạy headless 21.600 tick (tương đương 6 phút mô phỏng liên tục ở 60 tick/s) phải xong trong `<= 30 giây`.
- Kết quả thực nghiệm: **0.82 giây** (vượt xa chuẩn quy định, đạt tốc độ > 26.000 tick/giây).

---

## 3. Khớp chuẩn Trạng thái Bóng Mực (Contract v1.1)
Toàn bộ chu kỳ trạng thái của Bóng Mực đã được đồng bộ chuẩn:
`spawning` -> `wander` <-> `chase` -> `recoil` / `stunned`.
Mọi snapshot v1.1 đều cung cấp đầy đủ các trường `night`, `wind`, `player.vel`, `grounded`, `dash_cd_s`, `pulse_cd_s`, `charm_s`, các mảng bắt buộc `motes`, `drifters`, `charms`.


---

## 4. Bằng chứng Kiểm thử Giao diện & Trình duyệt (Playwright E2E Testing)

Lệnh thực thi:
```bash
npm run test:e2e
```

Kết quả thực nghiệm:
```text
=== BẮT ĐẦU CHẠY KIỂM THỬ PLAYWRIGHT E2E CHO GAME 3D ===
[E2E] Web Server đang lắng nghe tại http://localhost:3005

[1] Kiểm tra tải trang chính index.html...
  [PASS] Tải trang web thành công
  [PASS] Three.js Canvas kết xuất thành công
  [PASS] Hộp thoại giới thiệu Đêm 1 hiển thị
  [PASS] Đóng hộp thoại giới thiệu và bắt đầu màn chơi
  [PASS] HUD hiển thị đủ 3 Ngọn Lửa sinh mệnh
  [PASS] HUD hiển thị đủ thanh 10 ô đom đóm
  [PASS] Mũi tên chỉ hướng Đèn Lớn hoạt động trực quan

[2] Kiểm tra nhận input người chơi (WASD, Space, Shift, F, E)...
  [PASS] Các phím điều khiển Mây xử lý mượt mà không có ngoại lệ

[3] Kiểm tra Menu Tạm dừng & Cài đặt...
  [PASS] Phím Esc mở Menu Tạm dừng thành công
  [PASS] Nút Tiếp tục đóng Menu Tạm dừng và tiếp diễn game

[4] Kiểm tra chuyển cảnh sang Đêm 2 (Đảo Cau)...
  [PASS] Đêm 2 (Đảo Cau) khởi tạo với 6 Đèn Lớn và cầu tre

[5] Kiểm tra chuyển cảnh sang Đêm 3 (Đảo Chuông)...
  [PASS] Đêm 3 (Đảo Chuông) khởi tạo với 3 tầng đá và 7 Đèn Lớn
  [PASS] Lưu ảnh chụp bằng chứng game chạy thành công (e2e_night3_test.png)

[6] Tổng kết lỗi Runtime...
  [PASS] Không có lỗi Console Error (Số lỗi: 0)
  [PASS] Không có lỗi Unhandled Page Error (Số lỗi: 0)

=== TỔNG KẾT E2E: 15 PASS, 0 FAIL ===
```

### Các lỗi phát hiện và đã sửa dứt điểm:
1. **Lỗi 404 Favicon:** Trình duyệt tự động request `/favicon.ico` gây lỗi console 404 -> Đã bổ sung favicon SVG nhúng trực tiếp và cấu hình server trả status code 204.
2. **Lỗi Resume Menu Tạm dừng:** Nút bấm UI Resume kích hoạt toggle trực tiếp trạng thái `isPaused` thay vì phụ thuộc xung nhịp bàn phím, đảm bảo Menu Tạm dừng đóng/mở mượt mà 100%.
