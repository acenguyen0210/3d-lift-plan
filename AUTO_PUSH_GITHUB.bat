@echo off
chcp 65001 >nul
title Tự động Commit và Push GitHub - 3D Lift Plan
color 0B

:: Thiết lập đường dẫn Git nếu máy chưa có trong biến môi trường
set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;C:\Users\Admin\AppData\Local\Programs\Git\cmd;C:\Program Files\Git\cmd;%PATH%"

echo ======================================================================
echo    🚀 CÔNG CỤ TỰ ĐỘNG COMMIT VÀ ĐẨY CODE LÊN GITHUB (3D LIFT PLAN)
echo ======================================================================
echo.

:: 1. Kiểm tra Git
where git >nul 2>&1
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [LỖI] Không tìm thấy Git trên máy tính!
    echo Vui lòng cài đặt Git hoặc liên hệ hỗ trợ.
    echo.
    pause
    exit /b 1
)

:: 2. Khởi tạo Git repo nếu chưa có
if not exist ".git" (
    echo [*] Đang khởi tạo kho mã nguồn Git local...
    git init -b main
    git config user.name "LiftPlan Developer"
    git config user.email "dev@liftplan.local"
)

:: 3. Kiểm tra Remote Origin (GitHub)
git remote get-url origin >nul 2>&1
if %ERRORLEVEL% neq 0 (
    color 0E
    echo [!] CHƯA KẾT NỐI VỚI GITHUB REPOSITORY!
    echo.
    echo Hướng dẫn:
    echo  1. Truy cập https://github.com/new và tạo một Repository mới (ví dụ: 3d-lift-plan)
    echo  2. Copy đường link HTTPS của repo (dạng: https://github.com/ten-ban/ten-repo.git)
    echo.
    set /p REPO_URL=">> Dán đường dẫn GitHub Repository vào đây và nhấn Enter: "
    if defined REPO_URL (
        git remote add origin !REPO_URL!
        git remote set-url origin !REPO_URL!
        echo [+] Đã thiết lập remote origin thành công!
    ) else (
        echo [!] Bạn chưa nhập link. Script sẽ chỉ commit trên máy local.
    )
    echo.
    color 0B
)

:: 4. Lấy thông tin nhánh hiện tại
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
if "%CURRENT_BRANCH%"=="" set CURRENT_BRANCH=main

:: 5. Thêm tất cả file thay đổi
echo [*] Đang chuẩn bị các tệp thay đổi (git add -A)...
git add -A

:: 6. Hỏi thông điệp commit
echo.
set "COMMIT_MSG="
set /p COMMIT_MSG=">> Nhập ghi chú commit (nhấn Enter để dùng mặc định theo ngày giờ): "

if "%COMMIT_MSG%"=="" (
    for /f "tokens=1-4 delims=/ " %%a in ('date /t') do (
        set DATE_STR=%%a-%%b-%%c
    )
    for /f "tokens=1-2 delims=: " %%a in ('time /t') do (
        set TIME_STR=%%a:%%b
    )
    set COMMIT_MSG=Auto-update: !DATE_STR! !TIME_STR! - Cập nhật tính năng & mô hình 3D
)

:: Thực hiện commit
echo.
echo [*] Đang ghi nhận commit: "%COMMIT_MSG%"
git commit -m "%COMMIT_MSG%"

:: 7. Đẩy code lên GitHub
echo.
git remote get-url origin >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [*] Đang đẩy code lên GitHub nhánh [%CURRENT_BRANCH%]...
    git push -u origin %CURRENT_BRANCH%
    if %ERRORLEVEL% equ 0 (
        color 0A
        echo.
        echo ======================================================================
        echo    🎉 CHÚC MỪNG: ĐÃ ĐẨY CODE LÊN GITHUB THÀNH CÔNG RỰC RỠ!
        echo ======================================================================
    ) else (
        color 0C
        echo.
        echo ======================================================================
        echo    [!] ĐẨY CODE THẤT BẠI. 
        echo    Nếu là lần đầu push, GitHub có thể sẽ yêu cầu đăng nhập tài khoản.
        echo    Hoặc nếu GitHub repo đã có commit từ trước, hãy chạy lệnh:
        echo        git pull --rebase origin %CURRENT_BRANCH%
        echo    sau đó chạy lại file này.
        echo ======================================================================
    )
) else (
    echo [i] Đã lưu commit thành công trên máy tính của bạn.
)

echo.
pause
