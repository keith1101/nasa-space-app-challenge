# 🛠️ Resources, Data Catalog & Tech Stack

---

## 🔗 1. Core Project Infrastructure

* **Google Drive Shared Folder:** [Google Drive Workspace](https://drive.google.com/drive/folders/1B6nnb9HBf3gNhWBbILvYkPQvz_Pf8ILz)
  * *Chứa dữ liệu lớn, raw data, video nháp, slide thuyết trình, thiết kế UI.*
* **GitHub Repository:** [keith1101/nasa-space-app-challenge](https://github.com/keith1101/nasa-space-app-challenge)
  * *Chứa toàn bộ mã nguồn mở (Front-end, Back-end, ML Notebooks) và giấy phép mã nguồn mở.*
* **Official Hackathon Portal:** [NASA Space Apps Challenge Official](https://www.spaceappschallenge.org/)

---

## 🛰️ 2. NASA & Space Agency Open Data Catalog

Tất cả các bài thi NASA Space Apps Challenge **bắt buộc phải sử dụng dữ liệu mở** từ NASA hoặc các cơ quan vũ trụ đối tác (ESA, JAXA, CSA, v.v.).

### 🌍 Earth Observation & Remote Sensing Data
1. **NASA Earthdata Search ([earthdata.nasa.gov](https://search.earthdata.nasa.gov/)):**
   * Kho dữ liệu hơn 100+ petabytes từ hàng chục vệ tinh (MODIS, Landsat, Sentinel, GPM, SMAP, ICESat).
2. **NASA Open APIs ([api.nasa.gov](https://api.nasa.gov/)):**
   * APOD (Astronomy Picture of the Day), NASA Imagery and Video Library, Earth Observatory (EPIC).
   * Asteroids - NeoWs (Near Earth Object Web Service), Mars Rover Photos, DONKI (Space Weather).
3. **NASA Worldview & GIBS ([worldview.earthdata.nasa.gov](https://worldview.earthdata.nasa.gov/)):**
   * Global Imagery Browse Services (GIBS): Tích hợp trực tiếp lớp bản đồ WMS/WMTS/XYZ tiles vào Leaflet/Mapbox thời gian thực.
4. **NISAR / SAR Data ([nisar.jpl.nasa.gov](https://nisar.jpl.nasa.gov/)):**
   * Dữ liệu Radar khẩu độ tổng hợp (Synthetic Aperture Radar) đo đạc biến dạng bề mặt đất, băng tan, độ ẩm đất.

### 🌕 Lunar, Planetary & Deep Space Data
1. **Planetary Data System (PDS) ([pds.nasa.gov](https://pds.nasa.gov/)):**
   * Dữ liệu địa hình mặt trăng (LRO LOLA), quang phổ bề mặt Sao Hỏa, camera viễn thám.
2. **NASA Moon Trek & Mars Trek ([trek.nasa.gov](https://trek.nasa.gov/)):**
   * Bộ công cụ GIS 2D/3D trực tuyến khám phá chi tiết bề mặt Mặt Trăng, Sao Hỏa và các tiểu hành tinh.

---

## 💻 3. Technology Stack & Architecture

### 📐 Kiến trúc giải pháp (System Architecture)

```
[ NASA Open Data / APIs ]
            │
            ▼
[ Data Processing & Pipeline ] ──► (Python / GeoPandas / Xarray / Rasterio)
            │
            ▼
[ AI / ML Models & Core Engine ] ─► (PyTorch / Scikit-Learn / FastAPI)
            │
            ▼
[ Interactive UI & Visualization ] ─► (React / Next.js / Tailwind / Mapbox / Leaflet)
            │
            ▼
[ Deployment & Hosting ] ─────────► (Vercel / Cloud Run / Hugging Face Spaces)
```

### 🧰 Bảng phân bổ công nghệ khuyến nghị

| Tầng hệ thống (Layer) | Công nghệ / Thư viện đề xuất | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Frontend UI/UX** | Next.js / Vite (React), TailwindCSS, Shadcn/UI | Giao diện dashboard hiện đại, phản hồi nhanh, tối ưu hóa hiển thị |
| **Bản đồ không gian (GIS)** | Mapbox GL JS / Leaflet.js / Cesium.js | Trực quan hóa bản đồ vệ tinh tương tác, phủ lớp dữ liệu GeoTIFF/GeoJSON |
| **Biểu đồ & Analytics** | Recharts, Chart.js, D3.js | Trực quan hóa biến thiên thời gian, xu hướng môi trường |
| **Backend & REST API** | Python (FastAPI / Flask) | Ingest dữ liệu vệ tinh, xử lý thuật toán, cache phản hồi |
| **Xử lý dữ liệu không gian** | GeoPandas, Shapely, Rasterio, Xarray, NetCDF4 | Đọc và tính toán ma trận ảnh viễn thám, dữ liệu thời tiết HDF5/NetCDF |
| **Machine Learning / AI** | PyTorch, Scikit-learn, OpenCV | Nhận diện biến đổi, phân loại bề mặt, phát hiện dị thường |
| **Triển khai & Demo Cloud** | Vercel (Front-end), Render / Railway / Google Cloud Run | Hosting ứng dụng web trực tiếp để ban giám khảo chấm điểm |
