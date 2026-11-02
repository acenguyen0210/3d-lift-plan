@echo off
chcp 65001 >nul
title 3D LIFT PLAN PRO - Hệ thống Mô phỏng & Bản vẽ Biện pháp Cẩu 3D
color 0b

echo ===============================================================================
echo            3D LIFT PLAN PRO (ENGINEERING V2.0) - LOCAL LAUNCHER
echo   Hệ thống Mô phỏng 3D, Tính toán Sức nâng ^& Thuyết minh Biện pháp Cẩu
echo   Tác giả: Nguyễn Đức Thắng - Hotline/Zalo: 0962.228.783
echo ===============================================================================
echo.

:: 1. Kiểm tra Node.js đã cài đặt chưa
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0c
    echo [LỖI] Máy tính chưa cài đặt Node.js!
    echo.
    echo HƯỚNG DẪN KHẮC PHỤC:
    echo 1. Mở trình duyệt và truy cập: https://nodejs.org/
    echo 2. Tải bản "LTS" (Khuyến nghị bản 20.x hoặc 22.x) và cài đặt mặc định (Next -> Finish).
    echo 3. Sau khi cài đặt xong, hãy bấm đúp lại vào file này để khởi chạy.
    echo.
    pause
    exit /b
)

:: 2. Kiểm tra thư viện node_modules
if not exist "node_modules\" (
    echo [THÔNG BÁO] Phát hiện lần đầu chạy trên máy, hệ thống đang cài đặt các gói thư viện...
    echo Quá trình này chỉ mất 1 - 2 phút và chỉ cần thực hiện 1 lần duy nhất.
    echo Đang thực hiện: npm install ...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        color 0c
        echo.
        echo [LỖI] Cài đặt thư viện không thành công! Vui lòng kiểm tra kết nối Internet.
        pause
        exit /b
    )
    echo.
    echo [THÀNH CÔNG] Đã tải xong toàn bộ thư viện!
    echo.
)

:: 3. Khởi động Local Web Server và tự động mở trình duyệt
echo [ĐANG KHỞI ĐỘNG] Đang mở ứng dụng trên trình duyệt web của bạn...
echo + Địa chỉ máy chủ cục bộ: http://localhost:3000/
echo + Mẹo: Các thiết bị cùng mạng Wi-Fi (iPad, Laptop, Điện thoại) có thể truy cập qua IP máy tính này.
echo.
echo >> Khi muốn dừng ứng dụng: Nhấn phím Ctrl + C trong cửa sổ này và gõ Y.
echo ===============================================================================
echo.

call npm run dev -- --open --host

pause

