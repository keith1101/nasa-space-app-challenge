# NASA Hackathon — cài đặt và kết nối dữ liệu trên Windows

Hướng dẫn này áp dụng cho thư mục project `NASA Hackathon` đã có `backend/`, `frontend/dist/`, `data/` và bản vá FIRMS. Dùng **PowerShell 7**. Các lệnh bên dưới chạy từ thư mục `D:\NASA Hackathon`. Không gửi hoặc ghi khóa, mật khẩu và token vào project.

## 1. Giải nén và kiểm tra Python

Giải nén project vào `D:\NASA Hackathon`. Cài Python 3.12 từ python.org nếu `python --version` chưa hoạt động. Máy có Conda và dấu `(base)` có thể dùng trực tiếp lệnh `python`; không cần lệnh `py`.

```powershell
cd 'D:\NASA Hackathon'
python --version
Test-Path .\backend\server.py
Test-Path .\backend\firms_live.py
Test-Path .\frontend\dist\index.html
```

Ba dòng `Test-Path` cần trả về `True`. Nếu `firms_live.py` chưa có, chép bản vá FIRMS đã dùng vào đúng thư mục project trước khi chạy tiếp.

Bản giao diện đã build trong `frontend/dist` nên chạy app không cần Node.js. Chỉ khi muốn sửa mã React, cài Node.js LTS và chạy `npm.cmd ci`, `npm.cmd run build` tại `frontend`.

## 2. Kết nối FIRMS và chạy app

Mở PowerShell trong thư mục project. Nhập FIRMS Map Key khi được hỏi; lệnh không hiển thị hoặc ghi khóa vào file.

```powershell
cd 'D:\NASA Hackathon'
$env:FIRMS_MAP_KEY = Read-Host 'Nhap FIRMS Map Key'
python .\backend\server.py
```

Giữ cửa sổ server mở. Trên trình duyệt mở `http://localhost:8000` và `http://localhost:8000/api/data-status`. `mode: live` và `key_configured: true` xác nhận backend đã tải FIRMS. Nếu `mode: local`, xem `last_error`, kiểm tra kết nối mạng và chạy lại server. Biến môi trường ở trên chỉ tồn tại trong cửa sổ PowerShell đó. Dừng server bằng `Ctrl+C`.

FIRMS hiện lấy MODIS, VIIRS NOAA-20 và NOAA-21 trong vùng 102.1–109.8°E, 8.2–23.5°N cho 5 ngày gần nhất. App kiểm tra cập nhật mỗi 15 phút. Dữ liệu ngoài vùng và lịch sử của dashboard vẫn lấy từ file đi kèm.

## 3. Kiểm tra dự báo ECMWF IFS

Mở **PowerShell thứ hai**. Lệnh thử một điểm mẫu gần Thành phố Hồ Chí Minh, nhận 48 giờ theo UTC.

```powershell
cd 'D:\NASA Hackathon'
$forecastUrl = 'https://api.open-meteo.com/v1/ecmwf?latitude=10.8&longitude=106.7&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation&models=ecmwf_ifs&forecast_hours=48&timezone=UTC'
$forecast = Invoke-RestMethod -Uri $forecastUrl -TimeoutSec 180
$forecast.hourly.PSObject.Properties.Name
$forecast.hourly.time.Count
```

Kết quả cần có `time`, năm biến khí tượng và `48` mốc giờ. Đây là kiểm tra kết nối API, chưa tích hợp dự báo vào giao diện hoặc huấn luyện mô hình. Nếu timeout, thử yêu cầu nhỏ:

