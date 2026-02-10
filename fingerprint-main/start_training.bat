@echo off
echo ========================================
echo Blood Group Detection - Model Training
echo ========================================
echo.

echo Checking environment...
if not exist myenv\Scripts\activate.bat (
    echo ERROR: Virtual environment not found!
    echo Please run set.bat first to create the environment
    pause
    exit /b 1
)

echo Activating virtual environment...
call myenv\Scripts\activate.bat
echo.

echo ========================================
echo Training Options:
echo ========================================
echo.
echo 1. GPU-Optimized Training (RECOMMENDED FOR YOUR RTX 2060)
echo    - Optimized for RTX 2060 6GB
echo    - Time: 45-90 minutes
echo    - Expected accuracy: 95-97%%
echo    - Batch size: 32 (GPU accelerated)
echo.
echo 2. Standard Optimized Training
echo    - Works on CPU or GPU
echo    - Time: 2-4 hours (CPU) or 1-2 hours (GPU)
echo    - Expected accuracy: 92-97%%
echo.
echo 3. Enhanced Training (Ensemble)
echo    - Multiple models for maximum accuracy
echo    - Time: 2-3 hours (GPU) or 6-12 hours (CPU)
echo    - Expected accuracy: 95-99%%
echo.
echo 4. Basic Training (Fast)
echo    - Quick training for testing
echo    - Time: 30-60 minutes
echo    - Expected accuracy: 85-90%%
echo.
echo 5. Cancel
echo.

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" (
    echo.
    echo Starting GPU-Optimized Training...
    echo ========================================
    echo.
    echo Your Hardware:
    echo   CPU: Intel i5-12400F
    echo   GPU: RTX 2060 6GB
    echo   RAM: 16GB DDR5
    echo.
    echo Optimizations:
    echo   - Batch size: 32 (GPU accelerated)
    echo   - Mixed precision training (float16)
    echo   - Memory growth enabled
    echo   - Expected time: 45-90 minutes
    echo.
    python train_gpu_optimized.py
    goto :end
)

if "%choice%"=="2" (
    echo.
    echo Starting Standard Optimized Training...
    echo ========================================
    echo.
    python train_optimized.py
    goto :end
)

if "%choice%"=="3" (
    echo.
    echo Starting Enhanced Training...
    echo ========================================
    echo.
    python enhanced_training.py
    goto :end
)

if "%choice%"=="4" (
    echo.
    echo Starting Basic Training...
    echo ========================================
    echo.
    python src\train.py
    goto :end
)

if "%choice%"=="5" (
    echo.
    echo Training cancelled.
    goto :end
)

echo.
echo Invalid choice. Please run the script again.

:end
echo.
echo ========================================
echo.
pause
