# Project Rules & Guidelines: NASA Space Apps Challenge

## 1. Scientific Data Fidelity (Strict Real Data Priority)
- Khi phát triển các công cụ khoa học vũ trụ (NASA Space Apps), bắt buộc kết nối trực tiếp đến các API/endpoint mở chính thức (NASA IRSA, IPAC, Earthdata, STScI).
- Không tự động thay thế bằng dữ liệu giả lập (mock/simulated) trừ khi hạ tầng ngoại tuyến hoặc có yêu cầu rõ ràng từ người dùng.
- Khi tải dữ liệu thực tế lớn (như Multi-Extension FITS Level 2), triển khai cơ chế caching cục bộ và fallback thông minh nếu mất kết nối.

## 2. Minimalist Scientific UI Standard
- Giao diện phải tinh gọn, thanh thoát, tập trung vào đối tượng trung tâm (ảnh thiên văn/bản đồ/time-lapse).
- Tránh nhồi nhét quá nhiều thẻ thông tin không cần thiết; ưu tiên khoảng trắng, typography rõ nét, và tương tác trực diện (High Signal-to-Noise Ratio).
