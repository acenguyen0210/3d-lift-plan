# 🏗️ 3D Lift Plan Pro - Phần Mềm Tính Toán Tải Cẩu An Toàn & Lập Biện Pháp Nâng Hạ

Ứng dụng chuyên nghiệp mô phỏng 3D trực quan và tính toán an toàn cẩu lắp theo tiêu chuẩn quốc tế **ASME B30.5**, **OSHA** và **TCVN**. Hỗ trợ đa dạng các chủng loại cẩu thực tế và cho phép **khai báo, nhập/xuất bảng tải của bất kỳ loại cẩu nào từ bên ngoài**.

---

## 🌟 Các Tính Năng Trọng Tâm

### 1. 🚜 Hỗ Trợ Đa Dạng Loại Hình Cần Cẩu & Khai Báo Cẩu Ngoài
- **Thư viện mẫu thực tế sẵn có**:
  - **Liebherr LTM 1050-3.1** (Cẩu bánh lốp 50 tấn, 3 trục, cần 11.3m - 38m)
  - **Liebherr LTM 1250-5.1** (Cẩu hạng nặng 250 tấn, 5 trục, cần 13.1m - 60m, đối trọng 88t)
  - **Tadano GR-700EX** (Cẩu địa hình Rough Terrain 70 tấn)
  - **Kobelco CKE2500-2** (Cẩu bánh xích hạng nặng 250 tấn, cần giàn Lattice Boom tới 73.2m)
  - **Zoomlion ZMC25** (Cẩu thùng 25 tấn trên chassis xe tải thông dụng)
  - **Liebherr 280 EC-H 12** (Cẩu tháp cố định có xe con tầm với 70m)
- **Khai báo & Tùy biến cẩu ngoài (Custom Crane Manager)**:
  - Cho phép thêm bất kỳ hãng cẩu nào: **Sany, Zoomlion, XCMG, Kato, Tadano, Demag, Kobelco, Manitowoc...**
  - Nhập thông số tự trọng, kích thước chân chống, đối trọng, giới hạn gió, sức kéo nhánh cáp.
  - **Trình soạn thảo Ma trận Bảng tải (Load Chart Matrix Editor)** trực quan theo từng bán kính $R$ và chiều dài cần $L$.
  - **Nhập / Xuất hồ sơ cẩu ra file JSON** để lưu trữ và chia sẻ giữa các kỹ sư.

---

### 2. 🧮 Tính Toán Tải Trọng Nâng & Thiết Bị Chằng Buộc (Rigging Study)
- **Phân rã tổng tải (Gross Load Breakdown)**:
  $$\text{Gross Load} = \text{Net Weight} + \text{Dây cáp/Ma-nê} + \text{Xà cẩu} + \text{Khối móc cẩu}$$
- **Mô hình hóa hình học tải 3D**: Khối hộp/Container, Bồn trụ tròn nằm ngang, Bình áp lực chỏm cầu, Ống công nghiệp.
- **Tính toán lực căng dây chằng (Sling Tension)**:
  - Tùy chọn 1, 2, 4 nhánh cáp (cáp thép, cáp vải, xích G80).
  - Tự động tính hệ số góc kẹp ($1/\sin \alpha$) và lực căng tác dụng lên mỗi nhánh cáp.
  - Cảnh báo an toàn khi góc kẹp $< 60^\circ$ hoặc $< 45^\circ$.

---

### 3. 🎯 Tra Bảng Tải Động & Đánh Giá An Toàn (% Tải Cẩu)
- Tự động nội suy 2 chiều (bán kính $R$ & chiều dài cần $L$) theo cấu hình đối trọng và độ mở chân chống (100%, 75%, 50%, bánh lốp).
- Phân loại cấp độ cẩu:
  - 🟢 **Safe Lift (< 75%)**: Nâng hạ an toàn bình thường.
  - 🟡 **Heavy Lift (75% - 85%)**: Tải cao, cần giám sát chặt chẽ.
  - 🟠 **Critical Lift (85% - 90%)**: Cẩu nguy hiểm, bắt buộc có biện pháp bằng văn bản và chữ ký phê duyệt.
  - 🔴 **Overload (> 100%)**: Cực kỳ nguy hiểm - Báo động đỏ cấm cẩu!

---

