# Bang chung kiem chung Phase 1

## 1. Ket qua kiem thu tu dong (Automated Tests)
Bo kiem thu `tests/run_all_tests.js` gom 7 kich ban da chay thanh cong 100%:
- Test 1: Nhat dom dom va tang carried.
- Test 2: Nap dom dom vao den L1 va thap sang den.
- Test 3: Toa sang (Pulse) gay choang Bong Muc va day lui.
- Test 4: Tinh tat dinh (Determinism) giua 2 lan chay cung seed cho ra ket qua JSONL trung khop hoan toan.
- Test 5: Kiem tra bat loi input sai format voi ma thoat 2.
- Test 6: Dieu kien thang khi thap du ca 5 den.
- Test 7: Bong Muc gay sat thuong, giam ngọn lửa và rơi dom dom.

Tong ket: 10/10 assertions PASS.

## 2. Kiem chung Test Contract v1.0
File headless runner `src/headless.js` tao ra dung format JSONL theo dung quy dinh:
- Snapshot o tick 0 va moi chu ky `--snapshot-every`.
- Cac su kien `mote_picked`, `deposit`, `lantern_lit`, `pulse`, `player_hit`, `game_over`.
- Dong `end` cuoi cung bat buoc chua tick ket thuc, trang thai va diem so.
