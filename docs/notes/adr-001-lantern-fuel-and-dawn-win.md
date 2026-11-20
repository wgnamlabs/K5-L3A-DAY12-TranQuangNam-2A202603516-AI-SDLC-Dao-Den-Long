# ADR-001: Mô hình Quản lý Nhiên liệu Đèn và Luật Thắng Bình Minh (Contract v1.2)

**Trạng thái:** Đã chấp thuận (Accepted)  
**Ngày:** 20/11/2026  
**Dự án:** Đảo Đèn Lồng (Lantern Island)  
**Ticket tham chiếu:** TICKET-03 — CHANGE REQUEST "Đèn cạn dầu" (Phase 3)  
**Test Contract:** Phiên bản 1.2  

---

## 1. Bối cảnh & Vấn đề (Context)
Trong Phase 1 và Phase 2, cơ chế thắp đèn vận hành theo quy tắc nhị phân cố định:
- Khi nạp đủ 10 đom đóm, Đèn Lớn chuyển sang trạng thái sáng vĩnh viễn (`lit: true`) và không nhận thêm đom đóm.
- Màn chơi kết thúc thắng ngay lập tức khi tất cả đèn trên đảo được thắp sáng (`all_lit`).

### Vấn đề thực tế (Playtest findings):
Playtest cho thấy người chơi có kỹ năng có thể thắp toàn bộ đèn chỉ trong vòng ~2 phút đầu tiên. Hệ quả là game kết thúc quá sớm, loại bỏ hoàn toàn cảm giác căng thẳng và nhịp độ sinh tồn trong nửa sau của Đêm. Trò chơi thiếu động lực giữ người chơi tương tác liên tục và phân bổ tài nguyên hợp lý.

Nhà thiết kế quyết định: **"Đèn thắp rồi vẫn có thể tắt, mục tiêu chuyển từ 'thắp hết' sang 'giữ đảo sáng tới bình minh'."**

---

## 2. Các Động lực Thiết kế (Decision Drivers)
1. **Duy trì nhịp độ căng thẳng (Sustained Tension):** Người chơi không thể "nghỉ tay" sau khi thắp đèn mà phải quản lý nhiên liệu, tuần tra đảo, bảo vệ các đèn sắp cạn.
2. **Tính tất định và Độ chính xác cao (Determinism & Numerical Precision):** Mô phỏng chạy ở 60 tick/s; việc trừ và cộng số thực lặp đi lặp lại có thể gây sai số dấu phẩy động (floating point drift). Cần cơ chế lưu trữ chính xác tuyệt đối.
3. **Mô hình trạng thái rõ ràng (State Machine Clarity):** Trạng thái đèn và AI Bóng Mực cần có sự chuyển giao trạng thái chặt chẽ, không sinh ra race condition hoặc tranh chấp tương tác.
4. **Tương thích ngược và Mở rộng Contract v1.2:** Giữ vững harness kiểm thử tự động, chuẩn hóa snapshot và sự kiện cho cả headless CLI và giao diện 3D Web.

---

## 3. Các Quyết định Thiết kế (Decisions)

### Quyết định 1: Mô hình Vòng đời Nhiên liệu Đèn (Lantern Fuel Lifecycle)
- **Đơn vị nội bộ nguyên:** Thay vì lưu số thực `fuel` trong mỗi tick, mô phỏng lưu `fuel_units` dưới dạng số nguyên với tỉ lệ `60 units = 1.0 fuel` (tức `6000 units = 100.0 fuel`).
  - Mỗi tick đèn sáng tự hao hụt đúng `1 unit` (tương đương `1.0 đơn vị/giây`).
  - Khi xuất snapshot hoặc emit event, giá trị được chuyển đổi thành số thực làm tròn 1 chữ số thập phân (`round1(fuel_units / 60.0)`).
- **Trạng thái cạn dầu (`fuel <= 0`):**
  - Đèn chuyển sang tắt: `lit = false`, `deposited = 0`, `fuel_units = 0`.
  - Đèn lưu cờ `ever_lit = true`.
  - Phát sự kiện `lantern_out { lantern_id: l.id }`.
  - Ánh sáng môi trường tự động giảm theo tỉ lệ số đèn đang sáng.
