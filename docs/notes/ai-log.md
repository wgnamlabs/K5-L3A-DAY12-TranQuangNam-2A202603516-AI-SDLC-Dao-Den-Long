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
