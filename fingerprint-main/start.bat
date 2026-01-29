@echo off
REM Start the backend Flask server (Windows .bat)
REM
REM This script activates the project's virtual environment (myenv) and runs the
REM Flask app located at src\app.py. You can optionally set MODEL_PATH and PORT
REM as environment variables before running this script. If not set, defaults are used.

SETLOCAL

REM Resolve script directory
SET SCRIPT_DIR=%~dp0

REM Activate virtual environment if present
IF EXIST "%SCRIPT_DIR%myenv\Scripts\activate.bat" (
  echo Activating virtual environment...
  CALL "%SCRIPT_DIR%myenv\Scripts\activate.bat"
) ELSE (
  echo Virtual environment not found at "%SCRIPT_DIR%myenv\Scripts\activate.bat"
  echo Create one with: python -m venv myenv
  echo Then run this script again.
  PAUSE
  EXIT /B 1
)

REM Set defaults if not provided
IF "%MODEL_PATH%"=="" SET MODEL_PATH=model_blood_group_detection_resnet.h5
IF "%PORT%"=="" SET PORT=5000

echo Starting backend with MODEL_PATH=%MODEL_PATH% PORT=%PORT%

REM Change to project directory and run the app
PUSHD "%SCRIPT_DIR%"
python src\app.py
IF ERRORLEVEL 1 (
  echo Server exited with error.
) ELSE (
  echo Server stopped.
)
POPD

ENDLOCAL

REM Keep the window open when double-clicked
PAUSE
