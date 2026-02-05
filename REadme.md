Running the project (Windows)

This repository contains two main parts:

- Backend (Flask + TensorFlow model) in `fingerprint-main`
- Frontend (Next.js + TypeScript) in `AApp_module`

Quick start — backend

1. Create and activate the Python virtual environment and install dependencies:

**Recommended: Use the setup script**

```cmd
cd fingerprint-main
set.bat
```

The script will:
- Check for Python installation
- Create a virtual environment named `myenv`
- Activate it
- Upgrade pip
- Install all packages from `requirements.txt`

**Test your setup:**

```cmd
test_setup.bat
```

This will verify all components are properly installed.

**Manual setup (if script fails):**

```powershell
cd fingerprint-main
python -m venv myenv
myenv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

**Troubleshooting:**

If you encounter issues, see `fingerprint-main/SETUP_TROUBLESHOOTING.md` for detailed solutions.

2. Start the backend server:

```cmd
start.bat
```

Or manually:

```cmd
myenv\Scripts\activate
python src\app.py
```


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

## Health Report System

The application now includes a comprehensive health report generation system that analyzes vital signs and blood group data to provide:

- **Personalized Health Analysis**: Evaluates SpO2, heart rate, and perfusion index
- **Critical Alerts**: Automatic warnings for dangerous health conditions
- **Blood Group Information**: Compatibility, dietary recommendations, and health considerations
- **Actionable Recommendations**: Specific advice based on your health status
- **PDF Export**: Professional medical reports you can share with doctors

### Quick Start

1. **Monitor Vitals**: Go to "Vital Signs Monitor" and place finger on ESP32 sensor
2. **Scan Blood Group**: Go to "Scan Fingerprint" to detect your blood group
3. **Generate Report**: Click "Generate Health Report" from either page
4. **Download PDF**: Save your report for medical records

For detailed instructions, see `AApp_module/REPORT_QUICKSTART.md`

### Report Features

- ✅ Real-time vital signs analysis
- ✅ Severity classification (Normal/Warning/Critical)
- ✅ Emergency alerts for critical conditions
- ✅ Blood type-specific dietary advice
- ✅ Personalized health recommendations
- ✅ Safety precautions and lifestyle tips
- ✅ Professional PDF export

See `HEALTH_REPORT_SYSTEM.md` for complete documentation.

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