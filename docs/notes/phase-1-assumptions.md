# Ghi chú kỹ thuật & Giả định Phase 1

## 1. Thông số trò chơi (Tuning)
- Ban kính đảo: 32m, tâm tại (0, 0, 0), người chơi không rơi khỏi đảo (fall_enabled = false).
- 5 Đèn Lồng Lớn: phân bổ đối xứng tại bán kính 22m (L1 đến L5).
- Mỗi đèn cần 5 đom đóm để thắp sáng (lantern_cost = 5).
- Bán kính an toàn của đèn đã thắp: 4.5m (xua đuổi Bóng Mực).
- Mây mang tối đa 10 đom đóm, tốc độ di chuyển 6.0 m/s.
- Tỏa sáng (Pulse): tốn 1 đom đóm, bán kính 6.0m, hồi chiêu 1.0s, làm choáng Bóng Mực 3.0s và đẩy lùi 2.5m.
- Bóng Mực: tốc độ 3.2 m/s, bán kính chạm 1.0m. Khi chạm Mây mất 1 lửa (trong 3 ngọn lửa), rơi 50% đom đóm đang mang, bất tử tạm thời 1.5s.
- Thời gian Đêm 1: 300 giây.

## 2. Tính điểm
- Nhặt đom đóm: +10 điểm
- Thắp đèn: +100 điểm
- Choáng Bóng Mực: +25 điểm
- Thắng cuộc: +2 điểm/giây còn lại và +100 điểm/ngọn lửa còn lại.
