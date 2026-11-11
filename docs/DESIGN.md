---
name: "SPHEREx Scientific Workstation & Public Portal Design System"
version: "2.0.0"
persona: "Dark Terminal / High-Precision Scientific Instrument Workstation"

tokens:
  colors:
    canvas:
      black: "#03050b"          # Canvas viewport background & FITS rendering
      deep: "#060913"           # App background, modal backdrop, sticky surfaces
    space:
      950: "#040711"            # Panels, sub-navigation tabs, dropdown inputs
      900: "#0a0f1d"            # Elevated cards, toolbars, modal surfaces
      850: "#0e1629"            # Action buttons, interactive hover states
      800: "#141e36"            # Hairline dividers, subtle borders (1px)
      750: "#182442"            # Coordinate input wrappers, active groupings
      700: "#1e2c4f"            # Form controls, active ring borders
      600: "#2c3e6b"            # Secondary interactive borders
    scientific:
      cyan: "#67e8f9"           # Primary accent, Epoch 2 marker, SED curve (13.72:1 AAA)
      amber: "#fbbf24"          # Selected marker, ice absorption, S/N badges (11.91:1 AAA)
      rose: "#fb7185"           # Epoch 1 marker, negative residual dipoles, critical alerts
      emerald: "#34d399"        # AstroPy live telemetry, verified scientific candidate
    nasa:
      blue: "#0B3D91"           # Official NASA insignia blue & gradient anchor (10.04:1 AAA)
      red: "#FC3D21"            # Official NASA red chevron accent
      cyan: "#00F0FF"           # NASA telemetry live indicator
    text:
      primary: "#e2e8f0"        # High-contrast body text (Slate-200, 16.13:1 AAA)
      secondary: "#94a3b8"      # Metadata, axis labels, WCS descriptions (Slate-400, 7.75:1 AAA)
      muted: "#64748b"          # Micro HUD captions, units (Slate-500, 4.62:1 AA)
    night_vision:
      bg: "#090303"             # Optical darkroom red background
      surface: "#180606"        # Red-tinted elevated card surface
      text: "#ffb4a8"           # Red monochrome text (12.03:1 AAA)
      border: "rgba(255, 82, 65, 0.48)"

  typography:
    fonts:
      body: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
      display: "Space Grotesk, Inter, sans-serif"
    scales:
      hud-micro:
        size: "10px"
        lineHeight: "14px"
        fontFamily: "mono"
      hud-compact:
        size: "11px"
        lineHeight: "16px"
        fontFamily: "mono"
      body-xs:
        size: "12px"
        lineHeight: "16px"
        fontFamily: "body"
      body-sm:
        size: "14px"
        lineHeight: "20px"
        fontFamily: "body"
      title-md:
        size: "16px"
        lineHeight: "24px"
        fontWeight: "700"
        fontFamily: "body"
      heading-xl:
        size: "24px"
        lineHeight: "32px"
        fontWeight: "700"
        fontFamily: "display"

  spacing:
    unit: "4px"
    scale:
      1: "4px"
      2: "8px"
      3: "12px"
      4: "16px"
      6: "24px"
      8: "32px"

  rounded:
    subtle: "4px"               # Tabs, badge pills, control steppers
    control: "8px"              # Dropdowns, coordinate input groups, action buttons
    modal: "12px"               # Native dialog panels, floating tool overlays
---

# SPHEREx Planet Nine Workstation — Design System & Architecture Specification

Tài liệu này xác định ngôn ngữ thiết kế thị giác, cấu trúc module và quy chuẩn kỹ thuật cho nền tảng web **SPHEREx Planet Nine Explorer** theo chuẩn giao diện hiện đại và công cụ khoa học chính xác.

---

## 1. Product Persona & Triết lý Thiết kế

