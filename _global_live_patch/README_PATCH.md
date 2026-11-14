# Patch: FIRMS live toàn cầu + kho raster trên backend chung

Áp trên project cũ đã có bản vá vegetation/precomputed. Chỉ chép các file trong ZIP đè lên đường dẫn tương ứng ở gốc project; không thay toàn project.

## Backend chung

- Cài Python dependencies `python -m pip install -r requirements.txt` (gồm rasterio).
- Đặt `FIRMS_MAP_KEY` **trên server**, tuyệt đối không ghi vào frontend hay git.
- Đặt `MCD12_YEAR=2024` đúng năm raster.
- Gắn kho GeoTIFF `MCD12Q1.061 *LC_Type1*.tif[f]` của cùng năm vào `data/landcover/` trên server (có thể theo thư mục con). Không đặt `MCD12_LC_TYPE1_TIF` nếu dùng nhiều file. Kho phải bao phủ các điểm live toàn cầu cần gán nhãn; điểm nằm ngoài raster được đếm `outside` và không hiện.
- Chạy `python backend/server.py` sau reverse proxy HTTPS. Cần host có đủ RAM, CPU, dung lượng và thời gian xử lý; lần đầu quét global có thể chậm. Nếu hosting đặt timeout proxy ngắn, tăng timeout phù hợp. Một server chung phục vụ nhiều frontend; người dùng cuối không tải raster. Người tự host backend vẫn cần kho raster hoặc mount chung.

Kiểm tra `https://YOUR_BACKEND_HOST/api/live-global-vegetation`: phản hồi `mode: live_global`, `fetched_at`, `last_error`, `counts`, `raster_files_count`, `points`. Nếu `outside > 0`, dữ liệu phủ đất chưa đủ, không khẳng định những điểm đó là phi thực vật. Nếu FIRMS lỗi sau lần thành công, endpoint giữ snapshot cũ và có `last_error`; xem `fetched_at` để biết độ mới.

Nguồn FIRMS: MODIS_NRT, VIIRS_NOAA20_NRT, VIIRS_NOAA21_NRT, `world/1`, làm mới tối đa 15 phút/lần. Đây là detections thô có nhãn phủ đất, không phải cụm harmonized. Bộ lọc giữ mã 1–10, 12, 14. VIIRS confidence l/n/h ánh xạ 50/80/95 để tương thích slider hiện có; đây là mức hiển thị, không phải xác suất hiệu chuẩn.

## Frontend

Trong `frontend/dist/backend-config.js` (hoặc `frontend/public/backend-config.js` rồi build lại), đặt URL công khai của backend:

```js
window.__NASA_API_BASE__ = 'https://YOUR_BACKEND_HOST';
```

Giữ chuỗi rỗng nếu frontend được chính backend phục vụ cùng origin. Frontend dùng URL này cho các API FIRMS; dữ liệu snapshot và bản đồ nền vẫn lấy từ frontend local. Nếu frontend chạy ở origin khác, backend phải mở HTTPS/CORS phù hợp; cấu hình triển khai phải bảo vệ server và key. Chọn nút **FIRMS live toàn cầu · thảm thực vật**. Nếu chưa có backend chung thực sự, không thể chỉ clone rồi nhận live global. Không đưa file raster vào repo; cấu hình backend URL công khai cho frontend được phát hành.

## Windows PowerShell local test

```powershell
cd 'D:\NASA Hackathon'
python -m pip install -r .\requirements.txt
$env:MCD12_YEAR = '2024'
Remove-Item Env:MCD12_LC_TYPE1_TIF -ErrorAction SilentlyContinue
# FIRMS_MAP_KEY phải được thiết lập sẵn trong tiến trình server.
python .\backend\server.py
```

Ở terminal khác `Invoke-RestMethod http://localhost:8000/api/live-global-vegetation | Select-Object mode,fetched_at,last_error,counts,raster_files_count`. Kiểm tra `outside` trước khi giới thiệu là bản đồ phủ toàn cầu hoàn chỉnh.

## Kiểm thử đã thực hiện

Frontend Vite build OK; Python compile OK; phản hồi CSV FIRMS giả lập cho ba nguồn và raster giả lập cho điểm live; chưa kiểm thử thật với kho GeoTIFF toàn cầu hay backend đã triển khai, vì tài khoản, raster và host của bạn không có trong workspace.
