python -m venv myenv
myenv\Scripts\activate 
pip install -r requirements.txt

## TensorFlow DLL import error ("DLL load failed while importing _pywrap_tensorflow_internal")

If you see an error like:

```
ImportError: DLL load failed while importing _pywrap_tensorflow_internal: A dynamic link library (DLL) initialization routine failed.

Failed to load the native TensorFlow runtime.
See https://www.tensorflow.org/install/errors for some common causes and solutions.
```

This typically means the native (C/C++) TensorFlow runtime could not be loaded by Python. Common causes and fixes:

- Mismatched Python / wheel ABI: make sure the installed `tensorflow` wheel supports your exact Python version and OS (Windows x86_64). Check `python -V` and run `pip debug --verbose` to inspect your environment. If the wheel doesn't match, reinstall a compatible TensorFlow wheel (see https://pypi.org/project/tensorflow/).

- Missing Microsoft Visual C++ Redistributable: On Windows, TensorFlow requires the Microsoft Visual C++ Redistributable (2015-2022). Install the latest x64 redistributable from https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist and reboot.

- GPU/CUDA driver issues (only relevant if using GPU build): If you installed a GPU-enabled TensorFlow, the proper NVIDIA drivers, CUDA toolkit, and cuDNN versions must be installed and match the TensorFlow release. See the TensorFlow GPU support matrix: https://www.tensorflow.org/install/source#gpu

- CPU instruction support (AVX): Official TF wheels assume certain CPU instruction support. Older CPUs without AVX may fail to load the wheel. In that case either use a wheel built without those instruction sets or run TF in Docker/Conda where a compatible build is available.

- Corrupted or partial install: try reinstalling in a clean virtual environment:

```powershell
# from project root
.\myenv\Scripts\Activate.ps1
python -m pip install --upgrade pip setuptools wheel
pip uninstall -y tensorflow
pip cache purge
pip install tensorflow==2.20.0
```

If the install still fails, try creating a fresh Conda environment (miniconda/Anaconda) and install TensorFlow there — Conda often reduces native dependency issues on Windows.

## Running the project as a service (so frontend can connect)

I added a minimal Flask server that loads a saved Keras model and serves a prediction endpoint. This makes it easy for a frontend to call the model over HTTP on a configurable port.

Files added:

- `src/app.py` — small Flask app with `/health` and `/predict` (POST) endpoints.

Quick steps to run the server

1. Activate your virtualenv from project root:

```powershell
.\myenv\Scripts\Activate.ps1
```

2. Install dependencies (includes Flask and Pillow):

```powershell
pip install -r requirements.txt
```

3. (Optional) Set environment variables (defaults shown):

```powershell
# path to the saved model file (Keras .h5 or .keras) - default: model_blood_group_detection_resnet.h5
setx MODEL_PATH model_blood_group_detection_resnet.h5
# port to run server on (default 5000)
setx PORT 5000
```

4. Run the server:

```powershell
python src/app.py
```

5. Frontend example requests

- Health check (GET): http://localhost:5000/health

- Prediction (POST): send a multipart/form-data request with key `image` containing the image file. Response is JSON: `{ "label": "A+", "confidence": 0.98 }`.

If TensorFlow fails to import when starting the server, follow the troubleshooting steps above. As an alternative to local install, consider running the model inside Docker using an official TensorFlow image (this avoids many Windows native dependency problems).

## Next steps / Help

If you'd like, I can:
- Run a syntax check on the converted `.py` files and fix small issues.
- Refactor the Flask app into a more production-ready API (Dockerfile, gunicorn, health checks, logging).
- Add authentication and CORS rules so your frontend (on another origin) can call the API securely.

Tell me which next step you'd like and I will proceed.
