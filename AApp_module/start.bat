@echo off
echo Blood Group Detection App
echo ========================
echo.

if not exist "node_modules" (
    echo Installing dependencies...
    cmd /c "npm install"
    echo.
)

echo Starting development server...
echo Open your browser to: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
echo ========================

cmd /k "npm run dev"
