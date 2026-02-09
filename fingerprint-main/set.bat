@echo off
echo.
echo ========================================
echo  Backend Setup - Blood Group Detection
echo ========================================
echo.

cd /d "%~dp0"

echo [1/6] Checking Python installation...
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

echo [2/6] Creating virtual environment...
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

echo [3/6] Activating virtual environment...
call myenv\Scripts\activate.bat
if errorlevel 1 (
    echo [ERROR] Failed to activate!
    pause
    exit /b 1
)
echo Activated.
echo.

echo [4/6] Upgrading pip...
python -m pip install --upgrade pip setuptools wheel
echo.

echo [5/6] Installing dependencies...
echo This may take 2-5 minutes...
echo.
pip install --no-cache-dir -r requirements.txt
if errorlevel 1 (
    echo.
    echo [WARNING] Some packages failed. Trying alternative installation...
    echo.
    pip install numpy==1.26.4
    pip install tensorflow-intel==2.15.0
    pip install Flask Pillow flask-cors requests pandas scikit-learn matplotlib seaborn
    if errorlevel 1 (
        echo.
        echo [ERROR] Installation failed!
        echo.
        echo Install Visual C++ Redistributable:
        echo https://aka.ms/vs/17/release/vc_redist.x64.exe
        echo.
        pause
        exit /b 1
    )
)
echo.

echo [6/6] Testing TensorFlow...
python -c "import tensorflow as tf; print('TensorFlow:', tf.__version__)" 2>nul
if errorlevel 1 (
    echo [WARNING] TensorFlow import failed!
    echo Installing tensorflow-intel...
    pip install --upgrade tensorflow-intel==2.15.0
)
echo.

echo Initializing database...
python -c "from src.db import init_db; init_db(); print('Database ready')" 2>nul
if errorlevel 1 (
    echo [INFO] Database will be initialized on first run
)
echo.

echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo Run 'start.bat' to start the server.
echo.
pause