* **Phong cách cốt lõi:** **Scientific Instrument Workstation** kết hợp **Editorial Public Science**.
* **Nguyên tắc "Anti-AI-Slop":**
  * Loại bỏ hoàn toàn gradient tím/hồng vô nghĩa; nền tảng sử dụng bảng màu không gian sâu (`#03050b` và `#060913`).
  * Phân cấp thị giác bằng Flat Surface Luminance và viền hairline 1px (`#141e36`) thay vì bóng đổ mờ nhạt (drop-shadows).
  * Tối đa hóa tỷ lệ tín hiệu trên nhiễu (Signal-to-Noise Ratio): ưu tiên không gian hiển thị cho dữ liệu thiên văn (Ảnh FITS, phổ SED 102 kênh, bảng tọa độ vi phân).
* **Chế độ Chuyên dụng Night-Vision Red Mode:**
  * Giữ gìn sự thích ứng tối của mắt khi quan sát thực địa tại các đài thiên văn.
  * Lọc quang học đơn sắc đỏ bước sóng dài ($\lambda > 630\text{ nm}$) với độ tương phản văn bản đạt $12.03:1$.

---

## 2. Tiêu chuẩn Tiếp cận & Tương phản (WCAG 2.2 Gate)

| Cặp màu phần tử | Foreground | Background | Tỷ lệ tương phản | Đạt chuẩn WCAG |
| :--- | :--- | :--- | :--- | :--- |
| **Body Primary Text** | `#e2e8f0` (Slate-200) | `#060913` (Canvas Deep) | **16.13:1** | **PASS AAA** ($\ge 7.0:1$) |
| **Scientific Accent (Cyan)** | `#67e8f9` (Cyan-300) | `#060913` (Canvas Deep) | **13.72:1** | **PASS AAA** ($\ge 7.0:1$) |
| **Observation Amber Data** | `#fbbf24` (Amber-400) | `#060913` (Canvas Deep) | **11.91:1** | **PASS AAA** ($\ge 7.0:1$) |
| **Secondary Labels & WCS** | `#94a3b8` (Slate-400) | `#060913` (Canvas Deep) | **7.75:1** | **PASS AAA** ($\ge 7.0:1$) |
| **Secondary on Panel** | `#94a3b8` (Slate-400) | `#0a0f1d` (Space-900) | **7.45:1** | **PASS AAA** ($\ge 7.0:1$) |
| **Night-Vision Active Text**| `#ffb4a8` (Red text) | `#090303` (Red dark bg) | **12.03:1** | **PASS AAA** ($\ge 7.0:1$) |
| **NASA Inspect CTA** | `#ffffff` (White text) | `#0B3D91` (NASA Blue) | **10.04:1** | **PASS AAA** ($\ge 7.0:1$) |

---

## 3. Kiến trúc Đa Không gian (Dual-Space Layout Architecture)

Để giải quyết mâu thuẫn giữa nội dung tài liệu dài và công cụ phân tích không gian kín, nền tảng chia làm 2 shell giao diện riêng biệt:


```

```
                      ┌──────────────────────────┐
                      │   App Router (Root)      │
                      └─────────────┬────────────┘
                                    │
       ┌────────────────────────────┴────────────────────────────┐
       ▼                                                         ▼

```

┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│        1. Editorial Public Space     │  │       2. Workstation Full-Screen     │
│   (Max-w-7xl, Natural Scrollable)    │  │       (100vw x 100vh, Zero Scroll)   │
├──────────────────────────────────────┤  ├──────────────────────────────────────┤
│ • /about: Giới thiệu, sứ mệnh SPHEREx│  │ • /app/viewer: FITS Blink Comparator │
│ • /guide: Cẩm nang săn tìm & nhiễu   │  │ • /app/spectral: Phân tích phổ SED   │
│ • /community: Bảng xếp hạng, vinh danh│  │ • /app/ledger: Ứng viên lưỡng cực   │
└──────────────────────────────────────┘  └──────────────────────────────────────┘

```

---

## 4. Hệ thống Tab & Điều hướng Toàn diện

