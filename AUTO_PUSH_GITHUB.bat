@echo off
set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;C:\Users\Admin\AppData\Local\Programs\Git\cmd;C:\Program Files\Git\cmd;C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"

if exist "C:\Program Files\nodejs\node.exe" (
    "C:\Program Files\nodejs\node.exe" scripts\git-sync.js %*
) else (
    node scripts\git-sync.js %*
)

if errorlevel 1 (
    echo.
    echo [ERROR] Qua trinh dong bo gap loi.
)

echo.
pause
