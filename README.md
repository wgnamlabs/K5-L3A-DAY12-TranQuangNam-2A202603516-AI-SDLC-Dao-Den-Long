# Đảo Đèn Lồng (Lantern Island) — AI SDLC Day 12

> **Tác giả:** Trần Quang Nam (MSSV: 2A202603516)  
> **Dự án:** Game 3D góc nhìn thứ ba & Chế độ Headless Test Contract v1.0  
> **Bản phát hành:** Tag `phase-1`

---

## 1. Hướng dẫn Cài đặt & Khởi chạy (Tối đa 2 lệnh)

Yêu cầu môi trường: Đã cài đặt **Node.js** (>= 18.x).

```bash
# 1. Cài đặt các gói phụ thuộc (nếu cần)
npm install

# 2. Khởi chạy game có giao diện 3D
npm start
```
Mở trình duyệt tại: **`http://localhost:3000`** để trải nghiệm game.

---

## 2. Cách chạy Kiểm thử & Chế độ Headless (Test Contract v1.0)

### Chạy bộ test tự động
```bash
npm test
```

### Chạy trực tiếp Test Contract Headless
```bash
node src/headless.js --seed 42 --night 1 --ticks 300 --out out.jsonl
```

Tham số hỗ trợ theo Test Contract v1.0:
- `--seed <int>`: Khởi tạo seed cho bộ sinh số ngẫu nhiên tất định.
- `--night 1`: Màn chơi Đêm 1.
- `--scenario <file.json>`: Nạp kịch bản tùy biến.
- `--inputs <file.json>`: Nạp chuỗi thao tác của người chơi.
- `--ticks <int>`: Số tick mô phỏng (60 tick/giây).
- `--out <file.jsonl>`: Tệp xuất kết quả định dạng JSONL.
- `--snapshot-every <int>`: Chu kỳ ghi snapshot (mặc định 10 tick).

---

## 3. Điều khiển trong Game (Controls)

- **W, A, S, D** hoặc **Phím mũi tên**: Di chuyển nhân vật Mây.
- **Kéo chuột** hoặc **Q / E**: Xoay góc nhìn camera 3D.
- **Phím Space (Cách)**: Tỏa sáng (Pulse) làm choáng Bóng Mực và đẩy lùi (tốn 1 đom đóm).
- **Phím E hoặc F**: Thắp sáng Đèn Lồng Lớn khi đứng trong bán kính của cột đèn.
- **Phím R**: Chơi lại ván mới.

---

## 4. Cơ chế Tính điểm (Scoring)

- **Nhặt đom đóm:** +10 điểm / đốm sáng.
- **Thắp Đèn Lớn thành công:** +100 điểm / đèn.
- **Tỏa sáng làm choáng Bóng Mực:** +25 điểm / quái vật.
- **Thưởng Thắng cuộc (khi thắp đủ 5 đèn):**
  - +2 điểm cho mỗi giây còn lại trước khi trời sáng.
  - +100 điểm cho mỗi Ngọn lửa sinh mệnh (flames) còn giữ được.

---

## 5. Sáng tạo của tôi (Creative Elements — Hạng mục F Rubric)

Nhằm mang lại trải nghiệm ấm áp, giàu bản sắc văn hóa Việt Nam mà vẫn tuân thủ tuyệt đối **Test Contract v1.0**:
1. **Hình tượng nhân vật Mây:** Thiết kế đội chiếc nón lá truyền thống có treo một chiếc đèn lồng nhỏ tỏa ánh vàng dịu bồng bềnh theo từng bước chân.
2. **Không gian biển mây cổ tích:** Đảo Bến được bao quanh bởi biển mây trôi nhẹ nhàng trong sương đêm.
3. **Ánh sáng đảo biến chuyển động:** Ban đầu đảo chìm trong bóng tối lạnh lẽo; mỗi khi một Đèn Lồng Lớn được thắp sáng, ánh sáng đảo và sương đêm ấm dần lên, tạo cảm giác hy vọng và hồi sinh.
4. **Bộ âm thanh thủ tục (Procedural Web Audio):** Tự động tổng hợp âm thanh gió đêm, tiếng chuông đom đóm, tiếng nạp đèn và tiếng xua đuổi bóng mực hoàn toàn bằng mã lệnh JavaScript, không phụ thuộc asset âm thanh ngoài.
5. **Đảm bảo tính tương thích:** Mọi hiệu ứng sáng tạo về hình ảnh/âm thanh chỉ tồn tại ở lớp hiển thị (Presentation Layer) và **hoàn toàn tách biệt** với lõi mô phỏng `GameSimulation.js`. Nhờ đó, chế độ Headless chạy độc lập và không bao giờ bị lệch dữ liệu so với Test Contract.

---

## 6. Cấu trúc Thư mục

```text
├── game.contract.json          # Đặc tả Test Contract v1.0
├── AGENTS.md                   # Chỉ dẫn và luật cho AI Agent
├── package.json                # Cấu hình dự án & scripts
├── README.md                   # Tài liệu chính
├── CREDITS.md                  # Ghi nhận bản quyền và nguồn gốc
├── src/
│   ├── engine/
│   │   └── GameSimulation.js   # Lõi mô phỏng vật lý & luật game (Single Source of Truth)
│   ├── headless.js             # CLI runner cho Test Contract v1.0
│   └── server.js               # Web server phục vụ game 3D
├── public/                     # Giao diện game 3D trên nền Three.js
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── audio.js            # Synthesizer âm thanh procedural
│       ├── game.js             # Render Three.js & camera 3D
│       └── vendor/three.min.js # Thư viện Three.js offline
├── tests/                      # Bộ kiểm thử tự động
│   ├── run_all_tests.js
│   └── scenarios/
└── docs/                       # Ghi chép kỹ thuật & bằng chứng
    ├── notes/
    │   ├── phase-1-assumptions.md
    │   └── ai-log.md
    └── proof/
        └── phase-1.md
```