### Tab 1: Giới thiệu Dự án (`/about`) — *Editorial Space*
* **Hero Section:** Quỹ đạo mô phỏng 3D của Planet Nine tại vùng đĩa Kuiper mở rộng ($a \approx 400 - 800\text{ AU}$); CTA trực tiếp: *"Mở Trạm Làm Việc"* và *"Tài liệu Khoa học"*.
* **Nguyên lý SPHEREx & Planet Nine:**
  * Giải thích cơ chế quét toàn bầu trời 6 tháng/lần với 102 dải phổ hồng ngoại ($0.75 - 5.00\text{ }\mu\text{m}$).
  * Đồ thị phân rã bức xạ nhiệt: Tại sao kính quang học mặt đất bỏ sót nhưng SPHEREx phát hiện được thiên thể nhiệt độ cực thấp ($T \approx 30 - 45\text{ K}$).
* **Thời gian thực:** Bảng đếm số ô dữ liệu đã quét, số ứng viên lưỡng cực phát hiện và trạng thái nhiệm vụ.

### Tab 2: Hướng dẫn Phân tích (`/guide`) — *Editorial Space*
* **Quy trình 3 bước cho Nhà khoa học Công dân:**
  1. *Căn chỉnh trường quan sát (WCS Alignment)* và chọn mốc thời gian $E_1, E_2$.
  2. *So sánh chuyển động riêng (Proper Motion Blink)* để phát hiện điểm nhảy pixel.
  3. *Trích xuất phổ hấp thụ băng* để loại trừ sao lùn nâu hoặc tiểu hành tinh gần.
* **Atlas Nhận diện Dị thường (Interactive Artifact Atlas):**
  * So sánh đối chiếu trực quan: Thiên thể thật vs Tia vũ trụ (Cosmic Rays) vs Bụi cảm biến vs Tiểu hành tinh vành đai chính (Main-belt Asteroids).
* **Bảng phím tắt chuyên dụng:** Cung cấp danh mục phím tắt chuẩn của trạm làm việc (`Space`, `1-4`, `W/A/S/D`, `Z/X`).

### Tab 3: Trạm Quan sát Bầu trời (`/app/viewer`) — *Workstation Shell*
* **Hardware-Accelerated Canvas:** HTML5 Canvas với `imageSmoothingEnabled = false` nhằm giữ nguyên giá trị trắc quang gốc.
* **Blink Comparator Engine:**
  * Tần số chớp linh hoạt điều chỉnh được: $f \in [0.5\text{ Hz}, 5.0\text{ Hz}]$.
  * Đánh dấu vị trí Epoch 1 (Rose `#fb7185`) và Epoch 2 (Cyan `#67e8f9`).
* **Kênh Vi phân Triệt tiêu Sao nền (Difference Imaging):**
  $$\Delta I = I(E_2) - I(E_1)$$
  * Thanh trượt lọc ngưỡng phát hiện: $\sigma\text{-threshold} \in [2.0\sigma, 10.0\sigma]$.
* **WCS HUD Coordinates:** Hiển thị tọa độ con trỏ chuột thời gian thực: Xích kinh $\alpha$ (J2000 HMS), Xích vĩ $\delta$ (J2000 DMS) và thông lượng bề mặt ($MJy/sr$).

### Tab 4: Hồ sơ Quang phổ (`/app/spectral`) — *Workstation Shell*
* **102-Channel SED Interactive SVG Graph:**
  * Đồ thị phân bố năng lượng quang phổ (Spectral Energy Distribution) trải dài từ $0.75\text{ }\mu\text{m}$ đến $5.00\text{ }\mu\text{m}$.
  * Vạch đánh dấu phổ hấp thụ băng chuẩn:
    * Băng nước: $\text{H}_2\text{O}$ tại $3.05\text{ }\mu\text{m}$
    * Khí mê-tan: $\text{CH}_4$ tại $3.32\text{ }\mu\text{m}$
    * Băng carbon dioxide: $\text{CO}_2$ tại $4.27\text{ }\mu\text{m}$
* **Interactive 2D Crosshair:** Click trực tiếp vào bất kỳ tọa độ nào trên ảnh FITS để tự động trích xuất chuỗi phổ 102 điểm tại tọa độ đó.

