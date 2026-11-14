# Nhãn lưu sẵn + FIRMS live

Áp trên bản vá NASA_Global_Vegetation_Patch.zip (không phải project mới). Chép `backend/*.py` vào `backend/`, `frontend/src/App.tsx` vào `frontend/src/`, `frontend/dist/index.html` và `frontend/dist/assets/*` vào thư mục tương ứng, ghi đè. Tiếp tục dùng `rasterio` từ requirements của bản trước.

## Tạo nhãn catalog toàn cầu một lần

Giữ GeoTIFF cùng năm, MCD12Q1.061 LC_Type1 dưới `data/landcover` (có thể chia thư mục con). Trong PowerShell tại gốc project:

```powershell
$env:MCD12_YEAR = '2024'
Remove-Item Env:MCD12_LC_TYPE1_TIF -ErrorAction SilentlyContinue
python .\backend\export_saved_labels.py
```

Lệnh mặc định chỉ xuất khi **tất cả** 87.311 điểm catalog có nhãn hợp lệ. Nếu mới tải một phần raster, dùng `python .\backend\export_saved_labels.py --allow-partial`; các điểm còn thiếu vẫn không hiện trong chế độ thực vật. File được tạo: `data/landcover/saved_catalog_labels.json`. Chỉ cần đưa file JSON này vào repo/gói phát hành; người clone không cần raster toàn cầu để xem các điểm snapshot đã gán nhãn. Nếu catalog `fires_global_harmonized.json` thay đổi, phải tạo lại nhãn; backend kiểm tra SHA256 và từ chối nhãn không khớp.

## Điểm FIRMS live

Backend vẫn gán nhãn điểm mới bằng GeoTIFF trong `data/landcover` lúc FIRMS cập nhật. Chỉ giữ raster cho **phạm vi live** trên server, hoặc cung cấp dịch vụ tra cứu phủ đất khác trước khi bỏ raster. Hiện phạm vi FIRMS live của project là vùng Việt Nam; các vùng ngoài phạm vi đó là catalog toàn cầu đã lưu. Người dùng app kết nối server không cần tải raster; người tự host live backend cần raster của vùng live. Đặt `MCD12_YEAR` bằng năm nhãn đã xuất khi khởi động server.

```powershell
python .\backend\server.py
```

API `/api/vegetation-fires` cho biết `saved_labels`, `raster_files`, `counts`, `regions`, `data_mode`. Không khẳng định `live` toàn thế giới. Quy tắc lớp giữ nguyên 1–10, 12, 14.
