# HƯỚNG DẪN KHỞI CHẠY ỨNG DỤNG 3D LIFT PLAN PRO LOCAL (TRÊN MÁY TÍNH CỦA BẠN)

Ứng dụng **3D LIFT PLAN PRO (Engineering V2.0)** đã được tích hợp sẵn các tập lệnh tự động hóa 1-click để bạn có thể chạy offline/local trên máy tính cá nhân hoặc laptop công trường mọi lúc mà không cần cài đặt phức tạp.

---

## 🚀 CÁCH 1: KHỞI CHẠY 1-CLICK BẰNG FILE `.BAT` (KHUYẾN NGHỊ - NHANH NHẤT)

Trong thư mục dự án `3d  Lift Plan`, bạn chỉ cần:

1. **Bấm đúp chuột (Double click)** vào file:
   👉 **`CHAY_UNG_DUNG.bat`**
2. Cửa sổ màu đen sẽ tự động:
   * Kiểm tra máy tính đã có **Node.js** chưa.
   * Tự động cài đặt thư viện (`node_modules`) nếu là lần đầu chạy.
   * Khởi động máy chủ cục bộ và **tự động mở trình duyệt web** tại địa chỉ: `http://localhost:3000/`.
3. Khi muốn tắt ứng dụng: Bạn chỉ cần đóng cửa sổ đen đó lại (hoặc bấm `Ctrl + C`).

---

## 🛠️ CÁCH 2: CHẠY BẰNG TERMINAL (COMMAND PROMPT / POWERSHELL / VS CODE)

Nếu bạn quen dùng dòng lệnh:

1. Mở thư mục dự án trong Terminal/CMD:
   ```bash
   cd "c:\Users\Admin\Desktop\3d  Lift Plan"
   ```
2. Cài đặt thư viện (chỉ cần chạy lần đầu tiên):
   ```bash
   npm install
   ```
3. Chạy môi trường phát triển:
   ```bash
   npm run dev
   ```
   * Hoặc mở kèm tự động bật trình duyệt:
     ```bash
     npm run dev -- --open
     ```
4. Mở trình duyệt truy cập: `http://localhost:3000/`.

---

## 📦 CÁCH 3: ĐÓNG GÓI BẢN PRODUCTION TỐI ƯU (CHẠY OFFLINE NHẸ VÀ MƯỢT NHẤT)

Khi bạn muốn chạy bản đã tối ưu hóa nén toàn bộ code (tốc độ tải nhanh gấp 3 lần, không tốn RAM):

* Bấm đúp chuột vào file: **`DONG_GOI_SAN_XUAT.bat`**
* File này sẽ tự động chạy `npm run build` tạo thư mục `dist/` hoàn chỉnh và chạy `npm run preview`.

---

## 📱 TRUY CẬP TỪ ĐIỆN THOẠI / IPAD / MÁY TÍNH KHÁC CÙNG MẠNG LAN CÔNG TRƯỜNG

Do lệnh chạy đã được cấu hình cờ `--host 0.0.0.0`, bất kỳ máy tính hoặc thiết bị nào kết nối chung mạng Wi-Fi/LAN với máy của bạn đều có thể truy cập được:

1. Trên máy tính đang chạy, mở CMD gõ `ipconfig` để xem địa chỉ IP (ví dụ: `192.168.1.15`).
2. Trên điện thoại/iPad/máy tính của đồng nghiệp, mở trình duyệt gõ:
   ```text
   http://192.168.1.15:3000/
   ```
   *(Thay 192.168.1.15 bằng IP thực tế của máy tính bạn)*.

---

## ⚠️ NẾU MÁY TÍNH MỚI CHƯA CÓ NODE.JS

Nếu bạn copy thư mục này sang một máy tính mới hoàn toàn chưa từng cài đặt Node.js:
1. Truy cập trang chủ: **https://nodejs.org/**
2. Bấm tải bản **LTS (Long Term Support)** (file cài đặt `.msi` cho Windows).
3. Cài đặt bình thường (bấm *Next -> Next -> Install -> Finish*).
4. Sau đó bấm vào **`CHAY_UNG_DUNG.bat`** là ứng dụng sẽ chạy ngay lập tức!

---
*Phát triển bởi Kỹ sư Nguyễn Đức Thắng - Hotline/Zalo: 0962.228.783*

