@echo off
REM ====================================
REM Quick Start Script - Tools Serba Guna
REM ====================================

echo ========================================
echo   TOOLS SERBA GUNA - Quick Start
echo ========================================
echo.

REM Check if Node.js is installed
echo [1/3] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js tidak ditemukan!
    echo Silakan install Node.js dari: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js terdeteksi: 
node --version
echo.

REM Check if npm is available
echo [2/3] Checking npm...
call npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm tidak dapat dijalankan!
    echo Silakan baca FIX-POWERSHELL.md untuk solusi
    pause
    exit /b 1
)

echo [OK] npm terdeteksi: 
call npm --version
echo.

REM Check if node_modules exists
echo [3/3] Checking dependencies...
if not exist "node_modules\" (
    echo [INFO] Dependencies belum terinstall
    echo [INFO] Menjalankan npm install...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install gagal!
        pause
        exit /b 1
    )
) else (
    echo [OK] Dependencies sudah terinstall
)
echo.

echo ========================================
echo   Semua Siap! Starting dev server...
echo ========================================
echo.
echo Aplikasi akan berjalan di:
echo   http://localhost:8080
echo.
echo Tekan Ctrl+C untuk stop server
echo.
echo ========================================

REM Start the development server
call npm run dev
