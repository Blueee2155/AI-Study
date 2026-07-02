@echo off
cd /d "%~dp0"

:: Check if backend already running
curl -s http://127.0.0.1:8000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Backend already running
    goto frontend
)

echo [1/3] Starting backend (port 8000)...
start "" /min cmd /c ""%~dp0start-backend.bat""

:: Wait for backend (max 30 seconds)
set wait_count=0
:wait_loop
set /a wait_count+=1
if %wait_count% gtr 15 (
    echo [WARN] Backend may not have started in time, continuing...
    goto frontend
)
timeout /t 2 /nobreak >nul
curl -s http://127.0.0.1:8000/api/health >nul 2>&1
if %errorlevel% neq 0 goto wait_loop
echo [OK] Backend running on http://127.0.0.1:8000

:frontend
echo [2/3] Starting frontend server (port 8080)...
start "" /min cmd /c "cd /d "%~dp0" && python -m http.server 8080 --bind 0.0.0.0"
timeout /t 2 /nobreak >nul
echo [OK] Frontend running on http://127.0.0.1:8080

echo [3/3] Opening browser...
start http://127.0.0.1:8080/owlstudy-app.html

echo.
echo ========================================
echo  Backend: http://127.0.0.1:8000
echo  Frontend: http://127.0.0.1:8080/owlstudy-app.html
echo ========================================
echo.
echo Close this window to stop.
pause >nul
