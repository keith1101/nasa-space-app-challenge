# Bản vá đầu vào dự đoán từ FIRMS live

Áp lên `D:\NASA Hackathon` đã có `/api/live-global-vegetation` và bản vá label pilot. Không cần chạy lại bộ nhãn. Thay 2 file backend hiện hữu và thêm 1 file. Không cài thêm package ngoài các dependency hiện có của backend (rasterio cho đọc GeoTIFF).

```powershell
cd 'D:\NASA Hackathon'
Expand-Archive '.\NASA_Live_Prediction_Input_Patch.zip' '.\_live_input_patch' -Force
Copy-Item '.\backend\global_live.py' '.\backend\global_live.py.bak' -Force
Copy-Item '.\backend\server.py' '.\backend\server.py.bak' -Force
Copy-Item '.\_live_input_patch\backend\*.py' '.\backend\' -Force
# Dừng và chạy lại backend đang dùng, ví dụ:
python .\backend\server.py
```

Ở một cửa sổ PowerShell khác:

```powershell
cd 'D:\NASA Hackathon'
$live = Invoke-RestMethod 'http://localhost:8000/api/live-global-vegetation' -TimeoutSec 300
$point = $live.points | Select-Object -First 1
$lat = $point[0]
$lon = $point[1]
$inputUrl = "http://localhost:8000/api/live-prediction-input?latitude=$lat&longitude=$lon"
$result = Invoke-RestMethod $inputUrl -TimeoutSec 180
$result | Select-Object mode, snapshot_fetched_at_utc, hotspot, land_cover, prediction
$result.forecast.hourly | Select-Object -First 3
```

Endpoint `/api/live-prediction-input` chấp nhận đúng tọa độ của FIRMS snapshot đang lưu; `mode=live_inputs_only`. Nếu nguồn FIRMS gặp lỗi nhưng snapshot cũ vẫn còn, `snapshot_last_error` và `hotspot.age_hours` cho biết độ trễ. `land_cover.status=coverage_unknown` nếu raster chưa phủ điểm đó. Dự báo trả theo giờ, truy vấn tại tọa độ live, và không chứng minh quan sát cháy sau thời điểm hiện tại. `prediction` chứa null với `training_not_ready`: bộ nhãn pilot hiện chưa có thời điểm tắt lửa, chu vi cháy và nhãn âm được quan sát. Chưa dùng endpoint `/api/fire-risk` làm dự đoán thời gian hoặc xác suất lan.
