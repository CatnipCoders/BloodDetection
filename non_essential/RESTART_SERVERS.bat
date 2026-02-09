@echo off
color 0A
cls

echo ========================================================================
echo                    RESTARTING SERVERS AFTER FIX
echo ========================================================================
echo.
echo This will restart both backend and frontend servers to apply the
echo prediction caching fix.
echo.
echo ========================================================================
echo.

echo [1/4] Stopping any running Python processes...
taskkill /F /IM python.exe 2>nul
if %errorlevel% equ 0 (
    echo     ✓ Stopped Python processes
) else (
    echo     ℹ No Python processes were running
)
echo.

echo [2/4] Stopping any running Node processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo     ✓ Stopped Node processes
) else (
    echo     ℹ No Node processes were running
)
echo.

echo [3/4] Starting Flask backend server...
echo.
echo     Opening new terminal for backend...
start "Flask Backend" cmd /k "cd /d %~dp0 && myenv\Scripts\activate && python src\app.py"
echo     ✓ Backend starting in new window
echo     ✓ Wait for: "Running on http://127.0.0.1:5000"
echo.

timeout /t 3 /nobreak >nul

echo [4/4] Starting Next.js frontend server...
echo.
echo     Opening new terminal for frontend...
start "Next.js Frontend" cmd /k "cd /d %~dp0\..\AApp_module && npm run dev"
echo     ✓ Frontend starting in new window
echo     ✓ Wait for: "Ready on http://localhost:3000"
echo.

echo ========================================================================
echo                         SERVERS RESTARTED!
echo ========================================================================
echo.
echo Two new terminal windows have opened:
echo   1. Flask Backend  - http://localhost:5000
echo   2. Next.js Frontend - http://localhost:3000
echo.
echo Wait for both servers to fully start, then:
echo   1. Open: http://localhost:3000/scan
echo   2. Upload a fingerprint image
echo   3. Note the prediction
echo   4. Click "Scan Again"
echo   5. Upload a DIFFERENT image
echo   6. Verify you get a DIFFERENT prediction
echo.
echo ========================================================================
echo.
echo To test automatically, run:
echo   python test_prediction_caching.py
echo.
echo ========================================================================
echo.

pause