```powershell
$testUrl = 'https://api.open-meteo.com/v1/ecmwf?latitude=10.8&longitude=106.7&hourly=temperature_2m&models=ecmwf_ifs&forecast_hours=6&timezone=UTC'
curl.exe -L --connect-timeout 15 --max-time 120 -o NUL -w "HTTP %{http_code}, connect %{time_connect}s, total %{time_total}s`n" "$testUrl"
```

ECMWF qua Open-Meteo không dùng NASA API key. Dữ liệu thời tiết lịch sử từ POWER là nguồn riêng và đã được kiểm tra trước đó.

## 4. Kiểm tra lớp rừng MCD12Q1 qua AppEEARS

Dùng tài khoản **NASA Earthdata Login** để tạo task AppEEARS. FIRMS Map Key và NASA Open API key không thay thế tài khoản này. Trong cùng PowerShell thứ hai:

```powershell
$api = 'https://appeears.earthdatacloud.nasa.gov/api'
$landCover = Invoke-RestMethod -Uri "$api/product/MCD12Q1.061" -TimeoutSec 60
$landCover.PSObject.Properties.Name | Where-Object { $_ -eq 'LC_Type1' }
```

Kết quả cần là `LC_Type1`. Xác thực qua hộp thoại trên máy:

```powershell
$credential = Get-Credential
$session = Invoke-RestMethod -Uri "$api/login" -Method Post -Authentication Basic -Credential $credential -ContentType 'application/x-www-form-urlencoded' -Body 'grant_type=client_credentials' -TimeoutSec 60
if ($session.token) { 'AppEEARS: connected' }
$headers = @{ Authorization = "Bearer $($session.token)" }
```

Không in `$session` hoặc `$headers` ra màn hình và không gửi chúng qua chat. Token sẽ hết hạn; đăng nhập lại khi API trả lỗi xác thực.

## 5. Gửi yêu cầu raster mẫu

Mẫu dưới đây lấy một ô nhỏ gần 10.8°N, 106.7°E cho năm 2024. Nó **không bao phủ toàn bộ vùng FIRMS**. Chạy tại PowerShell đang có `$api` và `$headers`:

```powershell
$geoJson = @'
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "properties": {},
    "geometry": {
      "type": "Polygon",
      "coordinates": [[
        [106.65, 10.75], [106.75, 10.75],
        [106.75, 10.85], [106.65, 10.85],
        [106.65, 10.75]
      ]]
    }
  }]
}
'@
$geo = $geoJson | ConvertFrom-Json -AsHashtable
$task = @{
  task_name = 'fire-land-cover-sample'
  task_type = 'area'
  params = @{
    dates = @(@{ startDate = '01-01-2024'; endDate = '12-31-2024' })
    layers = @(@{ product = 'MCD12Q1.061'; layer = 'LC_Type1' })
    output = @{ projection = 'geographic'; format = @{ type = 'geotiff' } }
    geo = $geo
  }
}
$created = Invoke-RestMethod -Uri "$api/task" -Method Post -Headers $headers -ContentType 'application/json' -Body ($task | ConvertTo-Json -Depth 20) -TimeoutSec 60
$created | Select-Object task_id, status
```

AppEEARS nhận task và có thể trả `pending`. Lưu `task_id` từ phản hồi. Nếu đã gửi task trước đó, không gửi lại; dùng ID cũ để kiểm tra:

```powershell
$taskId = 'DAN_TASK_ID_CUA_BAN_VAO_DAY'
$status = Invoke-RestMethod -Uri "$api/task/$taskId" -Headers $headers -TimeoutSec 60
$status | Select-Object task_id, status
```

Thay `$taskId` bằng ID của task mình nếu khác. Khi trạng thái là `done`, xem bundle và tải GeoTIFF:

```powershell
$bundle = Invoke-RestMethod -Uri "$api/bundle/$taskId" -Headers $headers -TimeoutSec 60
$bundle.files | Select-Object file_id, file_name
New-Item -ItemType Directory -Force '.\data\landcover' | Out-Null
foreach ($file in $bundle.files | Where-Object { $_.file_name -match '\.tif$' }) {
  $destination = Join-Path '.\data\landcover' ([IO.Path]::GetFileName($file.file_name))
  Invoke-WebRequest -Uri "$api/bundle/$taskId/$($file.file_id)" -Headers $headers -OutFile $destination -TimeoutSec 180
  Get-Item $destination | Select-Object Name, Length
}
```

`MCD12Q1.061/LC_Type1` là phân loại thảm phủ hằng năm, độ phân giải 500 m. Mã IGBP 1–5 chỉ loại rừng tại ô raster. Task mẫu năm 2024 chỉ kiểm tra đường tải. Muốn gán nhãn mọi điểm FIRMS năm 2026 phải trích xuất vùng và năm tương ứng, kiểm tra năm mới nhất thực sự được AppEEARS cung cấp, rồi nối raster với tọa độ FIRMS.

## 6. Trạng thái project tại bước này

- Dashboard hiện đã chạy và FIRMS đã xác nhận `mode: live` trên máy người dùng.
- API ECMWF IFS đã trả đủ năm biến, 48 mốc giờ trong lần kiểm tra trước.
- AppEEARS đã nhận task mẫu `2219b117-944b-434b-8e67-85f68541c2de`, còn `pending` tại lần kiểm tra cuối.
- Project chưa có mô hình XGBoost/SVM đã huấn luyện cho thời gian cháy hoặc vùng lan. Hai API mới hiện được **kiểm tra độc lập**, chưa nối vào pipeline dự báo trong app.

Để huấn luyện, cần FIRMS lịch sử nhiều vụ và nhãn diễn biến sau từng thời điểm quan sát. Vệ tinh không đo liên tục thời điểm lửa tắt; mô hình đầu tiên nên dự báo xác suất còn được phát hiện sau 24/48 giờ và xác suất ô lân cận xuất hiện cháy. Kiểm tra trên các vụ cháy tách khỏi tập huấn luyện trước khi hiển thị kết quả như dự báo.
