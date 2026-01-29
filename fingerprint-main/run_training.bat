@echo off
REM Enhanced Blood Group Detection Training Script (Windows)
REM Run this on your local machine

echo ========================================
echo Blood Group Detection - Enhanced Training
echo ========================================

REM Activate virtual environment if exists
if exist myenv\Scripts\activate.bat (
    call myenv\Scripts\activate.bat
)

REM Install requirements
echo Installing dependencies...
pip install -r requirements_enhanced.txt

REM Run training
echo Starting training...
python enhanced_training.py

echo ========================================
echo Training Complete!
echo ========================================
pause
