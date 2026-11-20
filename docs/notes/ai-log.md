# Nhat ky su dung AI (Phase 1)

## 1. Quy trinh phat trien (SDLC)
- Doc ky PRD-0 va Test Contract v1.0 truoc khi lap trinh.
- Xay dung GameSimulation.js doc lap de chay chung cho ca Headless CLI va Visual 3D Web.
- Phat trien bo kiem thu tu dong tests/run_all_tests.js truoc khi hoan thien visual rendering.
- Uoc tinh chi phi token: khoang 18,000 prompt tokens va 6,000 completion tokens nho batch call va context gon.

## 2. Quan ly Harness
- Luat duoc dinh nghia trong AGENTS.md.
- Kiem soat tinh tat dinh bang bo sinh so gia ngau nhien co seed Mulberry32.
- Chan loi thoat code 2 khi input khong tang nghiem ngat.


## 3. Nhat ky su dung AI (Phase 2 - Ticket-02)
- Tiep nhan Ticket-02: Chuan hoa toan bo so lieu chuan theo bang, nang cap Contract len v1.1.
- Mo rong kien truc cho 3 Dem (Dao Ben, Dao Cau, Dao Chuong) va cac thuc the moi (Gio Lac, Bua Gio, Buc nhay).
- Bo kiem thu tu dong 15 kich ban, bao gom kiem thu hoi quy Phase 1 va toan bo tinh nang moi.
- Benchmark hieu nang: 21.600 ticks hoan thanh trong 0.82 giay (tieu chuan <= 30 giay).
- Uoc tinh token su dung cho Phase 2: khoang 16,000 prompt tokens va 6,000 completion tokens.


## 4. Nhat ky su dung AI (Phase 3 - Ticket-03 "Đèn cạn dầu")
- Tiep nhan Change Request Ticket-03: Thay doi luat cot loi, nang cap Contract len v1.2.
- Trien khai he thong nhien lieu den (fuel decay 1/s, refuel ceil((100-fuel)/10), thap lai 5 dom dom).
- Bo sung trang thai moi `drain` cho Bong Muc (hut 5 fuel/s khi cach den yeu <= 2m), mat vung an toan khi fuel < 30.
- Luat thang moi: Song sot toi binh minh (Dawn Survival) voi so den sang >= 60%, loai bo thang som all_lit.
- Mo rong suc chua tui tang dan va Che do bang mau de phan biet (Colorblind Mode).
- Bo kiem thu tu dong nang cap len 24 kich ban (39 assertions), dat 100% PASS.
- Kiem thu tu dong Playwright E2E tren trinh duyet dat 19/19 tieu chi dat chuan.
- Soan thao Architecture Decision Record (ADR-001) va CHANGELOG cho cac breaking changes.
- Uoc tinh chi phi token cho Phase 3: khoang 20,000 prompt tokens va 8,000 completion tokens.


## 5. Nhat ky su dung AI (Phase 4 - Ticket-04 "Bình minh: phát hành v1.0.0")
- Tiep nhan Ticket-04: Non-functional & Release v1.0.0, nang cap Contract len v1.3.
- Xay dung Benchmark mode bang Playwright (`node src/benchmark.js`), can do 200 Bong Muc, 100 dom dom rieng biet tai `public/benchmark.html`, cach ly hoan toan khoi man hinh choi game chinh de tranh anh huong gameplay.
- Xay dung Soak test 10 Dem lien tuc trong mot tien trinh Node.js (`node src/soak.js`), Mulberry32 PRNG ngau nhien hoa input, kiem soat ro ri bo nho (mem_end <= 1.2 * mem_start, crashes = 0).
- Trien khai Bang xep hang cuc bo (Local Leaderboard): Luu Top 10 ben vung vao `data/leaderboard.json` va `localStorage`, sap xep diem giam dan, tien trinh dat truoc uu tien truoc, ho tro CLI `--export-leaderboard out.json`.
- He thong Tro nang toan dien (Accessibility): Doi 9 phim dieu khien (co bat trung phim), phu de su kien & mui ten chi huong quai ngoai man hinh, Che do giam chuyen dong (Reduced Motion), Co chu lon (Large UI text 1.25x).
- Mo rong bo kiem thu headless len 28 kich ban (52 assertions), 100% PASS.
- Kiem thu tu dong Playwright E2E tren trinh duyet dat 19/19 tieu chi nghiem thu, giu nguyen 100% gameplay, tao hinh May non la, giao dien HUD chuan Phase 3.
- Hoan thien he thong tai lieu: README.md (< 3 lenh quickstart), CHANGELOG.md (chuan Keep a Changelog), CREDITS.md, LICENSE (MIT), retro-sdlc.md (1-2 trang danh gia AI-SDLC), phase-4.md (bang chung thuc nghiem).
- Uoc tinh chi phi token cho Phase 4: khoang 22,000 prompt tokens va 9,000 completion tokens. Tong cong ca 4 Phase: ~105,000 tokens (~$0.21 USD).

