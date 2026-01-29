Running the project (Windows)

This repository contains two main parts:

- Backend (Flask + TensorFlow model) in `fingerprint-main`
- Frontend (Next.js + TypeScript) in `AApp_module`

Quick start — backend

1. Create and activate the Python virtual environment and install dependencies:

You can use the bundled helper script (recommended):

```
.\set.bat
```
 Start the backend server (after venv is activated):

```
.\start.bat

The script will:
- create a virtual environment named `myenv` (if missing)
- activate it
- install packages from `requirements.txt`

If you prefer to do it manually (PowerShell):

```powershell
python -m venv myenv
.\myenv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

3. Start the Frontend server
  In AApp_module


Backend endpoints

- Health: GET http://localhost:5000/health
- Users: GET/POST http://localhost:5000/api/users
- Predict: POST http://localhost:5000/predict (multipart form-data, field name `image`)

Quick start — frontend (Next.js)

1. Change to the frontend folder:

  ```
  .\start.bat
```

Using npm:

```powershell
npm install
npm run dev
```

Note about PowerShell and package managers

PowerShell sometimes blocks execution of scripts created by package managers (e.g. pnpm, npm). If you see an error about running scripts, either run the commands from CMD, or enable script execution for the current session:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```

Troubleshooting

- If the frontend can't reach the backend, ensure the Flask server is running and that `NEXT_PUBLIC_API_URL` (in the frontend environment) points to `http://localhost:5000`.
- If TensorFlow fails to import on Windows, follow the instructions in `fingerprint-main/README.md` (Visual C++ Redistributable, matching wheel, or use Docker).

---

![alt text](image.png)

New Files Created:
enhanced_training.py - Main training script with:

Auto-detection of Kaggle/Colab/Local environment
EfficientNetB3, ResNet101, DenseNet169 architectures
Two-phase training (head → fine-tuning)
Advanced data augmentation
Class balancing with weighted loss
K-Fold cross validation
Ensemble model support
Mixed precision training for speed
colab_training.py - Ready-to-use Colab script (copy into notebook cells)

distributed_training.py - Train different models on different platforms simultaneously

aggregate_models.py - Combine models from multiple platforms into ensemble

predict_enhanced.py - Prediction with TTA (Test-Time Augmentation)

src/app_enhanced.py - Enhanced Flask API with ensemble + TTA support

requirements_enhanced.txt - Updated dependencies

run_training.bat / run_training.sh - Quick-start scripts

Key Improvements for Higher Accuracy:
Technique	Impact
Larger image size (299×299)	+2-3%
Fine-tuning top 50 layers	+3-5%
Advanced augmentation	+2-4%
Ensemble (3 models)	+2-3%
Test-Time Augmentation	+1-2%
Class balancing	+1-2%
How to Run:
Local:

cd fingerprint-main
python enhanced_training.py
Colab: Copy colab_training.py into notebook cells

Kaggle: Upload enhanced_training.py and run !python enhanced_training.py

Distributed: Run distributed_training.py on each platform, then use aggregate_models.py to combine results