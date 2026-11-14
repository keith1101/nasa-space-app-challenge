# Bản vá riêng cho bước (1): đặc tả và tạo nhãn quan sát

Đặt ZIP vào `D:\NASA Hackathon`, giải nén, chỉ chép một file script vào project cũ:

```powershell
cd 'D:\NASA Hackathon'
Expand-Archive '.\NASA_Fire_Label_Spec_Patch.zip' '.\_label_spec' -Force
Copy-Item '.\_label_spec\backend\build_fire_event_labels.py' '.\backend\' -Force
python .\backend\build_fire_event_labels.py
Get-Content '.\data\training\pilot\processed\label_manifest.json'
Import-Csv '.\data\training\pilot\processed\events.csv' | Select-Object -First 3 | Format-List
```

Đọc `LABEL_SPEC.md` trong ZIP trước khi sử dụng nhãn. Không thay server/frontend đang chạy; không yêu cầu hoàn thành raster MODIS. Chạy từ gốc project có ba CSV trong `data/training/pilot` tải từ chat trước. Dự kiến 81 phát hiện trước khử trùng lặp; số event/positive chưa biết cho đến khi chạy trên dữ liệu thật. Nếu tổng detection khác 81, kiểm tra file CSV.
