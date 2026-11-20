# AGENTS.md — Quy tắc và hướng dẫn cho AI Agent (Phase 2 - Contract v1.1)

Tài liệu này định hình môi trường làm việc, quy chuẩn mã nguồn và quy tắc kiểm chứng cho dự án **Đảo Đèn Lồng**.

## 1. Kiến trúc dự án
- **Logic lõi:** `src/engine/GameSimulation.js` là nguồn chân lý duy nhất (Single Source of Truth) cho:
  - Headless test runner (`src/headless.js`)
  - Game visual 3D trên Web (`public/`)
- Mọi tính toán vật lý, di chuyển, nhảy, lướt, bục nhảy, va chạm, nhặt đom đóm, bùa gió, thắp đèn, AI Bóng Mực, Gió Lạc và tính điểm đều chạy ở tần số cố định **60 tick/s**.

## 2. Lệnh xây dựng và kiểm thử
- Cài đặt: `npm install`
- Chạy visual game: `npm start` hoặc `node src/server.js` (truy cập `http://localhost:3000`)
- Chạy bộ kiểm thử tự động: `npm test`
- Chạy headless contract v1.1:
  ```bash
  node src/headless.js --seed 42 --night 1 --ticks 300 --out out.jsonl
  ```

## 3. Thứ tự xử lý bắt buộc trong 1 tick (Contract v1.1)
1. Đọc input (xử lý pause trước; nếu vừa tạm dừng thì dừng bước ở đây).
2. Giảm các bộ đếm: thời gian, hồi chiêu (lướt, tỏa sáng), bất tử, choáng, bùa, TTL đom đóm rơi, hồi bùa.
3. Di chuyển Mây (nhảy, lướt, bục nhảy, gió) rồi kiểm tra rơi khỏi đảo (`Y < -10`).
4. Nhặt đom đóm và bùa gió.
5. Tương tác với đèn lồng.
6. Cập nhật vùng an toàn đèn lồng.
7. Tỏa Sáng (Pulse).
8. Di chuyển Bóng Mực và Gió Lạc.
9. Chạm / Va chạm: Gió Lạc cướp trước, rồi Bóng Mực gây hit (xét theo id tăng dần).
10. Sinh đom đóm, Bóng Mực, Gió Lạc theo lịch (thực thể mới chỉ tương tác từ tick sau).
11. Xét thắng/thua.
12. Ghi snapshot nếu tới lượt.

## 4. Trạng thái Bóng Mực chuẩn hóa (Contract v1.1)
Phải dùng chính xác: `spawning`, `wander`, `chase`, `recoil`, `stunned`.

## 5. Điều cấm
- Không bao giờ sửa tay file output để giả mạo kết quả test.
- Không commit API key, token bí mật hay file `.env`.
- Không thêm tính năng đồ họa làm thay đổi logic hoặc sai lệch kết quả headless contract.
- Không xóa các file harness (`AGENTS.md`, `tests/`, `docs/notes/`, `docs/proof/`).
