# Bản vá lưới chỉ số thử nghiệm FIRMS live

Áp trên bản project cũ đã chạy thành công `/api/live-prediction-input` và `/api/live-global-vegetation`. Giữ nguyên GeoTIFF LC_Type1, FIRMS_MAP_KEY và các file khác. Bản vá sửa hai file có sẵn, thêm một file backend, sửa hai file frontend. Không phụ thuộc `backend/fire_risk.py`; endpoint cũ `/api/fire-risk` vẫn tùy chọn.

## Windows PowerShell

```powershell
cd 'D:\NASA Hackathon'
Expand-Archive '.\NASA_Live_Experimental_Grid_Patch.zip' '.\_experimental_grid_patch' -Force
Copy-Item '.\backend\server.py' '.\backend\server.py.before_grid.bak' -Force
Copy-Item '.\frontend\src\App.tsx' '.\frontend\src\App.tsx.before_grid.bak' -Force
Copy-Item '.\frontend\src\components\MapViewer.tsx' '.\frontend\src\components\MapViewer.tsx.before_grid.bak' -Force
Copy-Item '.\_experimental_grid_patch\backend\*.py' '.\backend\' -Force
Copy-Item '.\_experimental_grid_patch\frontend\src\App.tsx' '.\frontend\src\App.tsx' -Force
Copy-Item '.\_experimental_grid_patch\frontend\src\components\MapViewer.tsx' '.\frontend\src\components\MapViewer.tsx' -Force
cd .\frontend
npm run build
cd ..
python .\backend\server.py
```

Đặt `FIRMS_MAP_KEY` trong **cửa sổ server** nếu chưa có. Không gửi key cho người khác. Mở `http://localhost:8000`, bấm **FIRMS live toàn cầu · thảm thực vật**, chọn điểm quan sát trong 6 giờ gần nhất, chọn 6/12/24h. Nếu backend có lỗi thời tiết TLS, raster trống, hoặc điểm quá cũ, sidebar hiện lý do thay vì vẽ ô giả.

Thử API bằng tọa độ một điểm live vừa chọn:

```powershell
$r = Invoke-RestMethod 'http://localhost:8000/api/live-experimental-grid?latitude=10.8&longitude=106.7' -TimeoutSec 180
$r | Select-Object mode, observed_at_utc, weather_first_hour, persistence_index, grid, model_status
$r.cells | Where-Object horizon_hours -eq 6 | Select-Object -First 5
```

Thay lat/lon bằng **tọa độ chính xác từ live snapshot**; ví dụ 10.8,106.7 chỉ minh họa và thường trả HTTP 400 nếu không có điểm FIRMS live tại đó.

## Ý nghĩa

- Lưới 11 × 11, tâm ở điểm FIRMS, ô xấp xỉ 1 km; tô các ô LC_Type1 thuộc thảm thực vật. Chưa có DEM, độ ẩm nhiên liệu thực hoặc dữ liệu chữa cháy. Ô không có raster/không phải thực vật không vẽ, không coi là an toàn.
- Mỗi giờ cập nhật điểm lan tương đối theo hướng **gió thổi tới** (hướng khí tượng +180°), tốc độ gió, RH, mưa, khoảng cách và các ô thực vật có đường nối. Nhiệt độ được trả trong dữ liệu đầu vào nhưng chưa tham gia công thức; FRP được dùng để chọn điểm live, chưa suy ra lượng nhiên liệu còn lại. Hệ số là heuristic, chưa học từ nhãn.
- `persistence_index` là chỉ số điều kiện duy trì theo thời tiết 6/12/24h, **không** phải thời gian còn cháy hoặc xác suất còn cháy. `remaining_burn_hours=null`. Mốc dự báo tính từ giờ đầu của Open-Meteo, không phải lúc bắt đầu cháy.
- `model_status=xgboost_not_validated_not_used`; không gọi endpoint này là mô hình AI đã kiểm định. Không dùng làm ranh giới an toàn hay quyết định ứng cứu.
- Chỉ chấp nhận điểm FIRMS có thời điểm phát hiện <=6h, snapshot không báo lỗi làm mới và forecast bắt đầu gần giờ hiện tại; nguồn FIRMS làm mới 15 phút. Có thể thử lại nếu Open-Meteo timeout; không dùng kết quả cũ như mới.

## Kiểm thử đã thực hiện

Mock lưới đủ 121 ô với gió từ Tây: điểm ô Đông cao hơn ô Tây; ô không phải thực vật bị loại. Python compileall và Vite build chạy thành công. Chưa thử trực tiếp API bằng key hoặc raster riêng của người dùng, nên sau khi áp cần kiểm tra một điểm live thực tế.
