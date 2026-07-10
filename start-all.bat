@echo off
echo Starting AI Study Assistant...
echo.

REM Start backend server
echo [1/2] Starting backend server on port 8000...
cd /d "%~dp0ai-tutor-backend"
start "Backend Server" cmd /k ".venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 3 /nobreak >nul

REM Start frontend proxy server (handles API forwarding)
echo [2/2] Starting frontend proxy server on port 8080...
cd /d "%~dp0ai-tutor-frontend"
start "Frontend Proxy Server" cmd /k "python proxy-server.py"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo Servers started successfully!
echo ========================================
echo Backend API: http://localhost:8000
echo Frontend App: http://localhost:8080
echo ========================================
echo.
echo Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost:8080
