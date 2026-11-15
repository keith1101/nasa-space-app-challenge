# Walkthrough: Modernized Multi-Route NASA FIRMS Platform

> [!NOTE]
> Hệ thống frontend đã được nâng cấp toàn diện từ kiến trúc trang đơn nguyên khối (single-page monolithic dashboard) thành nền tảng viễn thám hiện đại chuẩn công nghiệp với **3 routes độc lập**, kết xuất đồ họa tăng tốc bằng GPU (**Deck.gl v9 + MapLibre GL JS WebGL2**), trực quan hóa dữ liệu lớn bằng **Apache ECharts**, và quản lý dữ liệu hiệu năng cao bằng **Zustand + TanStack Query**.

---

## 1. Trực Quan Hóa 3 Tuyến Đường (Visual Progression)

````carousel
![Trang Chủ - Landing Page](/C:/Users/LENOVO/.gemini/antigravity/brain/a3d0f900-e776-406e-82a5-321d41b32c85/landing_preview.png)
<!-- slide -->
![Tài Liệu Khoa Học & Phương Pháp Luận](/C:/Users/LENOVO/.gemini/antigravity/brain/a3d0f900-e776-406e-82a5-321d41b32c85/methodology_preview.png)
<!-- slide -->
![Trạm Giám Sát Cháy Toàn Cầu Deck.gl WebGL2](/C:/Users/LENOVO/.gemini/antigravity/brain/a3d0f900-e776-406e-82a5-321d41b32c85/dashboard_preview.png)
<!-- slide -->
![Hộp Thoại Chi Tiết Điểm Cháy Radix UI](/C:/Users/LENOVO/.gemini/antigravity/brain/a3d0f900-e776-406e-82a5-321d41b32c85/fire_detail_preview.png)
````

---

## 2. Chi Tiết Các Thay Đổi & Thành Phần Đã Xây Dựng

### Route 1: Landing Page (`/`)
- **Hero Section**: Nền gradient vũ trụ sâu thẳm, tiêu đề chuẩn viễn thám NASA, mô tả bài toán khử trùng lặp đa vệ tinh MODIS & VIIRS.
- **Live Telemetry Ticker**: 4 thẻ số liệu vĩ mô:
  - **87,311** điểm cháy sau gộp (từ 153,948 lượt quét vệ tinh thô).
  - **953** sự kiện xác thực kép đa vệ tinh (độ tin cậy $\ge 92\%$).
  - **−43.3%** tỷ lệ khử trùng lặp quỹ đạo vệ tinh giao thoa.
  - **143** quốc gia và vùng lãnh thổ được giám sát.
- **MiniFirePreview Widget**: Khối xem trước WebGL2 Deck.gl nhúng trực tiếp, cho phép người dùng quan sát mật độ điểm cháy trước khi vào trạm giám sát.
- **3 Trụ Cột Khoa Học**:
  1. *ST-DBSCAN Không - Thời Gian* với elip bao quét cảm biến:
     $$\left(\frac{\Delta x}{a_{\text{EW}}}\right)^2 + \left(\frac{\Delta y}{b_{\text{NS}}}\right)^2 \le 1.0$$
  2. *Hợp Nhất Bayesian Đa Vệ Tinh* triệt tiêu dương tính giả:
     $$P_{\text{fused}} = 1 - \prod_{s \in S} (1 - p_{\text{sat}, s})$$
  3. *Tọa Độ Trọng Tâm VIIRS 375m & Năng Lượng FRP Tương Thích*:
     $$\text{FRP}_{\text{rec}} = \max_{s \in S} \left( \sum_{i \in s} \text{FRP}_i \right)$$

---

### Route 2: Phương Pháp Luận Khoa Học (`/methodology`)
- **Tài liệu nghiên cứu chuyên sâu**: Toàn bộ thuật toán ST-DBSCAN v2.2, suy giảm footprint viễn thám và hợp nhất xác suất Bayesian.
- **Bảng đối chiếu thông số cảm biến chi tiết**:
  - **MODIS Collection 6.1**: Bước sóng $3.96\,\mu\text{m} / 11.0\,\mu\text{m}$, độ phân giải nadir $1.000\,\text{m}$, dải quét $2.330\,\text{km}$, có biến dạng bowtie ở rìa quét.
  - **VIIRS Collection 2**: Kênh I-band I4/I5 $375\,\text{m}$, dải quét $3.040\,\text{km}$, thuật toán gộp điểm ảnh trên khoang tàu loại bỏ bowtie.
