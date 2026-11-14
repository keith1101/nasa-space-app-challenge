# Bản vá bổ sung: lọc thảm thực vật toàn cầu

Áp lên project cũ `D:\NASA Hackathon`, thay các file cùng tên của bản vá trước. Chưa tải raster toàn cầu: bản vá chỉ phân loại ở nơi có GeoTIFF MCD12Q1.061 LC_Type1.

## Cài vào project (PowerShell tại D:\NASA Hackathon)

```powershell
Expand-Archive '.\NASA_Global_Vegetation_Patch.zip' '.\_global_patch' -Force
Copy-Item '.\_global_patch\backend\*.py' '.\backend\' -Force
Copy-Item '.\_global_patch\requirements.txt' '.\' -Force
Copy-Item '.\_global_patch\frontend\src\App.tsx' '.\frontend\src\' -Force
Copy-Item '.\_global_patch\frontend\dist\index.html' '.\frontend\dist\' -Force
Copy-Item '.\_global_patch\frontend\dist\assets\*' '.\frontend\dist\assets\' -Force
python -m pip install rasterio
```

Đặt nhiều GeoTIFF `*LC_Type1*.tif` ở `data\landcover` (có thể chia thư mục con theo châu lục); chỉ chọn cùng một năm và cùng sản phẩm/lớp LC_Type1. Không đặt `MCD12_LC_TYPE1_TIF` nếu muốn quét nhiều file, vì biến này chỉ chọn một file. Đặt `$env:MCD12_YEAR='2024'` trước khi khởi động server; năm là nhãn người dùng khai báo, không được suy ra từ raster. Khởi động lại `python .\backend\server.py` sau khi thêm file. Xem `http://localhost:8000/api/vegetation-fires` để thấy `regions`, `raster_files`, `counts`.

`regions` phân theo châu lục trong catalog và riêng `Vietnam live window`; `Unassigned` là điểm catalog không có ID quốc gia, không tự khẳng định thuộc châu lục nào. `source: live` chỉ cho vùng Việt Nam khi FIRMS live; các vùng khác là `saved`. Điểm ngoài raster và pixel NoData không xuất hiện trên map nhưng vẫn được đếm. Nếu không có file raster, điểm hiển thị là 0, `outside = total`; bản đồ không giả tạo nhãn. Lớp thực vật: IGBP 1–10, 12, 14; loại đất ngập nước 11, đô thị 13, tuyết 15, barren 16 và nước 17.

Tải AppEEARS theo vùng phù hợp (từng châu lục / khối địa lý, nên ưu tiên nơi có điểm FIRMS), cùng năm và lớp LC_Type1. Không cần một request hình chữ nhật toàn thế giới. Bản vá chưa tự tải AppEEARS; dữ liệu raster cần đặt thủ công. Dữ liệu toàn cầu ngoài vùng FIRMS live vẫn là snapshot trong project, không phải thời gian thực.
