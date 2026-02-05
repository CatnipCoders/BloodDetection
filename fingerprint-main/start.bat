@echo off
REM ============================================================================
REM Start Backend Flask Server (Windows)
REM ============================================================================
REM This script will:
REM - Activate the virtual environment
REM - Set environment variables (MODEL_PATH, PORT)
REM - Start the Flask backend server
REM ============================================================================

echo.
echo ========================================
echo  Starting Backend Server
echo ========================================
echo.

REM Get the directory where this script is located
SET "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM ============================================================================
REM Step 1: Check if virtual environment exists
REM ============================================================================
echo [1/3] Checking virtual environment...
IF NOT EXIST "myenv\Scripts\activate.bat" (
    echo.
    echo [ERROR] Virtual environment not found!
    echo.
    echo Please run 'set.bat' first to create the virtual environment.
    echo.
    pause
    exit /b 1
)
echo Virtual environment found.
echo.

REM ============================================================================
REM Step 2: Activate virtual environment
REM ============================================================================
echo [2/3] Activating virtual environment...
CALL myenv\Scripts\activate.bat
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to activate virtual environment!
    echo.
    echo Try running 'set.bat' again to recreate the environment.
    echo.
    pause
    exit /b 1
)
echo Virtual environment activated.
echo.

REM ============================================================================
REM Step 3: Set environment variables and start server
REM ============================================================================
echo [3/3] Starting Flask server...
echo.

REM Set default values if not already set
IF "%MODEL_PATH%"=="" (
    SET "MODEL_PATH=model_blood_group_detection_resnet.h5"
    echo Using default MODEL_PATH: %MODEL_PATH%
) ELSE (
    echo Using custom MODEL_PATH: %MODEL_PATH%
)

IF "%PORT%"=="" (
    SET "PORT=5000"
    echo Using default PORT: %PORT%
) ELSE (
    echo Using custom PORT: %PORT%
)

echo.
echo ========================================
echo  Server Configuration
echo ========================================
echo  Model: %MODEL_PATH%
echo  Port:  %PORT%
echo  URL:   http://localhost:%PORT%
echo ========================================
echo.
echo Server is starting...
echo Press Ctrl+C to stop the server
echo.

REM Start the Flask application
python src\app.py

REM Check exit code
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo  Server Stopped with Error
    echo ========================================
    echo.
    echo Common issues:
    echo  1. Model file not found
    echo     - Check if %MODEL_PATH% exists
    echo     - Train a model or download pre-trained weights
    echo.
    echo  2. Port already in use
    echo     - Another application is using port %PORT%
    echo     - Set a different port: SET PORT=5001
    echo     - Then run start.bat again
    echo.
    echo  3. TensorFlow import error
    echo     - Install Visual C++ Redistributable
    echo     - Download: https://aka.ms/vs/17/release/vc_redist.x64.exe
    echo.
    echo  4. Missing dependencies
    echo     - Run 'set.bat' again to reinstall packages
    echo.
) ELSE (
    echo.
    echo ========================================
    echo  Server Stopped Normally
    echo ========================================
    echo.
)

pause
