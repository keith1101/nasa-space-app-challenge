# 🔭 Cẩm Nang Hướng Dẫn Sử Dụng: SPHEREx & Planet X Explorer
### NASA International Space Apps Challenge — Nền tảng Trực quan hóa & Khảo sát Bầu trời Đa chu kỳ

---

## 🌌 1. Giới Thiệu Tổng Quan & Sứ Mệnh Khoa Học

Kính viễn vọng không gian **NASA SPHEREx** (Spectro-Photometer for the History of the Universe, Epoch of Reionization, and Ices Explorer) quét toàn bộ bầu trời 6 tháng một lần qua **102 dải phổ cận hồng ngoại (NIR: $0.75 - 5.0\,\mu\text{m}$)** bằng 6 mảng cảm biến Teledyne H2RG kết hợp bộ lọc biến thiên tuyến tính (**LVF**).

Ứng dụng **SPHEREx & Planet X Explorer** là một trạm làm việc khoa học web toàn màn hình (*Full-Screen Astronomy Workstation*), được thiết kế dành cho cả nhà vật lý thiên văn chuyên nghiệp lẫn cộng đồng khoa học công dân (*Citizen Scientists*). Mục tiêu trọng tâm là phát hiện:
* Các thiên thể di chuyển qua các chu kỳ (epochs): Tiểu hành tinh gần Trái Đất (NEOs), sao chổi, thiên thể ngoài Hải Vương Tinh (TNOs), vật thể vành đai Kuiper (KBOs).
* Sao lùn nâu lạnh có chuyển động riêng cao (*High-Proper-Motion Brown Dwarfs*).
* Ứng viên giả thuyết **Hành tinh số 9 / Hành tinh X (Planet Nine / Planet X)** phát xạ nhiệt hồng ngoại yếu ($T \approx 35 - 45\text{ K}$).

---

## 🚀 2. Yêu Cầu Hệ Thống & Khởi Chạy Ứng Dụng

### 2.1. Yêu cầu môi trường
* **Hệ điều hành**: Windows 10/11, macOS, hoặc Linux.
* **Backend**: Python 3.10+ (Khuyến nghị Conda environment `pds301m`), AstroPy 6.1+, FastAPI, HTTPX.
* **Frontend**: Node.js v18+ và npm / pnpm.

### 2.2. Khởi chạy 1-Click (Khuyến nghị trên Windows)
Chạy script PowerShell tự động trong thư mục gốc:
```powershell
.\run_dev.ps1
```
* Script sẽ tự động kích hoạt backend FastAPI tại `http://127.0.0.1:8000` và frontend Vite tại `http://localhost:3000`.

### 2.3. Khởi chạy thủ công từng dịch vụ
* **Terminal 1 — Backend**:
  ```powershell
  conda activate pds301m
  uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
  ```
* **Terminal 2 — Frontend**:
  ```powershell
  cd frontend
  npm run dev
  ```

---

## 🖥️ 3. Bố Cục Giao Diện Trạm Quan Sát (Workstation Layout)

Giao diện được thiết kế theo chuẩn **Minimalist Scientific UI** (Quy chuẩn `designos`), tối ưu không gian hiển thị cho bầu trời sao:

1. **Thanh Điều Hướng Trên Cùng (Navbar)**:
   * **Logo & Telemetry**: Hiển thị trạng thái kết nối Backend (`ONLINE / OFFLINE`) và nguồn dữ liệu (`NASA IRSA QR2 Live / Cached`).
   * **Bộ Mục Tiêu Tiêu Chuẩn (Preset Targets)**: Chọn nhanh các vùng trời danh tiếng (Cygnus Deep Field, Thiên hà Chong Chóng M101, Sao Barnard, Trường tìm kiếm Hành tinh X).
   * **Night-Vision Red Mode Toggle**: Nút chuyển đổi giao diện sang chế độ ánh sáng đỏ đơn sắc chuyên dụng cho phòng tối thiên văn học.
2. **Thanh Công Cụ Tinh Gọn (Compact Toolbar)**:
   * Nhập tọa độ thiên cầu xích đạo: Xích kinh $\alpha$ (RA) và Xích vĩ $\delta$ (Dec) tính bằng độ thập phân (J2000).
   * Nút **Fetch IRSA**: Truy vấn trực tiếp ảnh cắt FITS đa phần mở rộng (MEF) từ dịch vụ IPAC/IRSA của NASA.
   * Bộ chọn dải phổ 102 kênh (Băng 1 đến Băng 6, tương ứng $0.75 - 5.0\,\mu\text{m}$).
   * Hàm co giãn độ sáng thiên văn (*Astronomical Stretch*): `asinh`, `log`, `linear`, `sqrt`.
   * Bảng màu giả (*Colormap*): `magma`, `inferno`, `viridis`, `gray`, `coolwarm`.