### 4. 🧱 Tính Toán Phản Lực Chân Chống & Áp Lực Nền Đất (GBP & Crane Mats)
- Tính toán phản lực thực tế lên **4 chân chống độc lập (FL, FR, RL, RR)** dựa trên góc quay toa $0^\circ - 360^\circ$, mô-men lật của tải và đối trọng.
- Hiển thị chân chống chịu tải lớn nhất ($P_{\max}$).
- Thư viện địa chất nền móng: Đá gốc cứng, Sỏi cuội, Bê tông cốt thép, Sét cứng, Cát, Đất yếu hoặc tự nhập.
- Kiểm tra kích thước tấm lót (thép/gỗ) và tính toán áp lực tiếp đất:
  $$\text{GBP} = \frac{P_{\max}}{A_{\text{mat}}} \le Q_{\text{allowable}}$$
- Tự động khuyến nghị kích thước tấm lót tối thiểu để chống lún lật.
- Tấm lót 3D trên màn hình tự đổi màu: Xanh (an toàn), Vàng/Cam (cảnh báo), Đỏ rực (vượt sức chịu tải nền đất).

---

### 5. 🏢 Quản Lý Vật Cản & Tải Trọng Gió (Clearance & Wind Derating)
- Mô phỏng công trình lân cận / tòa nhà / hố móng dạng 3D với kích thước tùy biến.
- Đo khoảng cách an toàn từ cần và tải tới mép công trình: Cảnh báo va chạm khi khoảng cách $< 2.0\text{ m}$.
- Đo và kiểm tra vận tốc gió hiện trường: Tính áp lực gió động ($q = \frac{1}{2}\rho v^2$) và lực đẩy gió tác dụng lên vật cẩu, cảnh báo vượt ngưỡng cho phép của cẩu.

---

### 6. 🔄 Chu Trình Cẩu Hai Điểm (Pick Point → Set Point) & Mô Phỏng Đường Đi
- Cài đặt tọa độ đón tải (Pick Point: $R_1, \theta_1, H_1$) và tọa độ lắp đặt (Set Point: $R_2, \theta_2, H_2$).
- So sánh % tải ở cả hai đầu mút và chỉ ra giai đoạn cẩu quyết định (Critical Stage).
- Nút bấm **"Mô phỏng chu trình nâng"**: Cần cẩu tự động xoay và di chuyển tải mượt mà giữa hai điểm để kiểm tra toàn bộ không gian làm việc.

---

### 7. 🎥 Khung Nhìn 3D Trực Quan Đa Góc Độ (Three.js WebGL)
- **3D Tự do**: Xoay, thu phóng, quan sát toàn diện.
- **Mặt bằng (Plan View Top-Down)**: Bản vẽ mặt bằng CAD nhìn từ trên cao.
- **Mặt bên (Elevation View)**: Bản vẽ mặt cắt đứng ngang thân cẩu.
- **Buồng lái (Operator Cab View)**: Góc nhìn trực tiếp từ ghế ngồi của thợ cẩu.
- **Bám sát tải (Load View)**: Quan sát chi tiết vật nâng và móc cẩu.

---

### 8. 📄 Xuất Thuyết Minh Biện Pháp An Toàn Cẩu Lắp (Print / PDF)
- Xuất bản vẽ và thuyết minh kỹ thuật hoàn chỉnh:
  - Thông tin dự án, đơn vị thi công, kỹ sư an toàn, thợ cẩu.
  - Bảng tổng hợp cấu hình cẩu, phân rã tải nâng, bảng tra khả năng tải.
  - Bảng kiểm tra áp lực chân chống và nền bãi.
  - Danh mục kiểm tra an toàn hiện trường (Checklist theo tiêu chuẩn ASME B30.5).
  - Khung chữ ký các bên: Thợ vận hành, Kỹ sư HSE, Chỉ huy trưởng, Tư vấn giám sát.
  - Tương thích in trực tiếp hoặc xuất ra file PDF chất lượng cao.

---

## 🚀 Hướng Dẫn Khởi Chạy Ứng Dụng

Ứng dụng chạy trên nền Web tiêu chuẩn với Node.js và Vite cực nhanh:

1. Mở terminal tại thư mục dự án:
   ```powershell
   cd "c:\Users\Admin\Desktop\3d  Lift Plan"
   ```

2. Khởi chạy máy chủ phát triển:
   ```powershell
   npm.cmd run dev
   ```

3. Mở trình duyệt web và truy cập địa chỉ:
   ```
   http://localhost:3000
   ```

