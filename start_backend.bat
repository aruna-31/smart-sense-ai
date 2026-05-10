@echo off
echo ============================================
echo   Smart Sense AI — Starting Local Backend
echo ============================================
echo.

cd /d "%~dp0backend"

:: Create virtual env if it doesn't exist
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

:: Activate and install deps
call venv\Scripts\activate
echo Installing dependencies...
pip install -r requirements.txt -q

echo.
echo Starting FastAPI backend on http://localhost:8001
echo API docs available at: http://localhost:8001/docs
echo.
echo Make sure Ollama is running: ollama serve
echo And model is pulled: ollama pull mistral
echo.

uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
