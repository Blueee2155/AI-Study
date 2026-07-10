@echo off
cd /d "%~dp0"

if not exist ai-tutor-backend\.venv\Scripts\python.exe (
    echo [1/3] Creating virtual environment...
    python -m venv ai-tutor-backend\.venv
)

echo [2/3] Installing dependencies...
call ai-tutor-backend\.venv\Scripts\python.exe -m pip install -r ai-tutor-backend\requirements.txt -q
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies ready

echo [3/3] Starting server on http://127.0.0.1:8000
cd /d "%~dp0ai-tutor-backend"
..\ai-tutor-backend\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000

if %errorlevel% neq 0 (
    echo [ERROR] Failed to start
    pause
)
