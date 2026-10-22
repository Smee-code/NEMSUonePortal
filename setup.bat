@echo off
setlocal
title NEMSUonePortal Setup

echo ================================================
echo   NEMSUonePortal - One-click Setup
echo   Installs all backend and frontend dependencies
echo ================================================
echo.

REM ------------------------------------------------------------------
REM 1) Check Python 3 is available
REM ------------------------------------------------------------------
python --version >nul 2>&1
if not errorlevel 1 (
    set "PYEXE=python"
    goto have_python
)
py -3 --version >nul 2>&1
if not errorlevel 1 (
    set "PYEXE=py -3"
    goto have_python
)
echo [ERROR] Python 3 was not found on this device.
echo         Install it from https://www.python.org/downloads/
echo         During install, tick "Add Python to PATH", then run this again.
echo.
pause
exit /b 1
:have_python
for /f "delims=" %%v in ('%PYEXE% --version 2^>^&1') do echo [OK] Found %%v
echo.

REM ------------------------------------------------------------------
REM 2) Check Node.js / npm is available
REM ------------------------------------------------------------------
call npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js / npm was not found on this device.
    echo         Install the LTS version from https://nodejs.org/
    echo         then close and re-open this window and run setup again.
    echo.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node --version 2^>^&1') do echo [OK] Found Node.js %%v
echo.

REM ------------------------------------------------------------------
REM 3) Backend - virtual environment + Python dependencies
REM ------------------------------------------------------------------
echo ------------------------------------------------
echo  Backend: installing Python dependencies
echo ------------------------------------------------
cd /d "%~dp0backend"

if not exist "venv\Scripts\python.exe" (
    echo [INFO] Creating virtual environment ^(venv^)...
    %PYEXE% -m venv venv
    if errorlevel 1 (
        echo [ERROR] Could not create the virtual environment.
        pause
        exit /b 1
    )
)

echo [INFO] Upgrading pip...
"venv\Scripts\python.exe" -m pip install --upgrade pip

echo [INFO] Installing packages from requirements.txt...
"venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Installing backend dependencies failed.
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed.
echo.

REM ------------------------------------------------------------------
REM 4) Backend - .env file + database
REM ------------------------------------------------------------------
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [INFO] Created backend\.env from .env.example - review it if needed.
    )
)

echo [INFO] Setting up the database ^(migrations^)...
"venv\Scripts\python.exe" manage.py migrate
if errorlevel 1 (
    echo [WARN] Migrations did not complete. Open backend\.env and check your
    echo        settings, then re-run this setup. Dependencies are still installed.
)
echo.

REM ------------------------------------------------------------------
REM 5) Frontend - npm dependencies
REM ------------------------------------------------------------------
echo ------------------------------------------------
echo  Frontend: installing npm dependencies
echo ------------------------------------------------
cd /d "%~dp0frontend"
echo [INFO] Running npm install ^(this can take a few minutes^)...
call npm install
if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed.
echo.

REM ------------------------------------------------------------------
REM Done
REM ------------------------------------------------------------------
echo ================================================
echo   Setup complete!
echo   Everything is installed on this device.
echo.
echo   To start the app, double-click:  start.bat
echo   Backend  : http://localhost:8000
echo   Frontend : http://localhost:5173
echo ================================================
echo.
pause
