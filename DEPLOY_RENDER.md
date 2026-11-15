# 🛰️ Hướng Dẫn Triển Khai NASA FIRMS Platform Lên Render

Tài liệu này hướng dẫn cách triển khai toàn diện dự án **NASA FIRMS Hotspot Harmonization Platform** lên nền tảng đám mây [Render](https://render.com) bằng cơ chế **Render Blueprint** (`render.yaml`).

---

## 🏗️ 1. Kiến Trúc Triển Khai (Unified Multi-Stage Docker)

Dự án sử dụng mô hình kiến trúc **Full-stack Unified Service** đóng gói qua Docker đa tầng (*Multi-Stage Build*):

```
┌─────────────────────────────────────────────────────────────┐
│                       Render Service                        │
│                 https://<app-name>.onrender.com              │
├───────────────────────────────┬─────────────────────────────┤
│      Frontend (React 19)      │     Backend (FastAPI)       │
│  - Vite + TailwindCSS         │  - Spatio-Temporal DBSCAN   │
│  - Deck.gl + MapLibre GL      │  - REST Endpoints (/api/*)  │
│  - ECharts Analytics          │  - In-memory Caching        │
│  - Static Asset Delivery (/)  │  - Flight Sim (SQLite)      │
└───────────────────────────────┴─────────────────────────────┘
```

### Ưu điểm vượt trội:
1. **Zero CORS Issues**: Cả Frontend và Backend nằm chung một Domain, mọi request `/api/...` gọi dạng relative path, không cần cấu hình Cross-Origin Resource Sharing.
2. **Tối ưu tài nguyên Free Tier (512MB RAM)**: 
   - Giai đoạn build bundle React thực hiện ở container trung gian (`node:20-slim`), không tiêu tốn RAM khi server vận hành.
   - Runtime Python chỉ tốn ~110MB RAM, hoạt động mượt mà trong giới hạn 512MB của gói Free Render.
3. **Môi trường tất định (Deterministic Environment)**: Tránh lỗi thiếu thư viện C/C++ (GEOS, GDAL) của các gói geospatial (`geopandas`, `shapely`).

---

## 🚀 2. Các Bước Triển Khai Chi Tiết

### Cách 1: Triển khai tự động bằng Render Dashboard (Khuyên dùng)

1. **Đẩy mã nguồn lên Git**:
   Đảm bảo các file `render.yaml`, `Dockerfile`, `.dockerignore` đã được commit và push lên nhánh phát triển (`dev`) của repository GitHub/GitLab:
   ```bash
   git add render.yaml Dockerfile .dockerignore backend/server.py DEPLOY_RENDER.md
   git commit -m "feat: add render blueprint deployment configuration for dev branch"
   git push origin dev
   ```

2. **Tạo Blueprint Instance trên Render**:
   - Truy cập [dashboard.render.com](https://dashboard.render.com).
   - Click nút **New +** ở góc trên bên phải, chọn **Blueprint**.
   - Kết nối với tài khoản GitHub/GitLab và chọn repository **NASA Space App Challenge**.
   - Render sẽ tự động quét và phát hiện file `render.yaml`.

3. **Cấu hình thông số & Apply**:
   - Render sẽ hiển thị service name `nasa-firms-platform` và runtime `Docker`.
   - Nếu có khóa NASA FIRMS MAP KEY, điền vào mục `FIRMS_MAP_KEY` (hoặc để trống để hệ thống tự kích hoạt chế độ dữ liệu mẫu tích hợp sẵn).
   - Nhấn **Apply**.

4. **Theo dõi tiến trình**:
   - Render sẽ kích hoạt build Docker tự động (thời gian build lần đầu khoảng 3-5 phút).
   - Sau khi build xong, service chuyển sang trạng thái **Live** kèm đường dẫn công khai `https://<ten-app>.onrender.com`.

---

### Cách 2: Triển khai qua Render CLI

Nếu đã cài đặt `render-cli` trên máy:

```bash
# Đăng nhập Render
render login

# Khởi chạy blueprint từ repository hiện tại
render blueprints launch
```

---

## ⚙️ 3. Cấu Hình Biến Môi Trường (Environment Variables)

| Tên biến | Mặc định | Bắt buộc | Mô tả |
| :--- | :--- | :---: | :--- |
| `PORT` | `10000` | Có | Cổng mạng do Render chỉ định cho Web Service. |
| `PYTHONUNBUFFERED` | `1` | Có | Ép Python xuất log trực tiếp ra stdout/stderr. |
| `FIRMS_MAP_KEY` | *(trống)* | Không | Khóa API NASA LANCE FIRMS để lấy dữ liệu vệ tinh trực tiếp. Nếu không có, server tự dùng offline dataset trong `data/`. |

---

## 🩺 4. Kiểm Tra Sức Khỏe Dịch Vụ (Health Check)

Render Blueprint đã được cấu hình tự động ping endpoint:
```http
GET /api/data-status
```
* **Mã phản hồi chuẩn**: `200 OK`
* **JSON trả về mẫu**:
  ```json
  {
    "status": "online",
    "cache_records": 1522,
    "last_sync": "2026-11-15T03:30:00Z",
    "mode": "live"
  }
  ```

---

## 🔍 5. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

### 1. Dịch vụ phản hồi chậm ở lần truy cập đầu tiên (Cold Start)
- **Nguyên nhân**: Trên gói **Render Free**, Web Service sẽ tự động chuyển sang chế độ "ngủ" (spin down) sau 15 phút không có lượt truy cập.
- **Khắc phục**: Khi có request mới, Render mất khoảng 30-50 giây để khởi động lại container. Để duy trì 24/7 không có độ trễ khởi động, có thể nâng cấp lên gói **Starter ($7/tháng)** hoặc thiết lập cron job định kỳ ping vào `/api/data-status`.

### 2. Kiểm tra Logs khi triển khai
- Trong Render Dashboard, chọn service **nasa-firms-platform** -> tab **Logs**.
- Tìm dòng log xác nhận:
  ```
  NASA FIRMS Harmonization Platform (ST-DBSCAN v2.2)
  Server running on: http://0.0.0.0:10000
  ```
