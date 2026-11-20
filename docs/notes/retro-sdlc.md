# Báo Cáo Nhìn Lại Quy Trình Phát Triển Với AI (AI-SDLC Retrospective)

**Dự án:** Đảo Đèn Lồng (Lantern Island) — Phiên bản 1.0.0  
**Học viên:** Trần Quang Nam (MSV: 2A202603516)  
**Khóa:** K5 - L3A (Day 12)  
**Mô hình phát triển:** AI Software Development Life Cycle (AI-SDLC)  

---

## 1. Tổng kết Đánh giá Qua 4 Giai đoạn (Evaluation Synthesis)

| Giai đoạn | Mục tiêu cốt lõi | Bộ kiểm thử tự động | Kết quả kiểm thử Web E2E | Trạng thái nghiệm thu |
| :---: | :--- | :---: | :---: | :---: |
| **Phase 1 (MVP)** | Khởi tạo mô phỏng lõi, di chuyển Mây, đom đóm, Đèn Lớn, Tỏa Sáng, Quái Mực, 3 ngọn lửa. | 5/5 PASS | 7/7 PASS | Đạt chuẩn Contract v1.0 |
| **Phase 2 (Mở rộng 3 Đêm)** | Chuẩn hóa bản đồ 3 Đêm (Đảo Bến, Đảo Cau, Đảo Chuông), Gió Lạc, Bùa Gió, Lướt, Bục nhảy, Rơi đảo, Tạm dừng. | 15/15 PASS | 15/15 PASS | Đạt chuẩn Contract v1.1 |
| **Phase 3 (Đèn cạn dầu)** | Hệ thống nhiên liệu đèn, châm dầu, quái hút dầu (`drain`), luật thắng Sinh tồn Bình minh, sức chứa túi, chế độ mù màu. | 39/39 PASS | 19/19 PASS | Đạt chuẩn Contract v1.2 |
| **Phase 4 (Phát hành v1.0.0)** | Đo hiệu năng tự động (Benchmark), Soak test 10 đêm, Bảng xếp hạng cục bộ, Trợ năng toàn diện (đổi phím, phụ đề, giảm chuyển động). | 47/47 PASS | 23/23 PASS | Đạt chuẩn Contract v1.3 |

---

## 2. Những Điều Hiệu Quả và Không Hiệu Quả Khi Làm Việc Với AI

### A. Những điều thực sự hiệu quả (What Worked Well)
1. **Kiến trúc Single Source of Truth (`GameSimulation.js`):**
   - Việc ngay từ Phase 1 cô lập toàn bộ logic toán học, chuyển động, va chạm và luật chơi vào một module JavaScript thuần (zero-dependency) giúp AI sinh code không bị phân tán giữa logic headless và kết xuất đồ họa.
   - Cả CLI headless runner và giao diện Web Three.js đều tiêu thụ chung một đối tượng mô phỏng, đảm bảo tính tất định 100%.
2. **Quy tắc Harness chặt chẽ (`AGENTS.md`):**
   - Đặt ra thứ tự xử lý bắt buộc trong 1 tick (12 bước tuần tự) và các trạng thái quái chuẩn hóa giúp AI không bao giờ tự ý đảo lộn thứ tự tính toán vật lý hay sự kiện.
3. **Phát triển TDD kết hợp Playwright Visual Evaluator:**
   - Việc xây dựng script đánh giá tự động trong trình duyệt (`play_and_evaluate.js`) đã biến "đánh giá bằng mắt người" thành các assertion máy học có thể kiểm tra định lượng, phát hiện ngay các lỗi CSS, góc camera hoặc trạng thái HUD.

### B. Những điều không hiệu quả hoặc gặp rào cản (What Didn't Work Well)
1. **Thiếu ngữ cảnh đồ họa 3D sâu:**
   - AI có xu hướng phỏng đoán toán học chiếu hình (như kiểm tra $v.z < 1.0$ trong hệ tọa độ NDC của Three.js) mà quên mất các điểm nằm sau camera trong ma trận phối cảnh có $w < 0$. Con người phải can thiệp bằng kiến thức đồ họa không gian mắt (eye-space) để sửa dứt điểm.
2. **Quản lý bộ nhớ V8 và hệ điều hành:**
   - Trong Soak test, AI ban đầu không tính đến việc V8 cấp phát bộ nhớ theo block trang 16MB từ OS, dẫn đến tỉ lệ RSS có thể dao động nhẹ trong những tick đầu tiên. Cần chỉ định cơ chế cấp phát trang nền (warmup baseline pages) và gọi Garbage Collection chuẩn.
3. **Ảo giác về các hàm / biến toàn cục trong trình duyệt:**
   - AI đôi khi giả định biến `let sim` ở top-level file script sẽ tự động có trên `window.sim`. Con người cần rà soát phạm vi truy cập biến toàn cục trên Web.

---

## 3. Những Lần AI Sai Sót & Phương Pháp Phát Hiện

1. **Lỗi làm tròn châm dầu khi đèn đầy (Phase 3):**
   - *Hiện tượng:* Đèn ở mức 99.98 fuel bị trừ 1 đom đóm do $\lceil(100 - 99.98)/10\rceil = 1$.
   - *Cách phát hiện:* Test 15 trong bộ kiểm thử headless báo lỗi vì kỳ vọng đèn đầy không nhận đom đóm.
   - *Khắc phục:* Bổ sung hàm làm tròn 1 chữ số thập phân `round1(fuel)` trước khi kiểm tra điều kiện nhận tương tác.
