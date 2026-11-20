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
