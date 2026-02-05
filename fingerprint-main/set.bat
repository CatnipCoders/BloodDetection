@echo off
echo.
echo ========================================
echo  Backend Setup - Blood Group Detection
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] Checking Python installation...
python --version 2>nul
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH!
    echo.
    echo Install Python 3.8+ from: https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)
python --version
echo.

echo [2/5] Creating virtual environment...
if exist myenv\Scripts\activate.bat (
    echo Virtual environment already exists.
) else (
    echo Creating 'myenv'...
    python -m venv myenv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment!
        echo Try: python -m pip install --upgrade pip setuptools
        pause
        exit /b 1
    )
    echo Created successfully.
)
echo.

echo [3/5] Activating virtual environment...
call myenv\Scripts\activate.bat
if errorlevel 1 (
    echo [ERROR] Failed to activate!
    pause
    exit /b 1
)
echo Activated.
echo.

echo [4/5] Checking requirements.txt...
if not exist requirements.txt (
    echo [ERROR] requirements.txt not found!
    pause
    exit /b 1
)
echo Found.
echo.

echo [5/5] Installing dependencies...
echo This may take 2-5 minutes...
echo.
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo [ERROR] Installation failed!
    echo.
    echo Common fix: Install Visual C++ Redistributable
    echo https://aka.ms/vs/17/release/vc_redist.x64.exe
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo Run 'start.bat' to start the server.
echo.
pause
