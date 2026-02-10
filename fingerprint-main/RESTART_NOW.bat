@echo off
echo Killing Flask...
taskkill /F /IM python.exe 2>nul
timeout /t 2 /nobreak >nul
echo.
echo Starting Flask with logging enabled...
cd /d %~dp0
start.bat
