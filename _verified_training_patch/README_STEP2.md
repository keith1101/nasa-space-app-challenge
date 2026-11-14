# Bước 2 — nhãn kiểm chứng và kiểm định mô hình nền

Áp **bản vá nhỏ** vào project cũ, sau bước 1 và `build_fire_event_labels.py`. Không thay thế server/frontend hoặc bật dự đoán live. Các CSV mẫu chỉ có tiêu đề, tuyệt đối không điền nhãn suy đoán.

## Lắp đặt / chạy thử trên Windows PowerShell

```powershell
cd 'D:\NASA Hackathon'
Expand-Archive '.\NASA_Verified_Prediction_Training_Patch.zip' '.\_verified_training_patch' -Force
Copy-Item '.\_verified_training_patch\backend\*.py' '.\backend\' -Force
New-Item -ItemType Directory -Force '.\data\training\verified' | Out-Null
Copy-Item '.\_verified_training_patch\data\training\verified\*.csv' '.\data\training\verified\' -ErrorAction Stop
python .\backend\prepare_verified_training.py
Get-Content '.\data\training\verified\processed\manifest.json'
```

Script chuẩn bị vẫn chạy và tạo manifest dù chưa có hồ sơ xác minh. `training_ready=false`, không được xuất mô hình từ pilot hiện nay. **Đừng chạy lệnh Copy-Item ghi đè các CSV đã điền về sau.**

Khi đã thu thập, xác minh và điền đủ CSV, chạy lại `prepare_verified_training.py`. Chỉ khi manifest `training_ready=true`:

```powershell
python -m pip install numpy scikit-learn xgboost
python .\backend\train_verified_baselines.py
Get-Content '.\data\training\verified\processed\baseline_report.json'
```

## Các tệp phải bổ sung

| File | Quy tắc và nguồn độc lập cần thiết |
|---|---|
| `event_links.csv` | Nối `pilot-xxxxx` trong processed/detections.csv với ID sự kiện đã kiểm tra; `reviewed=1`, `source` ghi hồ sơ gốc. Không tự coi nhóm khoảng cách là sự kiện thật. |
| `incident_outcomes.csv` | `extinction_time_utc` từ hồ sơ kết thúc được xác minh (không dùng lần phát hiện FIRMS cuối), `source`. |
| `perimeter_cells.csv` | Ảnh chụp ranh giới/độ phủ đã thẩm định, raster hóa về cùng lưới 0.02° của script pilot. Mỗi ô có `burned=0/1`; chỉ đặt `coverage_verified=1` khi vùng được quan sát đủ để xác nhận cả 0 lẫn 1. Dữ liệu cần trước t và quanh t+6/12/24h. Đây là một **hợp đồng nhập liệu**, chưa có bộ chu vi toàn cầu tự động trong bản vá. |
| `weather_asof.csv` | Thời tiết theo tọa độ, `valid_at_utc` và **thời điểm sản phẩm thực sự sẵn dùng** `available_at_utc`. Chỉ chọn `available_at <= t`, `valid_at <= t` trong 3h; không lấy JSON NASA POWER hồi cứu và tự gán thời điểm phát hành. |
| `landcover_asof.csv` | Mã LC_Type1, năm raster và thời điểm raster được phát hành/khả dụng. Chỉ dùng lớp phủ đã sẵn có tại t. Raster MCD12Q1 năm 2024 không mặc nhiên là feature cho tháng 1/2024. |

Tất cả thời gian theo ISO 8601 UTC (ví dụ `2024-01-01T00:00:00Z`). Tạo các CSV thật bằng GIS/incident records của cùng khu vực và giai đoạn; không thể sinh hai nhãn xác minh chỉ từ FIRMS + MODIS LC_Type1 + POWER. Không đưa `FIRMS_MAP_KEY`/token vào CSV.

## Chính sách nhãn

- `duration.csv`: chỉ tạo cho sự kiện có thời điểm kết thúc xác minh sau t; sự kiện chưa kết thúc/không biết kết thúc tiếp tục là censored và **không** được điền nhãn 0. Mô hình XGBoost regressor hiện chỉ đánh giá tập resolved, chưa xử lý censoring nên chưa thích hợp để dự báo live toàn cầu.
- `spread.csv`: ô đích phải xác nhận chưa cháy tại t và có quan sát phủ. Nhãn 1 nếu ô đã cháy được quan sát không muộn hơn t+h (trong cửa sổ 2h trước đó); nhãn 0 nếu vẫn chưa cháy ở t+h hoặc trong 2h sau đó. Các ô không đủ độ phủ giữ unknown. Điều này giả định dữ liệu là **ranh giới đã cháy tích lũy**, không phải ngọn lửa tức thời.
- `training_ready` là cổng tối thiểu mang tính chính sách thử nghiệm (>=30 sự kiện độc lập cho mỗi tác vụ, cả 0 và 1). Đây không phải chứng nhận chất lượng hay an toàn. Script huấn luyện tách sự kiện theo thời gian, không chia ngẫu nhiên các dòng cùng một sự kiện; báo baseline median/constant so với XGBoost, không xuất model để phục vụ API. XGBoost là machine learning, không phải deep learning.
- LLM có thể viết lời giải thích dựa trên kết quả đã kiểm định; không được tạo nhãn hoặc thay thế kiểm định.

## Tại sao chưa thể lấy nhãn chu vi 6h từ NASA API hiện tại?

FIRMS là điểm nóng và có thể bỏ sót do mây/lượt bay; điểm cuối không xác minh được tắt cháy. MCD64A1 đưa ngày cháy ở độ phân giải theo **ngày** (500m) trên sản phẩm tổng hợp **tháng**; không cung cấp chân trị lan tới ô lân cận trong 6 giờ hay thời điểm tắt lửa. Cần dữ liệu sự kiện/chu vi được khảo sát theo giờ đúng khu vực và kiểm tra độ phủ, hoặc thay đổi mục tiêu sang dự báo ngày với nhãn burn date phù hợp.
