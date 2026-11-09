# 🎯 QuizMaster - Hệ Thống Trò Chơi Trắc Nghiệm Trực Tuyến

Hệ thống website trò chơi câu hỏi và đáp án gồm 2 phân hệ chuyên biệt:
1. **Trang Quản trị viên (Admin Portal)**: Quản lý câu hỏi (Thêm/Sửa/Xóa), cấu hình đáp án đúng, điểm số, giải thích, xem thống kê và bảng xếp hạng người chơi.
2. **Trang Người chơi (Player App)**: Nhập tên, tham gia trả lời trắc nghiệm theo lượt, đếm ngược thời gian, chấm điểm tự động, hiệu ứng âm thanh và vinh danh trên bảng xếp hạng.

---

## 🚀 Hướng Dẫn Khởi Động

### 1. Di chuyển vào thư mục dự án
```bash
cd /Users/tranthimaihuong/Huong_test/quiz_game
```

### 2. Khởi chạy máy chủ
```bash
node server.js
```
*(Hoặc dùng lệnh `npm start`)*

Sau khi khởi chạy thành công:
- 🎮 **Trang người chơi:** [http://localhost:3000](http://localhost:3000)
- ⚙️ **Trang Admin:** [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 🔑 Thông Tin Đăng Nhập Quản Trị
- **Mật khẩu Admin mặc định:** `admin123`
- *(Bạn có thể đổi mật khẩu mới bất kỳ lúc nào tại tab **Cài đặt** trong trang Admin)*

---

## 🌟 Các Tính Năng Nổi Bật

### 1. Trang Người Chơi (`/`)
- **Tùy biến bài thi**: Chọn số lượng câu hỏi (5 câu, 10 câu hoặc toàn bộ), bật/tắt đếm ngược thời gian (15s, 30s hoặc tự do).
- **Trải nghiệm chơi mượt mà**: Giao diện trực quan hiện đại, hiệu ứng chọn đáp án, thanh tiến trình % hoàn thành.
- **Hiệu ứng âm thanh & Pháo hoa**: Tích hợp âm thanh Web Audio (tiếng chuông khi đúng, còi khi sai, nhạc chiến thắng) và hiệu ứng pháo hoa Confetti khi đạt điểm cao.
- **Bảo mật chống gian lận**: Đáp án đúng được lưu trữ và chấm điểm an toàn trên server, người chơi không thể dùng F12 DevTools để xem trước đáp án.
- **Xem lại chi tiết bài làm**: Hiển thị lại từng câu hỏi, đáp án đã chọn, đáp án đúng và phần giải thích kiến thức chi tiết.
- **Bảng xếp hạng (Leaderboard)**: Tự động lưu điểm, xếp hạng Top người chơi xuất sắc nhất.

### 2. Trang Quản Trị Admin (`/admin`)
- **Bảo mật phiên đăng nhập**: Đăng nhập bằng mật khẩu, token tự động lưu trong phiên làm việc.
- **Bảng thống kê Dashboard**: Tổng số câu hỏi, tổng lượt chơi, điểm trung bình và kỷ lục người dẫn đầu.
- **CRUD Câu hỏi toàn diện**:
  - Hỗ trợ **chèn hình ảnh minh họa** cho câu hỏi (tải ảnh trực tiếp từ máy tính hoặc dán liên kết URL).
  - Thêm mới câu hỏi với 4 phương án A, B, C, D và chọn radio đáp án đúng.
  - Điểm số tùy chỉnh cho từng câu (+10, +20,...).
  - Giải thích đáp án bổ sung để người chơi mở rộng kiến thức.
  - Chỉnh sửa và xóa câu hỏi có xác nhận an toàn.
  - Thanh tìm kiếm và bộ lọc câu hỏi nhanh theo từ khóa.
- **Quản lý Bảng xếp hạng**: Xem danh sách lịch sử nộp bài của các người chơi, nút reset làm mới bảng xếp hạng khi cần.
- **Đổi mật khẩu Admin**: Linh hoạt thay đổi mật khẩu quản trị bất kỳ lúc nào.

---

## 📁 Cấu Trúc Dự Án
```text
quiz_game/
├── package.json          # Cấu hình dự án và dependencies
├── server.js            # Express Web Server, API endpoints & Auth
├── db.js                # SQLite Database (sử dụng node:sqlite native)
├── quiz.db              # File cơ sở dữ liệu SQLite (tự động tạo)
├── README.md            # Tài liệu hướng dẫn sử dụng
└── public/              # Giao diện Frontend
    ├── index.html       # Giao diện người chơi
    ├── admin.html       # Giao diện quản trị viên
    ├── css/
    │   └── style.css    # Hiệu ứng, typography và styling tùy biến
    └── js/
        ├── player.js    # Logic chơi game, âm thanh, tính điểm, confetti
        └── admin.js     # Logic quản trị, CRUD câu hỏi, bảo mật token
```
