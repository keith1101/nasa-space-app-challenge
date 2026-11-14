# Bản vá bản đồ điểm cháy trên thảm thực vật

Đây là bản vá áp vào project `D:\NASA Hackathon` đang chạy, không phải project mới.

## Dữ liệu cần có

Dùng AppEEARS tải **MCD12Q1.061 / LC_Type1** dưới dạng GeoTIFF, chọn vùng bao trùm toàn bộ khu vực FIRMS cần hiển thị. Tác vụ thử trước đây chỉ có bbox 106.65–106.75 E, 10.75–10.85 N: nó **không** bao phủ toàn Việt Nam. GeoTIFF năm 2024 là nhãn phủ đất theo năm, không phải dữ liệu thực vật thời gian thực. Chỉ dùng lớp LC_Type1, không dùng NDVI hay ảnh màu để giả làm nhãn.

Trong thư mục gốc của project, ở PowerShell:

```powershell
New-Item -ItemType Directory -Force .\data\landcover | Out-Null
Copy-Item 'C:\duong-dan\MCD12Q1.061_LC_Type1.tif' .\data\landcover\
python -m pip install -r .\requirements.txt
$env:MCD12_YEAR='2024'
python .\backend\server.py
```

Nếu Python đang chạy bằng Conda/venv, dùng đúng `python` của môi trường đó; không cần `py -3.12`. Nếu có nhiều GeoTIFF, đặt `$env:MCD12_LC_TYPE1_TIF='D:\NASA Hackathon\data\landcover\ten-file.tif'` trước khi chạy server. Khởi động lại server sau khi thêm file.

## Áp bản vá

Giải nén ZIP bản vá rồi chạy từ thư mục gốc project (đổi đường dẫn ZIP theo chỗ tải về):

```powershell
Expand-Archive '.\NASA_Vegetation_Map_Patch.zip' '.\_vegetation_patch' -Force
Copy-Item '.\_vegetation_patch\backend\landcover.py' '.\backend\' -Force
Copy-Item '.\_vegetation_patch\backend\server.py' '.\backend\' -Force
Copy-Item '.\_vegetation_patch\requirements.txt' '.\' -Force
Copy-Item '.\_vegetation_patch\frontend\src\App.tsx' '.\frontend\src\' -Force
Copy-Item '.\_vegetation_patch\frontend\dist\index.html' '.\frontend\dist\' -Force
Copy-Item '.\_vegetation_patch\frontend\dist\assets\*' '.\frontend\dist\assets\' -Force
```

Tốt nhất sao lưu các file cùng tên trước khi chép đè nếu bạn có chỉnh sửa riêng kể từ bản project đã cung cấp. Chọn **Cháy trên thảm thực vật** trong bộ lọc bản đồ. API kiểm tra: `http://localhost:8000/api/vegetation-fires`.

Giữ lớp IGBP 1–10, 12, 14 (rừng, bụi cây, savanna, cỏ, đất trồng, khảm đất trồng và thực vật). Loại lớp 11 (đất ngập nước có nước mặt), 13 (đô thị), 15–17 (băng tuyết, đất trống, nước). Điểm ngoài GeoTIFF hoặc pixel không có nhãn được đếm riêng và không hiển thị. Số trên bản đồ vẫn chịu ngưỡng confidence mặc định 80%, nên có thể ít hơn số điểm thảm thực vật trả về từ API. Cần FIRMS ở chế độ `live`; chế độ local sẽ báo 503.

Giới hạn: đây là phép gán nhãn từ pixel phủ đất 500 m, không xác nhận trực tiếp hiện trường và không khẳng định nguyên nhân cháy. Khu công nghiệp thuộc nhóm built-up 13 chỉ khi raster phân loại đúng pixel đó. Chưa kiểm thử với GeoTIFF thực của bạn vì chưa có file này.
