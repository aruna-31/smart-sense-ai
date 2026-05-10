@echo off
echo ============================================
echo   Smart Sense AI — Starting Frontend
echo ============================================
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo Installing npm packages...
    npm install
)

echo Starting Vite dev server on http://localhost:3000
echo.
npm run dev