2. **Lỗi mất mũi tên chỉ hướng mép màn hình khi mục tiêu ở phía sau (Phase 4):**
   - *Hiện tượng:* Script Playwright báo `offscreen-arrow` có `style.display = 'none'` dù quái ở tọa độ `[-80, 0, -80]`.
   - *Cách phát hiện:* Assertions trong `play_and_evaluate.js` ghi nhận `Mũi tên chỉ hướng: false`.
   - *Khắc phục:* Nhân vector với `camera.matrixWorldInverse` để kiểm tra tọa độ $Z$ mắt ($p_{\text{eye}}.z \ge 0$), xác định chính xác mục tiêu nằm sau lưng camera để đảo chiều hướng chỉ báo.
3. **Lỗi timeout 30s của Playwright `waitForFunction` (Phase 4):**
   - *Hiện tượng:* Lệnh đo benchmark 30s bị crash sau đúng 30.000ms.
   - *Cách phát hiện:* Log stderr báo lỗi `Timeout 30000ms exceeded`.
   - *Khắc phục:* Phát hiện chữ ký hàm `waitForFunction(fn, arg, options)`, Playwright coi tham số thứ hai là `arg` nếu không truyền `null`. Đã cấu hình `page.setDefaultTimeout()` để bao quát toàn bộ phiên đo.

---

## 4. Vai Trò của Test Harness trong Quá Trình Phát Triển

- `AGENTS.md`: Là "bản hiến pháp kỹ thuật" tối thượng. Nhờ quy định cấm sửa tay file output và cấm xóa harness, AI luôn tìm cách sửa đúng nguyên nhân gốc rễ (root cause) trong mã nguồn thay vì lách luật.
- `game.contract.json`: Định nghĩa các hằng số tuning và lệnh thực thi chuẩn hóa (`bench_cmd`, `soak_cmd`, `run_cmd`, `headless_cmd`), giúp AI không bao giờ tự ý bịa đặt tên lệnh mới.
- **Bộ Test Kịch bản Scenario JSON:** Việc chia nhỏ các tình huống (như `fuel_decay`, `shade_drain`, `relight`, `dawn_win`) thành các file độc lập giúp kiểm thử cô lập từng cơ chế với độ tin cậy tuyệt đối.

---

## 5. Tổng Kết Chi Phí & Ước Tính Token AI

| Giai đoạn phát triển | Prompt Tokens | Completion Tokens | Tổng Tokens | Chiến lược tiết kiệm chi phí |
| :--- | :---: | :---: | :---: | :--- |
| **Phase 1 (MVP)** | ~18,000 | ~6,000 | ~24,000 | Tập trung một file lõi, test CLI trước khi làm Web. |
| **Phase 2 (Mở rộng)** | ~16,000 | ~6,000 | ~22,000 | Tái sử dụng engine Phase 1, chỉ viết thêm entity handler. |
| **Phase 3 (Đèn cạn dầu)** | ~20,000 | ~8,000 | ~28,000 | Gom batch gọi lệnh kiểm thử, không poll lặp vô ích. |
| **Phase 4 (Phát hành)** | ~22,000 | ~9,000 | ~31,000 | Kiểm tra cú pháp bằng `node --check`, chạy test song song. |
| **TỔNG CỘNG 4 PHASE** | **~76,000** | **~29,000** | **~105,000** | Chi phí ước tính: **~$0.21 USD** (vô cùng tiết kiệm). |

### Các kỹ thuật tiết kiệm token đã áp dụng:
- **Batch Tools:** Gom các lệnh tìm kiếm, đọc file và kiểm tra git vào một lượt gọi công cụ duy nhất.
- **Không Polling:** Tận dụng Reactive Wakeup của hệ thống khi chạy background tasks thay vì gọi vòng lặp kiểm tra trạng thái tiến trình.
- **Kiểm tra cú pháp tại chỗ:** Dùng `node --check` trước khi chạy các kịch bản test nặng để tránh lãng phí vòng lặp sửa lỗi syntax.

---

## 6. Bài Học Kinh Nghiệm — Nếu Làm Lại Sẽ Thay Đổi Gì?

1. **Thiết kế Hệ thống Nhiên liệu ngay từ đầu:** Nếu biết trước cơ chế cạn dầu ở Phase 3, có thể xây dựng vòng đời đèn có tham số tiêu hao ngay từ Phase 1, tránh phải refactor mô hình trạng thái đèn ở Phase 3.
2. **Module hóa Trình duyệt và Server:** Nên tách máy chủ HTTP thành module dùng chung ngay từ đầu cho cả app chính, benchmark runner và Playwright test suite, tránh việc trùng lặp logic routing API.
3. **Tự động hóa Đo Đạc Trợ Năng sớm hơn:** Đưa các tiêu chuẩn cỡ chữ, tương phản màu và phím tắt vào tiêu chí kiểm thử từ Phase 1 để giao diện hoàn thiện đồng bộ ngay từ những ngày đầu.
