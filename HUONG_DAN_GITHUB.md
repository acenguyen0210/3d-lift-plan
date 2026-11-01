# HƯỚNG DẪN CẤU HÌNH & TỰ ĐỘNG COMMIT / PUSH LÊN GITHUB

Dự án **3D Lift Plan** đã được khởi tạo sẵn kho lưu trữ Git cục bộ trên máy của bạn với nhánh chính `main`. Dưới đây là hướng dẫn để bạn kết nối với GitHub và sử dụng các công cụ tự động.

---

## BƯỚC 1: TẠO REPOSITORY TRÊN GITHUB (Chỉ làm 1 lần đầu)

1. Mở trình duyệt và đăng nhập tài khoản của bạn tại: **https://github.com/new**
2. Đặt tên kho lưu trữ (Repository name), ví dụ: `3d-lift-plan`
3. Chọn chế độ: **Public** hoặc **Private** tùy nhu cầu.
4. **LƯU Ý QUAN TRỌNG**: **KHÔNG tích chọn** `Add a README file`, `Add .gitignore`, hoặc `Choose a license` (vì dự án đã có sẵn các file này).
5. Nhấn nút xanh **Create repository**.
6. Sao chép (Copy) đường link HTTPS của repository vừa tạo, có dạng:
   `https://github.com/<tên-tài-khoản>/3d-lift-plan.git`

---

## BƯỚC 2: CÁC CÁCH TỰ ĐỘNG COMMIT VÀ PUSH CODE

Bạn có thể chọn bất kỳ cách nào thuận tiện nhất dưới đây:

### 🌟 Cách 1: Nhấp đúp file `AUTO_PUSH_GITHUB.bat` (Đơn giản nhất, không cần gõ lệnh)
- Trong thư mục dự án `3d  Lift Plan`, bạn chỉ cần **nhấp đúp chuột vào file `AUTO_PUSH_GITHUB.bat`**.
- **Nếu là lần đầu chạy**: Cửa sổ sẽ hỏi bạn dán đường dẫn GitHub Repository vào, bạn chỉ cần nhấn chuột phải hoặc Ctrl+V dán link repo (đã copy ở Bước 1) và gõ `Enter`.
- Chương trình sẽ tự động:
  - Quét toàn bộ thay đổi (`git add -A`).
  - Tự động tạo ghi chú commit theo ngày giờ (hoặc bạn có thể tự gõ ghi chú nếu muốn).
  - Tự động đẩy (`git push`) thẳng lên GitHub.
  - Hiển thị thông báo màu xanh chúc mừng khi hoàn thành.

---

### 💻 Cách 2: Dùng lệnh qua Terminal / VS Code / Cursor
Mở terminal tại thư mục dự án và chạy:
```bash
# Tự động commit theo ngày giờ và push:
npm run push

# Hoặc kèm theo ghi chú commit tùy chọn của bạn:
npm run push -- "Cập nhật mô hình bình áp lực và xuất video"
```

---

### ⚡ Cách 3: Chế độ chạy ngầm tự động hoàn toàn (Auto-Watcher)
Nếu bạn muốn khi đang làm việc, chỉ cần nhấn `Ctrl + S` lưu file thì máy sẽ tự động gom commit và đẩy lên GitHub mà không cần làm gì thêm:
```bash
npm run auto-sync
```
- Trình watcher sẽ theo dõi thư mục `src/`. Khi phát hiện file được sửa đổi, nó đợi 15 giây an toàn (debounce) rồi tự động chạy commit và push lên GitHub.

---

## 🔑 LƯU Ý VỀ ĐĂNG NHẬP GITHUB LẦN ĐẦU (Authentication)
- Lần đầu tiên đẩy code lên GitHub từ máy tính, Windows có thể sẽ bật lên cửa sổ **Git Credential Manager** yêu cầu bạn:
  - Chọn **Sign in with your browser** (Đăng nhập nhanh qua trình duyệt) -> Nhấn nút xác nhận là xong.
  - Hoặc nhập **Personal Access Token (PAT)** nếu tài khoản bật xác thực 2 bước 2FA.
- Sau khi đăng nhập 1 lần, máy tính sẽ ghi nhớ thông tin vĩnh viễn, từ các lần sau mọi tiến trình push đều diễn ra tự động 100%.

---

## 🛠️ CÁC LỆNH TIỆN ÍCH NẾU CẦN THAO TÁC THỦ CÔNG:
- Xem trạng thái code: `git status`
- Đổi link GitHub remote khác: `git remote set-url origin <URL_MỚI>`
- Kéo code mới nhất từ GitHub về: `git pull --rebase origin main`
