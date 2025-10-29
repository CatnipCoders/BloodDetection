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