### Tab 5: Sổ cái Ứng viên (`/app/ledger`) — *Workstation Shell*
* **Virtualized Data Table:** Hiển thị danh mục ứng viên có độ trễ cực thấp (sử dụng `@tanstack/react-virtual`).
* **Các chỉ số thiên văn:** Định danh ID, Tọa độ $(\alpha, \delta)$, Chuyển động riêng $\mu$ ($\text{mas/yr}$), Tỷ lệ tín hiệu trên nhiễu ($S/N$), Trạng thái duyệt (Verified, Pending, Artifact).
* **Xuất dữ liệu 1-click:** Định dạng CSV, JSON hoặc VOTable chuẩn thiên văn học.

### Tab 6: Bảng Vinh danh & Cộng đồng (`/community`) — *Editorial Space*
* Bảng xếp hạng cá nhân và nhóm nghiên cứu tham gia sàng lọc nhiều ô dữ liệu nhất.
* Kênh thảo luận mở cho các ứng viên dị thường đang có tranh biện khoa học cao.

---

## 5. Kiến trúc Xử lý Dữ liệu Nặng (Data Pipeline Architecture)

Để đảm bảo trạm làm việc giữ vững 60 FPS khi thao tác ảnh FITS 7-HDU và đồ thị 102 kênh:


```

[Máy chủ NASA IRSA / Local Cache]
│
▼ (ArrayBuffer - Raw FITS)
┌────────────────────────────────────────────────────────┐
│ Web Worker (fits-processor.worker.ts)                  │
│ • Giải nén ma trận Binary HDU                          │
│ • Tính toán ma trận vi phân: ΔI = E₂ - E₁              │
│ • Chuẩn hóa độ tương phản (ZScale / Asinh Stretch)     │
└───────────────┬────────────────────────────────────────┘
│
▼ (Transferable ImageBitmap)
┌────────────────────────────────────────────────────────┐
│ Main UI Thread                                         │
│ • Render trực tiếp lên Canvas (Không drop frame)       │
│ • TanStack Query quản lý Cache vùng lân cận            │
└────────────────────────────────────────────────────────┘

```

---

## 6. Dialog & Modal Overlays (Native HTML5 Standard)

Mọi dialog mở rộng trên trạm làm việc (`CandidateModal.tsx`, `TelemetryConfigModal.tsx`) sử dụng thẻ ngữ nghĩa chuẩn HTML5:

```html
<dialog 
  ref={dialogRef}
  class="fixed inset-0 m-auto z-50 rounded-modal bg-space-900 border border-space-800 p-6 text-text-primary backdrop:bg-black/80 backdrop:backdrop-blur-md focus:outline-none"
>
  <!-- Content -->
</dialog>

```

* **Hành vi điều khiển:** Kích hoạt thông qua `dialogRef.current.showModal()`.
* **Khả năng tự thân:** Focus trap nội tại, tự đóng khi ấn `Esc`, ngăn chặn cuộn nền mà không cần can thiệp JavaScript phức tạp.

---

## 7. Ma trận Trạng thái Tương tác (State Transition Matrix)

| Trạng thái | Lớp giao diện (Tailwind Tokens) | Phản hồi thị giác |
| --- | --- | --- |
| `default` | `bg-space-900 text-text-primary border border-space-800` | Giao diện phẳng, tinh gọn, viền hairline 1px |
| `hover` | `hover:bg-space-800 hover:text-white transition-colors duration-150` | Tăng nhẹ độ sáng bề mặt |
| `focus-visible` | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scientific-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-canvas-deep` | Vòng sáng Cyan chuẩn xác, không bị che khuất |
| `active` | `active:scale-[0.98] transition-transform` | Phản hồi xúc giác cơ học dạng nén |
| `disabled` | `opacity-40 cursor-not-allowed select-none` | Hạ độ rõ nét, chặn toàn bộ pointer-events |
| `loading` | `animate-pulse bg-space-800 pointer-events-none` | Skeleton shimmer giữ chỗ, ngăn ngừa giật layout (Zero CLS) |
