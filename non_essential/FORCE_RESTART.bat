@echo off
color 0C
cls

echo ========================================================================
echo                    FORCE RESTART - KILL ALL PROCESSES
echo ========================================================================
echo.
echo This will forcefully stop all Python and Node processes and restart
echo the servers with the updated code.
echo.
echo ========================================================================
echo.

echo [1/5] Killing all Python processes...
taskkill /F /IM python.exe 2>nul
if %errorlevel% equ 0 (
    echo     ✓ Killed Python processes
    timeout /t 2 /nobreak >nul
) else (
    echo     ℹ No Python processes were running
)
echo.

echo [2/5] Killing all Node processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo     ✓ Killed Node processes
    timeout /t 2 /nobreak >nul
) else (
    echo     ℹ No Node processes were running
)
echo.

echo [3/5] Waiting for processes to fully terminate...
timeout /t 3 /nobreak >nul
echo     ✓ Wait complete
echo.

echo [4/5] Starting Flask backend with NEW CODE...
echo.
echo     Opening new terminal for backend...
start "Flask Backend - NEW CODE" cmd /k "cd /d %~dp0 && echo Starting Flask with updated code... && myenv\Scripts\activate && python src\app.py"
echo     ✓ Backend starting in new window
echo     ✓ Wait for detailed logs with image hashes
echo.

timeout /t 5 /nobreak >nul

echo [5/5] Starting Next.js frontend...
echo.
echo     Opening new terminal for frontend...
start "Next.js Frontend" cmd /k "cd /d %~dp0\..\AApp_module && echo Starting Next.js... && npm run dev"
echo     ✓ Frontend starting in new window
echo.

echo ========================================================================
echo                         RESTART COMPLETE!
echo ========================================================================
echo.
echo Two new terminal windows have opened with UPDATED CODE:
echo   1. Flask Backend  - Check for detailed logs!
echo   2. Next.js Frontend
echo.
echo VERIFY THE FIX:
echo   Look at Flask terminal - you should now see:
echo   ✓ "Received image: ..., hash: xxxxxxxx"
echo   ✓ "Image stats - min: ... max: ... mean: ... std: ..."
echo   ✓ "Running prediction for image hash: xxxxxxxx..."
echo   ✓ "Prediction result: ... for hash: xxxxxxxx"
echo.
echo If you DON'T see these detailed logs, the old code is still running!
echo.
echo ========================================================================
echo.

pause
