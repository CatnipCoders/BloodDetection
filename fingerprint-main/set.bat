@echo off
REM Setup script for backend (Windows)
REM - Creates a virtual environment named 'myenv' (if missing)
REM - Activates it and installs requirements from requirements.txt

SETLOCAL

REM Run from the fingerprint-main folder. Resolve script directory to be safe.
SET SCRIPT_DIR=%~dp0
PUSHD "%SCRIPT_DIR%"

REM Check if Python is available
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Python is not installed or not available in PATH.
    echo Install Python 3.8+ and ensure "python" is on your PATH.
    POPD
    EXIT /B 1
)

REM Use 'myenv' to match other scripts (start.bat expects myenv)
IF NOT EXIST "%SCRIPT_DIR%myenv\Scripts\activate.bat" (
    echo Creating virtual environment 'myenv'...
    python -m venv myenv
    IF %ERRORLEVEL% NEQ 0 (
        echo Failed to create virtual environment.
        POPD
        EXIT /B 1
    )
) ELSE (
    echo Virtual environment 'myenv' already exists. Skipping creation.
)

REM Activate the virtual environment
echo Activating virtual environment...
CALL "%SCRIPT_DIR%myenv\Scripts\activate.bat"
IF %ERRORLEVEL% NEQ 0 (
    echo Failed to activate virtual environment.
    POPD
    EXIT /B 1
)

REM Ensure requirements.txt exists in this folder
IF NOT EXIST "%SCRIPT_DIR%requirements.txt" (
    echo requirements.txt not found in %SCRIPT_DIR%
    echo Please create or copy requirements.txt into the fingerprint-main folder and re-run this script.
    POPD
    EXIT /B 1
)

REM Upgrade pip and install requirements via python -m pip to avoid PATH/pip script issues
echo Upgrading pip and installing dependencies from requirements.txt...
python -m pip install --upgrade pip
python -m pip install -r "%SCRIPT_DIR%requirements.txt"
IF %ERRORLEVEL% NEQ 0 (
    echo pip install reported an error. Check the output above.
    REM leave env active for debugging
    POPD
    PAUSE
    EXIT /B 1
)

echo Setup complete. Virtual environment 'myenv' created and dependencies installed.
echo To activate the environment in PowerShell run:
echo    .\myenv\Scripts\Activate.ps1
echo Or in cmd.exe run:
echo    .\myenv\Scripts\activate.bat

POPD
ENDLOCAL

PAUSE