3. **Khung Hiển Thị Bầu Trời Trung Tâm (Sky Viewport)**:
   * Chiếm 75-80% chiều cao màn hình, dựng hình trên nền tảng Canvas HTML5 siêu nét, chống nhòe subpixel (`imageSmoothingEnabled = false`).
   * Hỗ trợ zoom lăn chuột ($1\times - 16\times$) và kéo rê (*pan/drag*).
4. **Bảng Trắc Tinh & Phân Tích Phổ (Astrometry & SED Panel)**:
   * Nằm ở cạnh phải hoặc bên dưới, hiển thị danh sách các ứng viên chuyển động, tọa độ thiên văn chính xác và đường cong phân bố năng lượng quang phổ.

---

## 🔍 4. Hướng Dẫn Sử Dụng 5 Chế Độ Quan Sát Chuyên Sâu

Hệ thống cung cấp 5 chế độ làm việc cốt lõi, chuyển đổi qua các tab trên đầu Viewport:

### Chế độ 1: Blink Comparator (Chớp Ảnh Clyde Tombaugh)
* **Ý nghĩa khoa học**: Tái hiện phương pháp quang học mà Clyde Tombaugh đã dùng trên kính hiển vi so sánh để phát hiện Sao Diêm Vương năm 1930. Chớp lật liên tục giữa Epoch 1 (Tháng 04/2025) và Epoch 2 (Tháng 10/2025). Mắt người sẽ tự động triệt tiêu các sao nền tĩnh và phát hiện ngay thiên thể nhảy vị trí.
* **Thao tác**:
  * **Play/Pause**: Bật/tắt chu kỳ chớp tự động.
  * **Step Forward (Bước tới)**: Dừng chớp và lật từng khung hình thủ công để thẩm định chi tiết.
  * **Tần số chớp (Speed Slider)**: Điều chỉnh tần số từ $0.5\text{ Hz}$ (chậm rãi) đến $5.0\text{ Hz}$ (chớp nhanh).
  * **Vector Reticle**: Di chuột vào ảnh để kích hoạt tâm ngắm véc-tơ và vòng định cỡ góc (*aperture circles*).

### Chế độ 2: Synchronized Side-by-Side (Song Song Đồng Bộ)
* **Ý nghĩa khoa học**: Hiển thị đồng thời ảnh của Chu kỳ 1 và Chu kỳ 2 cạnh nhau để so sánh hình thái học, độ sáng và môi trường xung quanh.
* **Thao tác**:
  * **Đồng bộ Pan/Zoom**: Khi bạn cuộn chuột phóng to hoặc kéo rê ở khung hình bên trái, khung hình bên phải sẽ tự động dịch chuyển và phóng to ở tỷ lệ tương ứng $1:1$.
  * **Twin Crosshairs**: Con trỏ chuột trên một khung hình sẽ tự động hiển thị con trỏ song sinh đồng bộ trên khung hình đối diện, kèm HUD đọc tọa độ thiên văn WCS thời gian thực.

### Chế độ 3: Difference Imaging ($\Delta I = \text{Epoch 2} - \text{Epoch 1}$)
* **Ý nghĩa khoa học**: Kỹ thuật trừ ảnh trực tiếp nhằm loại bỏ hoàn toàn các sao nền cố định:
  $$\Delta I(x, y) = I_{\text{Epoch 2}}(x, y) - I_{\text{Epoch 1}}(x, y)$$
  Thiên thể chuyển động sẽ tạo ra một **lưỡng cực trắc tinh (astrometric dipole)** đặc trưng:
  * **Hố thông lượng âm (Màu đỏ/cam)**: Điểm thiên thể đã rời đi ở Epoch 1.
  * **Đỉnh thông lượng dương (Màu lam/cyan)**: Vị trí thiên thể vừa xuất hiện ở Epoch 2.
* **Thao tác**:
  * **Thanh trượt ngưỡng $\sigma$ (Sigma Slider)**: Kéo từ $2.0\sigma$ đến $10.0\sigma$ để lọc nhiễu nền vũ trụ và chỉ giữ lại các cấu trúc có độ tin cậy trắc tinh cao.
  * Các vòng tròn nhận diện mục tiêu tự động hiển thị bao quanh tâm lưỡng cực.

