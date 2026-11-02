@echo off
chcp 65001 >nul
title 3D Lift Plan - GitHub Auto-Sync
color 0b
set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;C:\Users\Admin\AppData\Local\Programs\Git\cmd;C:\Program Files\Git\cmd;C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"

if exist "C:\Program Files\nodejs\node.exe" (
    "C:\Program Files\nodejs\node.exe" scripts\git-sync.js %*
) else (
    node scripts\git-sync.js %*
)

if errorlevel 1 (
    color 0c
    echo.
    echo [ERROR] Quá trình đồng bộ gặp lỗi. Vui lòng kiểm tra lại kết nối mạng hoặc tài khoản.
)

echo.
pause
