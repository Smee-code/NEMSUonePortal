@echo off
title NEMSUonePortal Launcher

echo ============================================
echo   NEMSUonePortal — Local Development
echo ============================================
echo.

:: Check that .env exists
if not exist "%~dp0backend\.env" (
    echo [ERROR] backend\.env not found.
    echo Please copy backend\.env.example to backend\.env and fill in your values.
    echo.
    pause
    exit /b 1
)

:: Check that node_modules exists
if not exist "%~dp0frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd /d "%~dp0frontend"
    npm install
    echo.
)

echo Starting Django backend on http://localhost:8000 ...
start "NEMSUonePortal — Backend" cmd /k "cd /d "%~dp0backend" && venv\Scripts\activate && python manage.py runserver"

:: Small delay so backend window opens first
timeout /t 2 /nobreak >nul

echo Starting React frontend on http://localhost:5173 ...
start "NEMSUonePortal — Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ============================================
echo   Both servers are starting up.
echo   Backend  : http://localhost:8000
echo   Frontend : http://localhost:5173
echo   Close the two terminal windows to stop.
echo ============================================
echo.
pause
