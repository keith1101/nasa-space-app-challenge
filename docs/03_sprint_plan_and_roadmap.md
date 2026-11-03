# ⏱️ 48-Hour Sprint Plan & Milestone Roadmap

---

## 🧭 1. 48-Hour Hackathon Execution Phases

```
[Hour 00 - 06] ──► Ideation, Challenge Scope & NASA Data Ingestion
       │
[Hour 06 - 18] ──► Core Data Pipeline, Algorithm & Backend Engine
       │
[Hour 18 - 30] ──► Frontend Interactive UI, Map GIS & Visualization
       │
[Hour 30 - 40] ──► Integration, End-to-End Testing & Pitch Deck Drafting
       │
[Hour 40 - 46] ──► Video Demo Recording (<= 2 min) & Submission Text Polish
       │
[Hour 46 - 48] ──► Final Submission Review, Backup Proofs & Submission Lock
```

---

## 📅 2. Detailed Milestone & Task Tracker

| Giai đoạn (Timeline) | Hạng mục công việc (Task Item) | Người phụ trách | Trạng thái (Status) | Hạn chót (Deadline) |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1 (H0 - H6)** | Khảo sát 14 đề bài & chốt Challenge chính thức | Cả đội | ⏳ To Do | Giờ thứ 02 |
| | Tìm kiếm & tải tập dữ liệu mẫu từ NASA Earthdata / APIs | Data Lead | ⏳ To Do | Giờ thứ 04 |
| | Thống nhất User Story, Wireframe nháp & Tech Stack | Fullstack + UI | ⏳ To Do | Giờ thứ 06 |
| **Phase 2 (H6 - H18)** | Viết script tiền xử lý dữ liệu (clean, crop bounding box, normalize) | Data Lead | ⏳ To Do | Giờ thứ 12 |
| | Dựng core algorithm / ML model suy luận dữ liệu | Data / Backend | ⏳ To Do | Giờ thứ 16 |
| | Khởi tạo repo frontend, dựng layout khung và bản đồ Mapbox/Leaflet | Frontend Lead | ⏳ To Do | Giờ thứ 18 |
| **Phase 3 (H18 - H30)** | Kết nối API Backend với giao diện Frontend | Fullstack Dev | ⏳ To Do | Giờ thứ 24 |
| | Trực quan hóa dữ liệu vệ tinh lên bản đồ tương tác (Heatmap/Raster) | Frontend / GIS | ⏳ To Do | Giờ thứ 28 |
| | Hoàn thiện dashboard phân tích & các bộ lọc người dùng | Frontend Dev | ⏳ To Do | Giờ thứ 30 |
| **Phase 4 (H30 - H40)** | Deploy bản Live Demo lên Vercel / Cloud Run & test end-to-end | Backend / DevOps | ⏳ To Do | Giờ thứ 34 |
| | Soạn thảo 7-Slide Pitch Deck theo chuẩn tiêu chí chấm điểm NASA | Storyteller Lead | ⏳ To Do | Giờ thứ 38 |
| | Viết bản thảo Project Description chi tiết (tiếng Anh) | Lead + Data | ⏳ To Do | Giờ thứ 40 |
| **Phase 5 (H40 - H46)** | Quay màn hình demo sản phẩm thực tế (Loom / OBS) | Cả đội | ⏳ To Do | Giờ thứ 42 |
| | Thu âm giọng đọc (Voiceover), ghép phụ đề & xuất video 30s - 2min | Lead / Media | ⏳ To Do | Giờ thứ 44 |
| | Upload video lên YouTube / Vimeo (chế độ Unlisted / Public) | Lead | ⏳ To Do | Giờ thứ 46 |
| **Phase 6 (H46 - H48)** | Copy toàn bộ nội dung vào form nộp trên Space Apps Portal | Lead | ⏳ To Do | Giờ thứ 47 |
| | Rà soát checklist: Open Source, Attributions, Demo Link, Video Link | Cả đội | ⏳ To Do | Giờ thứ 47.5 |
| | **BẤM SUBMIT VÀ CHỤP MÀN HÌNH XÁC NHẬN NỘP THÀNH CÔNG** | Lead | ⏳ To Do | **Trước giờ 48** |

---

## 🛡️ 3. Risk Management & Backup Contingencies

1. **Rủi ro API NASA chậm hoặc giới hạn lượt gọi (Rate Limit):**
   * *Phương án dự phòng:* Tải sẵn bộ dữ liệu mẫu (offline snapshot / mock GeoJSON) lưu trong thư mục `data/` của repo để app vẫn chạy mượt mà ngay cả khi API gặp sự cố.
2. **Rủi ro mô hình AI huấn luyện lâu hoặc bị lỗi:**
   * *Phương án dự phòng:* Tiền tính toán trước kết quả (pre-computed inference results) cho các khu vực mẫu tiêu biểu để demo trực quan.
3. **Rủi ro sập đường truyền mạng hoặc server demo lúc nộp bài:**
   * *Phương án dự phòng:* Luôn có video demo quay màn hình chất lượng cao 1080p và file PDF backup slide lưu sẵn trong Google Drive.