- **Thắp lại đèn (Relight):**
  - Đèn chưa từng sáng (`ever_lit: false`): cần 10 đom đóm để thắp.
  - Đèn từng sáng nhưng bị tắt do cạn dầu (`ever_lit: true`): chỉ cần **5 đom đóm** (`relight_cost = 5`).
  - Phát sự kiện `lantern_lit { lantern_id, relight: true|false }`.
  - Khi thắp (lần đầu hoặc thắp lại), đèn lập tức đầy 100 fuel (`fuel_units = 6000`).

### Quyết định 2: Cơ chế Châm dầu & Ưu tiên Tương tác (Refueling Interaction)
- **Công thức châm dầu:**
  $$\text{used} = \min\left(\text{carried}, \left\lceil \frac{100 - \text{fuel}}{10} \right\rceil\right)$$
  $$\text{fuel} = \min(100, \text{fuel} + 10 \times \text{used})$$
  Mỗi đom đóm nạp vào hồi 10 fuel. Trừ đúng `used` đom đóm trong túi của Mây.
- **Tiêu chuẩn đèn nhận tương tác:**
  - Chỉ xét đèn chưa sáng (`!lit`) hoặc đèn đang sáng nhưng chưa đầy dầu (`lit && round1(fuel) < 100.0`).
  - Đèn đã đầy dầu (`used = 0`) bị loại khỏi danh sách candidate, không được chọn khi tương tác, không phát sự kiện và không cộng điểm.
  - Chọn đèn gần nhất trong bán kính tương tác (2.0m); nếu khoảng cách bằng nhau thì ưu tiên đèn có `id` nhỏ hơn.

### Quyết định 3: AI Bóng Mực Hút Dầu & Mất Vùng An Toàn (Shade Drain State)
- **Mất vùng an toàn:** Đèn có `fuel < 30.0` lập tức mất vùng an toàn 6.0m. Đúng `fuel >= 30.0` thì vùng an toàn hoạt động bình thường.
- **Ưu tiên mục tiêu của Bóng Mực (trạng thái `wander`):**
  - Ưu tiên 1: Đèn đang sáng có `fuel < 30.0` gần nhất (bằng nhau chọn `id` nhỏ hơn).
  - Ưu tiên 2: Nếu không có đèn yếu, tìm đèn tắt gần nhất như trước.
  - Bóng Mực đang `chase` giữ nguyên mục tiêu đuổi Mây.
- **Trạng thái `drain`:**
  - Khi cách đèn mục tiêu $\le 2.0\text{ m}$ (khoảng cách XZ), chuyển sang trạng thái mới `drain`.
  - Đứng yên và hút liên tục `5 fuel/giây` (`5 units/tick`). Nhiều con hút thì cộng dồn.
  - Cứ mỗi 60 tick (1 giây) phát sự kiện `fuel_drain { lantern_id, shade_id, fuel }`.
  - Chuyển trạng thái:
    - Sang `chase`: Nếu Mây bước vào trong phạm vi 6.0m.
    - Sang `stunned`: Nếu trúng Tỏa Sáng (Pulse). Thưởng điểm đặc biệt: **+15 điểm** (thay vì +5 thông thường).
    - Sang `wander`: Nếu đèn bị tắt hoàn toàn (`fuel <= 0`), nếu đèn được châm dầu lên $\ge 30.0$, hoặc bị đẩy cách đèn $> 2.0\text{ m}$.
- **Hiệu ứng đẩy lùi khi châm dầu lại:** Khi đèn được châm dầu lên $\ge 30.0$, toàn bộ Bóng Mực trong phạm vi 6.0m bị đẩy ra mép vùng an toàn trong tối đa 30 tick và không gây sát thương trong thời gian bị đẩy.

### Quyết định 4: Luật Thắng Bình Minh (Dawn Survival Win Rule)
- **Xóa bỏ thắng sớm:** Thắp đủ tất cả các đèn không kết thúc Đêm. Người chơi phải duy trì bảo vệ đảo cho tới tick cuối cùng của Đêm.
- **Thời lượng Đêm chuẩn mới:**
  - Đêm 1: 240 giây (14.400 ticks)
  - Đêm 2: 270 giây (16.200 ticks)
  - Đêm 3: 300 giây (18.000 ticks)
