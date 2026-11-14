# Nhãn quan sát cho hai bài toán dự báo từ FIRMS live

## Phạm vi và các định nghĩa

Input pilot: ba CSV `VIIRS_NOAA20_SP_*_5d.csv` trong `data/training/pilot`, UTC. Script không dùng thời tiết để tạo nhãn nhằm tránh đưa thông tin tương lai vào đáp án. Kết quả này là nhãn quan sát thử nghiệm, chưa phải nhãn vật lý cho thời điểm tắt lửa hoặc ranh giới cháy lan.

**Sự kiện ứng viên**: hai phát hiện cùng sensor được nối nếu cách nhau tối đa 2 km và 36 giờ; lấy thành phần liên thông, gán ID ổn định theo thời điểm đầu. Các đám cháy gần nhau có thể bị gộp, nhiều đám độc lập có thể bị tách; `event_status=provisional_satellite_component`. Cần kiểm chứng bằng incident/perimeter data trước khi coi là sự kiện thật.

**Bài toán 1 (thời gian)**: `first_seen_utc`, `last_seen_utc`, và `observed_span_lower_bound_h` là khoảng quan sát tối thiểu. `ignition_time_utc`, `extinction_time_utc` để rỗng, `left_censored=1`, `right_censored=1`. Không suy ra giờ còn cháy từ lần phát hiện cuối. Nhãn sống sót 6/12/24h cần nối sự kiện đáng tin cậy với dữ liệu kết thúc cháy/ranh giới và độ phủ vệ tinh; censoring phải được giữ trong survival learning.

**Bài toán 2 (lan sang ô)**: lưới 0.02° trên WGS84, mỗi điểm gốc và mốc 6/12/24h; chỉ ghi một hàng dương khi có phát hiện FIRMS sau đó trong ô liền kề cùng sự kiện ứng viên. `observed_detection_label=1`, `is_physical_spread_confirmed=0`. Có thể là đám cháy độc lập; cần đối chiếu ranh giới cháy theo thời gian. Không tạo hàng âm khi không có detection, vì mây/lượt bay/sensor coverage chưa được đo.

## File xuất

- `events.csv`: sự kiện ứng viên, span và cờ censoring.
- `detections.csv`: phát hiện, UTC, event ID, ô lưới.
- `observed_neighbor_positives.csv`: tín hiệu dương 6/12/24h theo ô.
- `label_manifest.json`: số lượng, quy tắc, trạng thái `training_ready=false`.

## Chất lượng cần đạt trước khi đào tạo/đưa live

1. Xác minh cùng sự kiện bằng ranh giới sự kiện, không chỉ khoảng cách; tách train/test theo event và theo khu vực/thời gian.
2. Lấy dữ liệu độ phủ quan sát hoặc burn/perimeter để có nhãn âm hợp lệ cho ô mục tiêu. Khi vùng không quan sát được, gán unknown.
3. Có thời điểm cháy kết thúc hoặc khoảng censoring được xác thực; ước lượng survival và đánh giá trên sự kiện chưa thấy.
4. Dùng bản dự báo thời tiết được phát hành tại thời điểm t, nhiên liệu thực, độ dốc; kiểm thử calibration, Brier score/survival metrics, PR-AUC và sai số/IoU perimeter theo horizon.
5. Nếu thiếu dữ liệu, API live trả `insufficient_evidence` và không in số giờ hay màu bản đồ như dự báo chắc chắn.

`LC_Type1` là phủ đất hằng năm, không phải bản đồ nhiên liệu hoặc độ ẩm nhiên liệu. Tác vụ raster tiếp tục độc lập.
