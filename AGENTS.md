# AGENTS.md — Quy tắc và hướng dẫn cho AI Agent

Tài liệu này định hình môi trường làm việc, quy chuẩn mã nguồn và quy tắc kiểm chứng cho dự án **Đảo Đèn Lồng**.

## 1. Kiến trúc dự án
- **Logic lõi:** `src/engine/GameSimulation.js` là nguồn chân lý (single source of truth) duy nhất cho cả:
  - Headless test runner (`src/headless.js`)
  - Game visual 3D trên Web (`public/`)
- Mọi tính toán vật lý, di chuyển, va chạm, nhặt đom đóm, thắp đèn, AI Bóng Mực và tính điểm đều chạy ở tần số cố định **60 tick/s**.

## 2. Lệnh xây dựng và kiểm thử
- Cài đặt: `npm install`
- Chạy visual game: `npm start` hoặc `node src/server.js` (truy cập `http://localhost:3000`)
- Chạy bộ kiểm thử tự động: `npm test`
- Chạy headless contract:
  ```bash
  node src/headless.js --seed 42 --night 1 --ticks 300 --out out.jsonl
  ```

## 3. Quy tắc bắt buộc về Test Contract v1.0
- **Đầu vào/Đầu ra:** Tuân thủ 100% định dạng JSONL theo spec trong PRD-0.
- **Tính tất định (Determinism):** Cùng `--seed`, scenario và inputs phải cho kết quả JSONL giống hệt nhau.
- **Mã thoát:**
  - Thành công: `0`
  - File inputs hoặc scenario sai cú pháp/định dạng: `2` (ghi lỗi ra stderr)
  - Lỗi tham số khác: `1` (ghi lỗi ra stderr)
- **Tọa độ:** Làm tròn 3 chữ số thập phân (`round(v, 3)`).
- **Hệ tọa độ:** Đơn vị mét (m), trục Y hướng lên, mặt đất đảo ở Y = 0, người chơi xuất phát tại `(0, 0, 0)`.

## 4. Điều cấm
- Không bao giờ sửa tay file output để giả mạo kết quả test.
- Không commit API key, token bí mật hay file `.env`.
- Không thêm tính năng đồ họa làm thay đổi logic hoặc sai lệch kết quả headless contract.
- Không xóa các file harness (`AGENTS.md`, `tests/`, `docs/notes/`, `docs/proof/`).
