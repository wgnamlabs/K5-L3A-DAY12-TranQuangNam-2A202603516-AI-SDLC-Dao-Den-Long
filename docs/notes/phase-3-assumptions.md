# Đặc tả & Tiêu chí Nghiệm thu Phase 3 (Ticket-03)

Tài liệu này xác định các tiêu chí nghiệm thu (Acceptance Criteria) và thông số kỹ thuật chuẩn hóa theo **Ticket-03 — Change Request "Đèn cạn dầu"** và **Test Contract v1.2**.

---

## 1. Tiêu chí Nghiệm thu Hệ thống Nhiên liệu Đèn (Lantern Fuel System)

- **AC-F1 (Nhiên liệu tối đa & Khởi tạo):**
  - Mức nhiên liệu tối đa là 100 đơn vị.
  - Khi đèn vừa được thắp (lần đầu hoặc thắp lại): `fuel = 100.0`.
  - Được lưu trữ dưới dạng số nguyên `fuel_units = 6000` (tỉ lệ 60 units/đơn vị).
- **AC-F2 (Hao hụt tự nhiên):**
  - Đèn đang sáng tự hao hụt 1.0 đơn vị/giây (tính theo tick: 1/60 mỗi tick).
- **AC-F3 (Cơ chế Châm dầu):**
  - Khi bấm phím Tương tác (E / Enter) tại đèn đang sáng:
    $$\text{used} = \min\left(\text{carried}, \left\lceil \frac{100 - \text{fuel}}{10} \right\rceil\right)$$
    $$\text{fuel} = \min(100, \text{fuel} + 10 \times \text{used})$$
  - Trừ đúng `used` đom đóm trong túi.
  - Phát sự kiện `refuel { lantern_id: l.id, amount: used, fuel: round1(fuel) }`.
  - Cộng điểm: $+5$ điểm cho mỗi đom đóm nạp vào.
- **AC-F4 (Loại trừ đèn đầy dầu):**
  - Đèn đã đầy dầu (`round1(fuel) >= 100.0` hay `used = 0`) không được chọn khi tương tác, không phát sự kiện `refuel`, không cộng điểm và không trừ đom đóm.
- **AC-F5 (Hết dầu & Tắt đèn):**
  - Khi `fuel <= 0`: Đèn chuyển sang tắt (`lit = false`, `deposited = 0`, `fuel = 0.0`).
  - Ghi nhớ cờ `ever_lit = true`.
  - Phát sự kiện `lantern_out { lantern_id: l.id }`.
  - Ánh sáng môi trường giảm theo tỉ lệ số đèn sáng.
- **AC-F6 (Thắp lại đèn cạn dầu):**
  - Đèn chưa từng sáng (`ever_lit: false`): cần 10 đom đóm, phát sự kiện `lantern_lit { lantern_id, relight: false }`, cộng $+100$ điểm thắp lần đầu.
  - Đèn đã từng sáng (`ever_lit: true`): chỉ cần 5 đom đóm (`relight_cost = 5`), phát sự kiện `lantern_lit { lantern_id, relight: true }`, cộng $+40$ điểm thắp lại.

---

## 2. Tiêu chí Nghiệm thu Bóng Mực Hút Dầu (Shade Drain System)

- **AC-SD1 (Mất vùng an toàn):**
  - Đèn có `fuel < 30.0` lập tức mất vùng an toàn 6.0m. Đúng `fuel >= 30.0` thì vùng an toàn còn hiệu lực.
- **AC-SD2 (Ưu tiên mục tiêu của Bóng Mực):**
  - Chỉ Bóng Mực ở trạng thái `wander` mới chọn đèn yếu: tìm đèn sáng có `fuel < 30.0` gần nhất (bằng nhau chọn `id` nhỏ hơn).
  - Nếu không có đèn yếu, đi tới đèn tắt gần nhất như trước.
  - Bóng Mực đang `chase` không đổi mục tiêu.
- **AC-SD3 (Trạng thái Drain):**
  - Khi cách đèn yếu $\le 2.0\text{ m}$ (khoảng cách XZ), chuyển sang trạng thái `drain`.
  - Đứng yên và hút liên tục 5 fuel/giây (5/60 mỗi tick). Nhiều con cộng dồn tốc độ hút. Đèn vẫn tự hao hụt 1/giây.
  - Cứ mỗi 60 tick (1 giây) phát sự kiện `fuel_drain { lantern_id, shade_id, fuel }`.
- **AC-SD4 (Chuyển tiếp trạng thái từ Drain):**
  - Sang `chase`: khi Mây bước vào trong phạm vi 6.0m.
  - Sang `stunned`: khi trúng kỹ năng Tỏa Sáng (F / Pulse). Thưởng tổng cộng **+15 điểm** (thay vì +5).
  - Sang `wander`: khi đèn bị tắt hoàn toàn (`fuel <= 0`), khi đèn được châm dầu lên $\ge 30.0$, hoặc khi bị đẩy cách đèn $> 2.0\text{ m}$.
  - Hết choáng thì về `wander`.
