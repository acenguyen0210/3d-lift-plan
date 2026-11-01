@echo off
chcp 65001 >nul
title 3D LIFT PLAN PRO - Đóng gói & Chạy Bản Xuất Xưởng (Production)
color 0a

echo ===============================================================================
echo       3D LIFT PLAN PRO - ĐÓNG GÓI & CHẠY BẢN PRODUCTION TỐI ƯU
echo   Tác giả: Nguyễn Đức Thắng - Hotline/Zalo: 0962.228.783
echo ===============================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0c
    echo [LỖI] Chưa cài đặt Node.js! Vui lòng cài tại https://nodejs.org/
    pause
    exit /b
)

if not exist "node_modules\" (
    echo Đang cài đặt thư viện phụ thuộc...
    call npm install
)

echo [1/2] Đang biên dịch mã nguồn và đóng gói tài nguyên vào thư mục /dist ...
call npm run build

if %errorlevel% neq 0 (
    color 0c
    echo [LỖI] Đóng gói thất bại!
    pause
    exit /b
)

echo.
echo [2/2] Khởi chạy máy chủ Production Preview và tự động mở trình duyệt...
echo ===============================================================================
echo.

call npm run preview -- --open --host

pause

