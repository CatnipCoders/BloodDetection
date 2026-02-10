@echo off
color 0A
cls

echo ========================================================================
echo                    BLOOD GROUP DETECTION - NEXT STEPS
echo ========================================================================
echo.
echo Current Model Status:
echo   Accuracy: 72.83%% (Below target of 95%%)
echo   Status:   Model works but needs improvement
echo.
echo ========================================================================
echo                         CHOOSE YOUR PATH
echo ========================================================================
echo.
echo [1] USE CURRENT MODEL (Quick Test)
echo     - Ready immediately
echo     - 72%% accuracy
echo     - Good for testing features
echo     - Not production-ready
echo.
echo [2] RETRAIN MODEL (RECOMMENDED)
echo     - Takes 60-90 minutes
echo     - 95-97%% accuracy expected
echo     - Production-ready
echo     - All issues fixed
echo.
echo [3] ADVANCED TRAINING (Maximum Accuracy)
echo     - Takes 2-3 hours
echo     - 97-99%% accuracy expected
echo     - Ensemble of 3 models
echo     - Best possible results
echo.
echo [4] VIEW DETAILED STATUS REPORT
echo     - Read full analysis
echo     - See all options
echo     - Understand what happened
echo.
echo [5] EXIT
echo.
echo ========================================================================

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto use_current
if "%choice%"=="2" goto retrain
if "%choice%"=="3" goto advanced
if "%choice%"=="4" goto report
if "%choice%"=="5" goto end

echo Invalid choice. Please try again.
pause
goto start

:use_current
cls
echo ========================================================================
echo                      USING CURRENT MODEL (72%%)
echo ========================================================================
echo.
echo Starting Flask backend server...
echo.
echo After server starts:
echo   1. Open new terminal
echo   2. cd AApp_module
echo   3. npm run dev
echo   4. Open http://localhost:3000/scan
echo.
echo Press Ctrl+C to stop server
echo.
echo ========================================================================
echo.
call start.bat
goto end

:retrain
cls
echo ========================================================================
echo                    RETRAINING MODEL (60-90 minutes)
echo ========================================================================
echo.
echo This will:
echo   - Train for 150 epochs (100 + 50)
echo   - Use mixed precision (faster)
echo   - Apply better augmentation
echo   - Target 95-97%% accuracy
echo.
echo Your GPU: RTX 2060 6GB
echo Expected time: 60-90 minutes
echo.
echo The script will:
echo   1. Train the model
echo   2. Save to models/ folder
echo   3. Copy to project root
echo   4. Show results
echo.
echo ========================================================================
echo.
echo Activating virtual environment...
call myenv\Scripts\activate.bat
echo.
echo Starting improved training...
echo.
python train_improved.py
echo.
echo ========================================================================
echo                         TRAINING COMPLETE!
echo ========================================================================
echo.
echo Check the results above.
echo If accuracy is 95%%+, you're ready to use the model!
echo.
echo To start the server:
echo   1. Run: start.bat
echo   2. Open: http://localhost:3000/scan
echo.
pause
goto end

:advanced
cls
echo ========================================================================
echo                  ADVANCED ENSEMBLE TRAINING (2-3 hours)
echo ========================================================================
echo.
echo This will:
echo   - Train 3 different models
echo   - Combine predictions (ensemble)
echo   - Use test-time augmentation
echo   - Target 97-99%% accuracy
echo.
echo Your GPU: RTX 2060 6GB
echo Expected time: 2-3 hours
echo.
echo ========================================================================
echo.
echo Activating virtual environment...
call myenv\Scripts\activate.bat
echo.
echo Starting ensemble training...
echo.
python enhanced_training.py
echo.
echo ========================================================================
echo                         TRAINING COMPLETE!
echo ========================================================================
echo.
pause
goto end

:report
cls
echo ========================================================================
echo                      OPENING STATUS REPORT
echo ========================================================================
echo.
echo Opening CURRENT_STATUS.md in notepad...
echo.
start notepad CURRENT_STATUS.md
echo.
echo Report opened in notepad.
echo.
pause
goto start

:end
echo.
echo Goodbye!
timeout /t 2 >nul
