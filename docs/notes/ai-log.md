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
