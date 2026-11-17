# TIẾN ĐỘ THỰC HIỆN DỰ ÁN (PROJECT ROADMAP & TASKS)

> **Giao thức cập nhật:**
> - Trước khi bắt đầu một Task: Đọc lại `TASKS.md` và `ARCHITECTURE.md`. Chuyển trạng thái sang `[-]`.
> - Sau khi hoàn thành một Task: Cập nhật sang `[x]` và thực hiện Điểm dừng (Checkpoint Rule) xin xác nhận trước khi tiếp tục.

---

### PHASE 1: Khởi tạo & Thiết kế Nền tảng
- [x] **Task 1.1:** Khởi tạo cấu trúc dự án (Repo GitHub, Next.js 16 + TypeScript + Tailwind v4 + Core Packages), tạo file `ARCHITECTURE.md` và `TASKS.md`.
- [x] **Task 1.2:** Viết đầy đủ file `schema.prisma` theo đúng đặc tả ở Mục 4 và tạo file `seed.ts` (tạo sẵn 1 tiệm mẫu, 5 dịch vụ, 3 nhân viên, lịch làm việc 7 ngày và vài booking mẫu).

### PHASE 2: Core Backend Engine (Trái tim của hệ thống)
- [ ] **Task 2.1:** Viết hàm/module độc lập `getAvailableSlots(date, serviceIds, staffId?)` kèm kịch bản test/unit test chứng minh thuật toán không bị lỗi Overlap, tính đúng giờ nghỉ trưa và thời gian đệm (Buffer time).
- [ ] **Task 2.2:** Xây dựng API tạo lịch hẹn (`POST /api/bookings`) có sử dụng Database Transaction để kiểm tra lại slot trống trước khi lưu, hỗ trợ cả trường hợp khách chọn "Tự động sắp xếp nhân viên".
- [ ] **Task 2.3:** Xây dựng các API cho Admin: Lấy danh sách lịch theo ngày/nhân viên, cập nhật trạng thái Booking, tạo nhanh lịch Walk-in, và CRUD cho Dịch vụ / Nhân viên.

### PHASE 3: Giao diện Đặt lịch cho Khách hàng (Client Booking Flow)
- [ ] **Task 3.1:** Xây dựng giao diện Step-by-Step Wizard trên 1 trang duy nhất:
  - Bước 1: Chọn 1 hoặc nhiều dịch vụ (hiển thị tổng tiền & tổng thời gian).
  - Bước 2: Chọn Nhân viên (có tùy chọn "Bất kỳ ai còn trống").
  - Bước 3: Chọn Ngày và hiển thị lưới các Khung giờ trống (gọi API từ Task 2.1).
  - Bước 4: Điền Tên, SĐT, Ghi chú và Xác nhận đặt lịch.
- [ ] **Task 3.2:** Trang thông báo Đặt lịch thành công (hiển thị mã đặt lịch, tóm tắt thông tin) và tính năng tra cứu/hủy lịch bằng SĐT.

### PHASE 4: Hệ thống Quản trị & Vận hành tại quầy (Admin Dashboard)
- [ ] **Task 4.1:** Xây dựng trang **Calendar View (Lịch biểu theo ngày)**: Các cột là từng Nhân viên, các hàng là mốc thời gian. Hiển thị các khối Booking theo màu sắc trạng thái (`CONFIRMED`, `CHECKED_IN`, `COMPLETED`...).
- [ ] **Task 4.2:** Làm Modal "Thêm lịch nhanh (Walk-in)" và Modal "Chi tiết lịch hẹn" (cho phép Lễ tân đổi trạng thái nhanh sang Checked-in, Completed, No-show hoặc đổi giờ/đổi thợ).
- [ ] **Task 4.3:** Xây dựng trang Quản lý Dịch vụ (thêm/sửa giá, thời lượng, buffer time) và Quản lý Ca làm việc nhân viên.

### PHASE 5: Thống kê & Hoàn thiện (Polish)
- [ ] **Task 5.1:** Trang Dashboard tổng quan: Doanh thu trong ngày/tuần, tổng số ca hoàn thành, tỷ lệ hủy/No-show, hiệu suất theo nhân viên.
- [ ] **Task 5.2:** Kiểm tra lại toàn bộ UI/UX trên Mobile (Responsive) và xử lý các thông báo lỗi (Toast notifications).
