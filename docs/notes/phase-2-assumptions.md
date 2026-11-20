# Đặc tả & Tiêu chí Nghiệm thu Phase 2 (Ticket-02)

Tài liệu này xác định các tiêu chí nghiệm thu (Acceptance Criteria) và thông số kỹ thuật chuẩn hóa theo **Ticket-02** và **Test Contract v1.1**.

---

## 1. Tiêu chí Nghiệm thu cho các tính năng mới (Phần 3 Ticket-02)

### A. Gió Lạc (Drifters) — Đêm 2 và Đêm 3
- **AC-D1 (Lịch sinh):** Xuất hiện tại tick 1200, 2400... tối đa 2 con, định danh D1, D2...
- **AC-D2 (Trạng thái & Tốc độ):**
  - `idle`: Lượn chậm 2.0 m/s.
  - `idle -> chase`: Khi Mây mang >= 5 đom đóm và khoảng cách <= 15m. Nếu mất điều kiện, quay lại `idle`.
- **AC-D3 (Cướp đom đóm):** Khi chạm Mây (khoảng cách XZ <= 1.2m), cướp `min(3, đang mang)` đom đóm và phát sự kiện `drifter_steal`, chuyển sang `flee` (7.0 m/s trong 240 tick rồi biến mất). Mỗi con chỉ cướp 1 lần.
- **AC-D4 (Tác động của Tỏa Sáng):**
  - Đang `chase`: Bị trúng Tỏa Sáng chuyển ngay sang `flee` mà không cướp được gì.
  - Đang `flee` và có đồ cướp: Bị trúng Tỏa Sáng thả lại toàn bộ số đom đóm đã cướp tại chỗ (`drifter_drop`) thành đom đóm rơi (TTL 480 tick), biến mất sau 120 tick.
- **AC-D5 (Tính chất):** Không gây mất Ngọn Lửa; không bị chặn bởi vùng an toàn đèn; trạng thái bất tử của Mây không ngăn việc bị cướp.

### B. Bùa Gió (Wind Charm) — Đêm 2 và Đêm 3
- **AC-C1 (Nhặt bùa):** Nhặt khi XZ <= 1.0m và chênh cao <= 1.5m. Phát sự kiện `charm_picked`.
- **AC-C2 (Hiệu lực 600 tick):** Tốc độ chạy tăng lên 7.2 m/s; hồi chiêu Lướt về 0 (`dash_cd = 0`, lướt liên tục mỗi lần bấm). Nhặt lại thì làm mới 600 tick.
- **AC-C3 (Tái sinh):** Bùa xuất hiện lại sau 2700 tick.
- **AC-C4 (Vị trí):** Đêm 2 tại (35, 0, 0); Đêm 3 tại (30, 0, 25) và (-30, 0, 25).

### C. Cơ chế Lướt (Dash)
- **AC-DS1:** Tốc độ 14.0 m/s, thời gian 0.2s (12 tick), hồi chiêu 1.5s (90 tick).
- **AC-DS2:** Hướng theo hướng đang di chuyển (hoặc hướng quay mặt nếu đứng yên). Lướt trên không giữ nguyên độ cao (`vy = 0`). Không bất tử khi lướt.

### D. Rơi khỏi đảo (Y < -10)
- **AC-F1:** Xảy ra đúng 1 lần khi Y < -10: mất 1 Ngọn Lửa, mất toàn bộ đom đóm mang theo.
- **AC-F2:** Đợi 60 tick bất động, sau đó hồi sinh tại (0, 0, 0), vận tốc 0, bất tử 90 tick.
- **AC-F3:** Nếu hết Ngọn Lửa thì thua ngay (`no_flames`), không hồi sinh.

### E. Tạm dừng (Pause - Esc/P)
- **AC-P1:** Khi bấm pause, logic dừng hoàn toàn (tick tăng nhưng sim_tick, thời gian, hồi chiêu, spawn đều đứng yên).
- **AC-P2:** Phát sự kiện `paused`, snapshot ghi `state: "paused"`. Bấm lại phát sự kiện `resumed`, tiếp tục game.

---

## 2. Bản đồ chuẩn hóa 3 Đêm
- **Đêm 1 (Đảo Bến):** Bán kính 40m, 5 đèn (L1..L5), thời lượng 300s.
- **Đêm 2 (Đảo Cau):** 2 đảo tròn bán kính 28m (tâm (0,0,0) và (70,0,0)) nối bằng cầu tre x ∈ [26, 44], z ∈ [-2, 2]; 2 bục nhảy 14 m/s Y + 24 m/s ngang; 6 đèn (L1..L6); thời lượng 330s.
- **Đêm 3 (Đảo Chuông):** Đảo bán kính 45m gồm 3 tầng (Y=0, Y=3, Y=6); 2 dốc góc 30° và 150°; bục nhảy tại (0, 3, 13) lên tầng 2; tháp chuông bán kính 2m cao 8m; gió mạnh chu kỳ 30s; 7 đèn (L1..L7); thời lượng 360s.