- **Trích dẫn văn hiến khoa học chuẩn quốc tế**: Giglio et al. (2016), Schroeder et al. (2014), Wooster et al. (2005).

---

### Route 3: Trạm Giám Sát Cháy Toàn Cầu (`/dashboard`)
- **Engine Bản Đồ WebGL2 GPU (Deck.gl v9 + MapLibre GL JS)**:
  - `ScatterplotLayer`: Vẽ 87,311 điểm cháy với hiệu ứng phát quang, tô màu phân cấp theo FRP và độ tin cậy.
  - `HeatmapLayer`: Tự động gom cụm mật độ nhiệt khi zoom nhỏ (Zoom 2–6).
  - `GeoJsonLayer`: Bản đồ choropleth tô màu 177 quốc gia theo mật độ cháy và số lượng điểm.
  - Basemaps: CARTO Dark Matter & Esri World Imagery (hoàn toàn miễn phí, 0 API key).
- **Hệ Thống 5 Thẻ KPI Tức Thời**: Cập nhật trong thời gian $O(N)$ khi người dùng kéo thanh trượt độ tin cậy hoặc lọc quốc gia.
- **Thanh Trượt Độ Tin Cậy Radix UI (Slider)**: Điều khiển kéo mượt mà từ 0% đến 100% với các preset nhanh (All, $\ge 50\%$, $\ge 70\%$, $\ge 80\%$, $\ge 90\%$).
- **Ma Trận Lịch Chế Độ Cháy Apache ECharts**:
  - Ma trận năm (2018–2026) $\times$ 12 tháng phân tích Z-score dị thường khí hậu.
  - Biểu đồ đường mùa vụ 12 tháng với độ lệch chuẩn $\pm 1\sigma$.
- **Hộp Thoại Chi Tiết Điểm Cháy Radix UI (`FireDetailDialog`)**: Hiển thị toạ độ WGS84 chính xác với nút sao chép 1-click, công suất bức xạ FRP, độ tin cậy Bayesian, số lượt quét vệ tinh và nguồn gốc cảm biến.

---

### Quản Lý Trạng Thái & Dữ Liệu
- **`zustand`**: Quản lý bộ lọc (`useFilterStore`) và giao diện (`useUiStore`) với cơ chế slice selectors, hạn chế tối đa re-render.
- **`@tanstack/react-query`**: Tự động cache toàn bộ 87k điểm, ranh giới quốc gia và ma trận lịch với `staleTime: 10 phút`. Tự động thăm dò API NASA FIRMS live mỗi 15 phút.

---

## 3. Kết Quả Kiểm Chứng & Bằng Chứng Thực Nghiệm

### 1. Kiểm tra Type System (`tsc --noEmit`)
```text
> nasa-firms-harmonization@1.0.0 typecheck
> tsc --noEmit

[Exit code: 0 - 0 errors]
```

### 2. Kiểm tra Đóng gói Production (`npm run build`)
```text
> nasa-firms-harmonization@1.0.0 build
> tsc --noEmit && vite build

vite v6.4.6 building for production...
transforming...
✓ 3939 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                  1.67 kB │ gzip:   0.82 kB
dist/assets/index-SbcMrz9M.css                 117.93 kB │ gzip:  18.61 kB
dist/assets/vendor-router-state-Droj1Zre.js     91.29 kB │ gzip:  30.00 kB
dist/assets/index-4UMEiNmO.js                  409.39 kB │ gzip: 127.50 kB
dist/assets/vendor-echarts-DC7Wczrp.js       1,145.33 kB │ gzip: 385.06 kB
dist/assets/vendor-deck-DLiRYy1L.js          2,121.45 kB │ gzip: 587.73 kB
✓ built in 11.37s
```

### 3. Kiểm tra Hậu đài Backend (`backend/tests`)
```text
Ran 39 tests in 18.667s
OK (39/39 tests passed)
```

### 4. Kiểm tra Trực quan & Console (`Browser Agent`)
- **Console Errors**: **0 fatal JavaScript errors**, 0 cảnh báo Promise unhandled.
- **Phản hồi HTTP**: Tất cả các trang `/`, `/methodology`, `/dashboard` và API `/api/data-status` đều trả về HTTP 200 OK.