- **Điều kiện Thắng Bình Minh:**
  - Tại tick cuối cùng (`time_left_s <= 0`): Mây còn sống (ngọn lửa $> 0$) VÀ số đèn đang sáng $\ge \lceil 0.6 \times \text{tổng đèn} \rceil$.
    - Đêm 1 (5 đèn): cần $\ge 3$ đèn sáng.
    - Đêm 2 (6 đèn): cần $\ge 4$ đèn sáng.
    - Đêm 3 (7 đèn): cần $\ge 5$ đèn sáng.
  - Kết thúc với lý do: `dawn_survived` (thay thế hoàn toàn `all_lit`).
- **Điều kiện Thua:**
  - Hết Ngọn Lửa: thua ngay lập tức với lý do `no_flames` (kể cả ở tick bình minh, hết lửa luôn thua trước).
  - Hết giờ mà số đèn sáng $< 60\%$: thua với lý do `dawn`.

### Quyết định 5: Cơ chế Mở rộng Túi Đom đóm (Dynamic Bag Capacity)
- Sức chứa túi ban đầu: 10 đom đóm.
- Công thức tăng tiến: $\text{capacity} = \min(20, 10 + 2 \times \text{successful\_lights})$.
- `successful_lights` đếm số lần thắp thành công trong Đêm (bao gồm thắp lần đầu và thắp lại; đèn scenario đặt sẵn không tính). Đặt lại về 0 ở đầu mỗi Đêm.

---

## 4. Bảng So sánh Trạng thái Trước & Sau Thay đổi

| Thuộc tính / Cơ chế | Phase 1 & 2 (Cũ) | Phase 3 — Ticket-03 (Mới) | Lý do thay đổi |
| :--- | :--- | :--- | :--- |
| **Đèn sau khi thắp** | Sáng vĩnh viễn, không nhận tương tác | Hao dầu 1/giây, nhận châm dầu để duy trì | Tránh game kết thúc sớm, tăng tính chiến thuật |
| **Bảo vệ Vùng An Toàn** | Luôn đẩy lùi Bóng Mực | Mất an toàn khi `fuel < 30` | Tạo áp lực cứu đèn sắp tắt |
| **Hành vi Bóng Mực** | Chỉ lảng vảng quanh đèn tắt | Ưu tiên tìm đèn yếu và hút dầu (`drain`) | Tạo kẻ thù chủ động làm giảm tài nguyên đảo |
| **Điều kiện Thắng** | Thắp hết 100% đèn (ngay lập tức) | Sống sót đến bình minh và giữ $\ge 60\%$ đèn sáng | Chuyển gameplay sang phòng thủ sinh tồn |
| **Lý do Kết thúc Thắng** | `all_lit` | `dawn_survived` | Phù hợp cốt truyện bình minh |
| **Chi phí Thắp lại** | Không có (vì đèn không bao giờ tắt) | 5 đom đóm (đèn mới vẫn 10) | Hỗ trợ người chơi gỡ gạc khi bị cạn dầu |
| **Sức chứa Túi** | Cố định 10 | Tăng dần: $10 + 2 \times \text{lights}$, tối đa 20 | Tưởng thưởng khi thắp đèn liên tục |

---

## 5. Hệ quả & Kế hoạch Chuyển đổi (Consequences)
- **Tác động tích cực:** Lối chơi có chiều sâu rõ rệt, kết hợp giữa thu thập đom đóm, lựa chọn ưu tiên giữ đèn nào và đối phó quái vật.
- **Breaking Changes:** Cập nhật `game.contract.json` lên v1.2, cập nhật snapshot schema và event stream.
- **Test Harness:** Toàn bộ test cũ không còn tương thích (như kỳ vọng kết thúc ngay khi thắp hết đèn) được nâng cấp sang Contract v1.2, bổ sung 13 test scenario mới chứng minh 100% các tiêu chí AC.
