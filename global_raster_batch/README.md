# AppEEARS LC_Type1 toàn cầu cho bản vá hiện có

Giữ nguyên phân loại 1–10, 12, 14. Catalog hiện có điểm trong 544 ô 5° x 5°, nên công cụ chỉ yêu cầu các ô có điểm cháy, không gửi một polygon toàn thế giới. Tạo/tải theo lô 1–10 tác vụ; mặc định 3. AppEEARS có thể từ chối tác vụ do giới hạn dịch vụ, vì thế nên thử một ô trước. Không bảo đảm tải hết toàn cầu trong một lần chạy.

Giải nén thư mục `global_raster_batch` vào gốc `D:\NASA Hackathon`. Trong PowerShell **có `$session.token` hợp lệ**:

```powershell
cd 'D:\NASA Hackathon'
$env:APPEEARS_TOKEN = $session.token
$env:MCD12_YEAR = '2024'
Remove-Item Env:MCD12_LC_TYPE1_TIF -ErrorAction SilentlyContinue
python .\global_raster_batch\global_raster.py plan --limit 5
python .\global_raster_batch\global_raster.py submit --limit 1
```

Sau khi tác vụ chuyển sang `done`:

```powershell
python .\global_raster_batch\global_raster.py download --limit 1
python .\global_raster_batch\global_raster.py plan --limit 5
```

Nếu lượt thử đầu tải thành công, tiếp tục `submit --limit 3`, đợi tác vụ hoàn tất, rồi `download --limit 3`; lặp lại theo các đợt. Không chạy song song nhiều cửa sổ script vì file `tasks.json` lưu trạng thái; nếu token hết hạn, đăng nhập lại và đặt lại biến môi trường. Không ghi token vào file. Tác vụ `pending` chỉ được kiểm tra khi chạy `download` lần sau; script không chờ vô hạn. Nếu API trả lỗi, script dừng lô và ghi tác vụ thành công trước đó vào `tasks.json`.

GeoTIFF được lưu trong `data\landcover\global\<ô>\*LC_Type1*.tif`. Backend bản vá toàn cầu tự quét thư mục con. Sau khi thêm raster, khởi động lại server hoặc tải lại `/api/vegetation-fires` (cache tự làm mới theo mtime), xem `counts.outside` giảm. Những điểm ngoài vùng FIRMS live vẫn là dữ liệu toàn cầu đã lưu.

Lưu ý: 544 tác vụ có thể tốn thời gian, dung lượng và chịu quota AppEEARS. Script chỉ phục vụ catalog điểm hiện có và năm 2024, không tạo bộ phủ liên tục cho toàn bộ đất liền thế giới. Nếu cần bản đồ land cover hoàn chỉnh không phụ thuộc vị trí FIRMS, cần pipeline riêng từ granule MODIS/CMR.
