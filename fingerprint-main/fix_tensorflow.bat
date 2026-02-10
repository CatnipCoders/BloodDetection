@echo off
echo ========================================
echo TensorFlow DLL Fix Script
echo ========================================
echo.

echo [1/4] Checking Python version...
python --version
echo.

echo [2/4] Activating virtual environment...
if exist myenv\Scripts\activate.bat (
    call myenv\Scripts\activate.bat
    echo Virtual environment activated
) else (
    echo ERROR: Virtual environment not found!
    echo Please run set.bat first to create the environment
    pause
    exit /b 1
)
echo.

echo [3/4] Uninstalling current TensorFlow...
pip uninstall -y tensorflow tensorflow-intel tensorflow-cpu tensorflow-gpu
echo.

echo [4/4] Installing compatible TensorFlow...
echo Installing tensorflow-intel 2.15.0 (optimized for Intel CPUs on Windows)
pip install tensorflow-intel==2.15.0 --no-cache-dir
echo.

echo ========================================
echo Testing TensorFlow installation...
echo ========================================
python -c "import tensorflow as tf; print('TensorFlow version:', tf.__version__); print('GPU available:', tf.config.list_physical_devices('GPU'))"
echo.

if %ERRORLEVEL% EQU 0 (
    echo ========================================
    echo SUCCESS! TensorFlow is working!
    echo ========================================
    echo.
    echo You can now start the server with: start.bat
) else (
    echo ========================================
    echo FAILED! Additional steps needed...
    echo ========================================
    echo.
    echo Please install Microsoft Visual C++ Redistributable:
    echo 1. Download from: https://aka.ms/vs/17/release/vc_redist.x64.exe
    echo 2. Run the installer
    echo 3. Restart your computer
    echo 4. Run this script again
    echo.
    echo Opening download page in browser...
    start https://aka.ms/vs/17/release/vc_redist.x64.exe
)

echo.
pause
