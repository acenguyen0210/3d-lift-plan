@echo off
chcp 65001 >nul
title 3D Lift Plan - GitHub Auto-Sync
color 0B

set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;C:\Users\Admin\AppData\Local\Programs\Git\cmd;C:\Program Files\Git\cmd;C:\Program Files\nodejs;%PATH%"

cd /d "%~dp0"

echo ======================================================================
echo    🚀 3D LIFT PLAN - CÔNG CỤ TỰ ĐỘNG COMMIT ^& PUSH GITHUB
echo ======================================================================
echo.

node scripts\git-sync.js %*

if %ERRORLEVEL% neq 0 (
    color 0C
    echo.
    echo ======================================================================
    echo    [!] Đã dừng hoặc gặp lỗi trong quá trình đồng bộ.
    echo ======================================================================
) else (
    color 0A
)

echo.
pause