### Chế độ 4: Spectral Profile (Phân Bố Quang Phổ SED 1D)
* **Ý nghĩa khoa học**: SPHEREx không chỉ chụp ảnh mà còn là máy đo phổ tán sắc liên tục. Chế độ này trích xuất đường cong năng lượng quang phổ 102 dải bước sóng ($0.75 - 5.0\,\mu\text{m}$).
* **Thao tác**:
  * Nhấp chuột trực tiếp vào bất kỳ điểm sáng nào trên ảnh thiên văn để đọc phổ tại đúng pixel đó.
  * **Vạch hấp thụ băng đá vũ trụ (Ice Absorption Bands)**: Hệ thống tự động đánh dấu các bước sóng chẩn đoán quan trọng của các thiên thể xa xôi trong Hệ Mặt Trời:
    * $H_2O\text{ ice}$: Vạch hấp thụ sâu tại $3.05\,\mu\text{m}$.
    * $CO_2\text{ ice}$: Vạch hấp thụ tại $4.27\,\mu\text{m}$.
    * $CH_4\text{ ice}$ (Methane): Vạch hấp thụ tại $3.32\,\mu\text{m}$.
  * Nếu một ứng viên hiển thị các vạch hấp thụ này kết hợp với nhiệt độ bức xạ vật đen lạnh ($T < 50\text{ K}$), đây là dấu chỉ mạnh mẽ của một thiên thể ngoài Hải Vương Tinh hoặc Hành tinh X!

### Chế độ 5: Sổ Cái Trắc Tinh & Gắn Cờ Phát Hiện (Candidate Flagging)
* **Ý nghĩa khoa học**: Cầu nối giữa quan sát thực tế và đóng góp khoa học công dân (*Citizen Science Discovery Submission*).
* **Thao tác**:
  * Bảng **Astrometry Ledger** liệt kê toàn bộ các ứng viên phát hiện được trong trường quan sát: Tọa độ RA/Dec (J2000), Tốc độ chuyển động biểu kiến $\mu$ (tính bằng $\text{arcsec/năm}$), tỷ số tín hiệu trên nhiễu SNR, và độ biến thiên thông lượng $\Delta F$.
  * **Xuất dữ liệu**: Bấm nút **Export CSV** hoặc **Export JSON** để tải báo cáo tọa độ phục vụ đối chiếu với kính thiên văn mặt đất.
  * **Gắn cờ (Flag Candidate)**: Bấm vào ứng viên để mở cửa sổ báo cáo, lựa chọn phân loại:
    1. *Planet X / Distant Trans-Neptunian Object*
    2. *Kuiper Belt Object (KBO)*
    3. *High-Proper-Motion Brown Dwarf*
    4. *Near-Earth Asteroid / Comet*
    5. *Optical Artifact / Cosmic Ray Spike*
  * Điền ghi chú và gửi lưu trữ nguyên tử vào hệ thống.

---

## 🌙 5. Chế Độ Quan Sát Ban Đêm (Night-Vision Red Mode)

Khi làm việc tại các đài thiên văn hoặc phòng quan sát thực địa, ánh sáng trắng/xanh của màn hình làm co đồng tử và phá vỡ sự thích nghi bóng tối của mắt người (mất 20-30 phút để phục hồi).
* Bấm vào nút **Night Mode (Icon Mặt trăng/Đỏ)** trên thanh Navbar.
* Toàn bộ giao diện ứng dụng sẽ chuyển sang phổ ánh sáng đỏ đơn sắc bảo vệ mắt ($\lambda > 620\text{ nm}$), duy trì độ tương phản khoa học cao mà không gây chói lóa.

---

## 🛠️ 6. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

| Tình huống | Nguyên nhân | Hướng khắc phục |
| :--- | :--- | :--- |
| **Huy hiệu hiển thị `OFFLINE CACHE`** | Kết nối mạng đến dịch vụ NASA IRSA IPAC bị timeout hoặc IP bị giới hạn | Hệ thống tự động chuyển sang nạp dữ liệu MEF FITS 7-HDU thật đã lưu trong bộ đệm cục bộ (`backend/data/sample_fits/`). Ứng dụng vẫn hoạt động 100% với dữ liệu khoa học chuẩn. |
| **Ảnh bị tối hoặc cháy sáng quá mức** | Dải thông lượng quang học quá rộng | Chọn lại hàm co giãn độ sáng (*Stretch*) sang `asinh` hoặc `log` trên thanh công cụ để cân bằng dải sáng động. |
| **Không thể tải ảnh khi nhập tọa độ mới** | Tọa độ nằm ngoài vùng trời khảo sát sớm QR2 của SPHEREx | Chọn các vùng trời có sẵn trong danh sách **Presets** (như Cygnus Deep Field $\text{RA}=304.6935^\circ, \text{Dec}=42.4437^\circ$) đã được NASA phát hành dữ liệu Level 2. |
| **Frontend báo "Network Error"** | Backend FastAPI chưa được kích hoạt | Kiểm tra cửa sổ console backend hoặc chạy lại `.\run_dev.ps1` để đảm bảo cổng 8000 đang mở. |

---

*Tài liệu được biên soạn phục vụ NASA International Space Apps Challenge 2026.*