- **AC-SD5 (Đẩy lùi khi châm dầu lại):**
  - Khi đèn được châm dầu lên $\ge 30.0$ lúc có Bóng Mực trong vùng 6.0m, các con đó bị đẩy ra mép vùng an toàn trong tối đa 30 tick và không gây sát thương trong lúc đó.

---

## 3. Tiêu chí Nghiệm thu Luật Thắng/Thua Bình Minh (Dawn Survival)

- **AC-W1 (Thời lượng Đêm chuẩn mới):**
  - Đêm 1: 240 giây (14.400 ticks).
  - Đêm 2: 270 giây (16.200 ticks).
  - Đêm 3: 300 giây (18.000 ticks).
- **AC-W2 (Không còn thắng sớm):**
  - Thắp đủ tất cả các đèn không kết thúc Đêm, trò chơi tiếp tục diễn ra cho đến hết thời gian.
- **AC-W3 (Điều kiện Thắng):**
  - Tại tick cuối cùng (`time_left_s <= 0`): Mây còn sống (ngọn lửa $> 0$) và số đèn đang sáng $\ge \lceil 0.6 \times \text{tổng đèn} \rceil$.
    - Đêm 1: cần $\ge 3/5$ đèn.
    - Đêm 2: cần $\ge 4/6$ đèn.
    - Đêm 3: cần $\ge 5/7$ đèn.
  - Phát sự kiện `game_over { result: "won", reason: "dawn_survived", score, night }`.
- **AC-W4 (Điều kiện Thua):**
  - Hết Ngọn Lửa (`flames <= 0`): thua ngay lập tức với lý do `no_flames` (kể cả ở tick cuối).
  - Hết giờ mà số đèn sáng $< 60\%$: thua với lý do `dawn`.
- **AC-W5 (Thứ tự thực thi trong tick):**
  1. Đọc input (xử lý pause trước).
  2. Giảm bộ đếm thời gian, hồi chiêu, bất tử, choáng, bùa; trừ nhiên liệu đèn (tự hao + Bóng Mực hút); đèn có `fuel <= 0` chuyển tắt (`lantern_out`).
  3. Di chuyển Mây và kiểm tra rơi khỏi đảo (`Y < -10`).
  4. Nhặt đom đóm và bùa gió.
  5. Tương tác với đèn lồng (châm dầu, nạp đom đóm).
  6. Cập nhật vùng an toàn đèn lồng.
  7. Tỏa Sáng (Pulse).
  8. Di chuyển Bóng Mực và Gió Lạc.
  9. Chạm / Va chạm (Gió Lạc cướp trước, Bóng Mực gây hit sau).
  10. Sinh thực thể mới theo lịch.
  11. Xét thắng/thua (sau mọi cập nhật; hết lửa luôn thua `no_flames` trước).
  12. Ghi snapshot nếu tới lượt.

---

## 4. Tiêu chí Nghiệm thu Sức chứa Túi & Hệ thống Điểm mới

- **AC-C1 (Sức chứa túi tăng dần):**
  - $\text{capacity} = \min(20, 10 + 2 \times \text{successful\_lights})$.
  - `successful_lights` đếm số lần thắp thành công (lần đầu hoặc thắp lại). Đặt lại 0 ở đầu mỗi Đêm.
  - HUD cập nhật trực quan số ô và hiển thị `đang mang / sức chứa`.
- **AC-S1 (Bảng điểm chuẩn Phase 3):**
  - Nạp đom đóm (thắp mới, thắp lại, châm dầu): $+5$ điểm/đom đóm.
  - Thắp lần đầu: $+100$ điểm.
  - Thắp lại: $+40$ điểm.
  - Choáng Bóng Mực bằng Tỏa Sáng: $+5$ điểm/con (tổng $+15$ điểm nếu đang `drain`).
  - Điểm thưởng bình minh (chỉ khi thắng):
    - Mỗi đèn đang sáng: $+50 + \lfloor\text{fuel}\rfloor$ điểm.
    - Mỗi Ngọn Lửa còn lại: $+50$ điểm.
  - Thưởng thời gian: **Bỏ hoàn toàn**.

---

## 5. Tiêu chí Nghiệm thu Chế độ Mù Màu (Colorblind Mode)

- **AC-CB1 (Cài đặt lưu trữ):** Cung cấp checkbox trong menu Tạm dừng "Bảng màu dễ phân biệt", lưu trạng thái vào `localStorage`.
- **AC-CB2 (Màu sắc chuẩn):**
  - Viền và mắt Bóng Mực đổi từ `#7A3CFF` / `#FF5A5F` sang `#00B3FF`.
  - Màu cảnh báo UI đổi từ `#FF5A5F` sang `#FFFFFF`, kèm biểu tượng `⚠`.
- **AC-CB3 (Nhận diện hình học không phụ thuộc màu):**
  - Đèn tắt bị co ngót xẹp $20\%$ theo trục đứng (scale Y = 0.8) và có hoa văn rách giấy.
  - Đèn có `fuel < 30.0` nhấp nháy chậm với tần số chuẩn 1 Hz.
