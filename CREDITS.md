# Lời Cảm Ơn & Nguồn Gốc Tài Nguyên (Credits)

Dự án **Đảo Đèn Lồng (Lantern Island)** được xây dựng trong khuôn khổ học phần AI-SDLC.

---

## 1. Tác giả & Kỹ sư Dự án
- **Họ và tên:** Trần Quang Nam
- **Mã sinh viên:** 2A202603516
- **Khóa / Lớp:** K5 - L3A (Day 12)
- **Vai trò:** Lập trình kiến trúc game, thiết kế luật chơi, xây dựng bộ kiểm thử và điều phối AI.

---

## 2. Công cụ Trí tuệ Nhân tạo Hỗ trợ
- **Antigravity AI Agent (Google DeepMind):**
  - Trợ lý thông minh đồng hành trong toàn bộ quy trình phát triển từ Phase 1 đến Phase 4.
  - Hỗ trợ xây dựng GameSimulation lõi, thiết kế bộ kiểm thử tự động và Playwright E2E runner.

---

## 3. Công nghệ & Thư viện Mã Nguồn Mở
- **Three.js (r128):** Kết xuất đồ họa 3D WebGL, bóng đổ và ánh sáng môi trường.
- **Node.js (v20+):** Nền tảng chạy headless CLI runner, soak test và máy chủ game.
- **Playwright (v1.65+):** Khung kiểm thử tự động trong trình duyệt và đo đạc FPS benchmark.
- **Google Fonts:**
  - *Cinzel:* Phông chữ mang hơi hướng cổ điển cho tiêu đề và bảng xếp hạng.
  - *Be Vietnam Pro:* Phông chữ tiếng Việt cho văn bản và phụ đề trợ năng.

---

## 4. Âm thanh Thuần Mã Nguồn (Procedural Audio)
Mọi hiệu ứng âm thanh trong game được tổng hợp trực tiếp bằng Web Audio API không dùng file âm thanh tải ngoài:
- Tiếng đom đóm: Sóng sin lượn tần số cao.
- Tiếng nạp đèn và châm dầu: Sóng tam giác hòa âm ấm áp.
- Tiếng thắp đèn rực rỡ: Hợp âm arpeggio tươi sáng.
- Tiếng Tỏa Sáng (Pulse): Sóng quét tần số từ trầm đến cao.
- Tiếng Lướt (Dash): Tiếng gió rít tổng hợp từ nhiễu trắng qua bộ lọc dải tần.
- Tiếng va chạm sát thương: Sóng răng cưa dập tắt nhanh.
- Khúc nhạc Bình Minh: Hòa âm chúc mừng khi vượt qua đêm tối.
