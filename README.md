# Đảo Đèn Lồng (Lantern Island) — AI SDLC Day 12

> **Tác giả:** Trần Quang Nam (MSSV: 2A202603516)  
> **Dự án:** Game 3D góc nhìn thứ ba & Chế độ Headless Test Contract v1.1  
> **Bản phát hành:** Tag `phase-2` (Ticket-02 — "Ba hòn đảo")

---

## 1. Hướng dẫn Cài đặt & Khởi chạy (Tối đa 2 lệnh)

Yêu cầu môi trường: Đã cài đặt **Node.js** (>= 18.x).

```bash
# 1. Cài đặt các gói phụ thuộc (nếu cần)
npm install

# 2. Khởi chạy game có giao diện 3D
npm start
```
Mở trình duyệt tại: **`http://localhost:3000`** để trải nghiệm game chiến dịch 3 Đêm cùng Mây!

---

## 2. Cách chạy Kiểm thử & Chế độ Headless (Test Contract v1.1)

### Chạy bộ test tự động (15 kịch bản)
```bash
npm test
```

### Chạy trực tiếp Test Contract Headless v1.1
```bash
node src/headless.js --seed 42 --night 1 --ticks 300 --out out.jsonl
node src/headless.js --seed 42 --night 2 --ticks 300 --out out.jsonl
node src/headless.js --seed 42 --night 3 --ticks 300 --out out.jsonl
```

Tham số hỗ trợ theo Test Contract v1.1:
- `--seed <int>`: Khởi tạo seed cho bộ sinh số ngẫu nhiên tất định.
- `--night <1|2|3>`: Lựa chọn Đêm 1 (Đảo Bến), Đêm 2 (Đảo Cau), hoặc Đêm 3 (Đảo Chuông).
- `--scenario <file.json>`: Nạp kịch bản tình huống tùy biến.
- `--inputs <file.json>`: Nạp chuỗi thao tác của người chơi.
- `--ticks <int>`: Số tick mô phỏng (60 tick/giây).
- `--out <file.jsonl>`: Tệp xuất kết quả định dạng JSONL.
- `--snapshot-every <int>`: Chu kỳ ghi snapshot (mặc định 10 tick).

---

## 3. Điều khiển trong Game (Controls)

- **W, A, S, D** hoặc **Phím mũi tên**: Di chuyển nhân vật Mây.
- **Kéo chuột** hoặc **Q / E**: Xoay góc nhìn camera 3D.
- **Phím Space (Cách)**: Nhảy (khi chạm đất).
- **Phím Shift** hoặc **Chuột phải**: Lướt nhanh (Dash — 14 m/s trong 0.2s, hồi chiêu 1.5s).
- **Phím F**: Tỏa sáng (Pulse — tốn 3 đom đóm, choáng quái 120 tick và đẩy lùi 4m).
- **Phím E hoặc Enter**: Thắp sáng Đèn Lồng Lớn (nạp đom đóm) khi đứng gần đèn.
- **Phím Esc hoặc P**: Tạm dừng game (Menu cài đặt âm lượng, độ nhạy chuột, chơi lại).
- **Phím R**: Thử lại Đêm hiện tại.

---

## 4. Cơ chế Tính điểm (Scoring — Chuẩn hóa Ticket-02)

- **Nạp đom đóm vào đèn:** +10 điểm / đom đóm.
- **Thắp sáng 1 ngọn đèn thành công:** +100 điểm / đèn.
- **Tỏa sáng trúng Bóng Mực:** +5 điểm / quái vật.
- **Thưởng Thắng cuộc mỗi Đêm:**
  - `+ floor(giây còn lại) × 2`
  - `+ 50 × Ngọn Lửa sinh mệnh còn lại`
- **Tổng điểm toàn game:** Tổng điểm tích lũy qua các Đêm đã vượt qua.

---

## 5. Sáng tạo của tôi (Creative Elements — Hạng mục F Rubric)

1. **Hình tượng nhân vật Mây Việt Nam:** Mây đội nón lá tre mộc mạc, khoác áo thụng truyền thống điểm khăn đỏ `#C8102E`, mang chiếc đèn lồng nhỏ đung đưa theo nhịp bước chân.
2. **Chiến dịch 3 Đêm giàu cốt truyện:** Có lời dặn dò ấm áp của Ông Đăng mở đầu mỗi Đêm, dẫn dắt người chơi qua 3 hòn đảo: Đảo Bến yên bình, Đảo Cau gió lộng với cầu tre không lan can, và Đảo Chuông 3 tầng đá hùng vĩ.
3. **Mũi tên chỉ đường thông minh (HUD Tracker):** Khi đèn chưa thắp ở xa ngoài màn hình, một mũi tên vàng trực quan xoay theo hướng đèn kèm khoảng cách theo thời gian thực giúp người chơi định hướng dễ dàng.
4. **Bộ âm thanh thủ tục (Web Audio Synthesizer):** Tự động sinh toàn bộ tiếng lướt gió, tiếng nhảy, tiếng đếm ngược 10 giây cuối, tiếng chuông đom đóm hoàn toàn bằng mã lệnh JavaScript, không cần tải bất kỳ file mp3 nào từ bên ngoài.
5. **Cách ly hoàn toàn giữa Presentation và Simulation:** Toàn bộ hiệu ứng visual, camera và audio chỉ lắng nghe dữ liệu từ `GameSimulation.js`. Nhờ đó, chế độ Headless Test Contract v1.1 luôn đạt tính tất định 100% và tốc độ siêu nhanh (21.600 ticks chỉ mất 0.82 giây).

---

## 6. Cấu trúc Thư mục

```text
├── game.contract.json          # Đặc tả Test Contract v1.1
├── AGENTS.md                   # Chỉ dẫn và luật cho AI Agent (Phase 2)
├── package.json                # Cấu hình dự án & scripts
├── README.md                   # Tài liệu hướng dẫn chính
├── CREDITS.md                  # Ghi nhận bản quyền và nguồn gốc
├── src/
│   ├── engine/
│   │   └── GameSimulation.js   # Lõi mô phỏng vật lý 3 Đêm & luật game (Contract v1.1)
│   ├── headless.js             # CLI runner cho Test Contract v1.1
│   └── server.js               # Web server phục vụ game 3D
├── public/                     # Giao diện game 3D trên nền Three.js (Chuẩn bảng màu)
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── audio.js            # Synthesizer âm thanh procedural (Dash, Jump, Countdown)
│       ├── game.js             # Render Three.js 3 Đêm, camera, HUD, Settings
│       └── vendor/three.min.js # Thư viện Three.js offline
├── tests/                      # Bộ kiểm thử tự động 15 kịch bản
│   ├── run_all_tests.js
│   └── scenarios/
└── docs/                       # Ghi chép kỹ thuật & bằng chứng
    ├── notes/
    │   ├── phase-1-assumptions.md
    │   ├── phase-2-assumptions.md
    │   └── ai-log.md
    └── proof/
        ├── phase-1.md
        └── phase-2.md
```
