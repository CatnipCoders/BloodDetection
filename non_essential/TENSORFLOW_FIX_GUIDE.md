# TensorFlow DLL Fix Guide for Windows

## 🔴 Problem
```
Error: DLL load failed while importing _pywrap_tf2: The specified module could not be found.
```

This error occurs because TensorFlow requires the **Microsoft Visual C++ Redistributable** which is not installed on your system.

---

## ✅ Solution (Choose ONE method)

### Method 1: Automatic Fix (RECOMMENDED) ⚡

**Step 1:** Run the fix script
```cmd
cd fingerprint-main
fix_tensorflow.bat
```

This script will:
- Uninstall any existing TensorFlow
- Reinstall TensorFlow correctly
- Test the installation
- Open the VC++ download page if needed

**Step 2:** If the script fails, it will open a browser to download VC++ Redistributable
- Click "Download" and run the installer
- Restart your computer
- Run `fix_tensorflow.bat` again

---

### Method 2: Manual Fix (Step-by-Step) 📝

#### Step 1: Install Microsoft Visual C++ Redistributable

**Option A: Direct Download**
1. Download from: https://aka.ms/vs/17/release/vc_redist.x64.exe
2. Run the installer (requires admin rights)
3. Restart your computer

**Option B: Check if already installed**
1. Open "Add or Remove Programs" (Windows Settings)
2. Search for "Microsoft Visual C++ 2015-2022 Redistributable"
3. If not found, install using Option A above

#### Step 2: Reinstall TensorFlow

Open Command Prompt in the `fingerprint-main` folder:

```cmd
# Activate virtual environment
myenv\Scripts\activate

# Remove all TensorFlow versions
pip uninstall -y tensorflow tensorflow-intel tensorflow-cpu tensorflow-gpu

# Clear pip cache
pip cache purge

# Install TensorFlow for Intel CPUs (optimized for Windows)
pip install tensorflow-intel==2.15.0 --no-cache-dir

# Verify installation
python check_tensorflow.py
```

#### Step 3: Test TensorFlow

```cmd
python -c "import tensorflow as tf; print('TensorFlow version:', tf.__version__)"
```

If you see the version number without errors, it's working! ✅

---

### Method 3: Alternative TensorFlow Version 🔄

If the above methods don't work, try a different TensorFlow version:

```cmd
# Activate virtual environment
myenv\Scripts\activate

# Try TensorFlow 2.16.1 (newer)
pip uninstall -y tensorflow tensorflow-intel
pip install tensorflow-intel==2.16.1 --no-cache-dir

# OR try TensorFlow 2.13.0 (older, more stable)
pip uninstall -y tensorflow tensorflow-intel
pip install tensorflow-intel==2.13.0 --no-cache-dir
```

---

## 🧪 Verify Installation

After fixing, run these tests:

### Test 1: Import TensorFlow
```cmd
cd fingerprint-main
myenv\Scripts\activate
python check_tensorflow.py
```

Expected output:
```
✓ TensorFlow imported successfully!
  Version: 2.15.0
✓ Matrix multiplication test passed!
SUCCESS! TensorFlow is working correctly!
```

### Test 2: Start Flask Server
```cmd
cd fingerprint-main
start.bat
```

Expected output:
```
* Running on http://0.0.0.0:5000
Model loaded successfully
```

### Test 3: Test Prediction Endpoint
Open browser: http://localhost:5000/health

Expected response:
```json
{"status": "ok"}
```

---

## 🐛 Still Not Working?

### Issue 1: "Access Denied" when installing VC++ Redistributable
**Solution:** Run Command Prompt as Administrator
1. Right-click Command Prompt
2. Select "Run as administrator"
3. Install VC++ Redistributable again

### Issue 2: Multiple Python versions installed
**Solution:** Use the correct Python version
```cmd
# Check which Python is being used
where python

# Use specific Python version
py -3.10 -m venv myenv
myenv\Scripts\activate
pip install tensorflow-intel==2.15.0
```

### Issue 3: Antivirus blocking DLL files
**Solution:** Temporarily disable antivirus
1. Disable Windows Defender / Antivirus
2. Reinstall TensorFlow
3. Re-enable antivirus
4. Add Python folder to exclusions

### Issue 4: Corrupted Python installation
**Solution:** Reinstall Python
1. Uninstall Python from "Add or Remove Programs"
2. Download Python 3.10.x from https://www.python.org/downloads/
3. Install with "Add to PATH" checked
4. Recreate virtual environment:
   ```cmd
   cd fingerprint-main
   python -m venv myenv
   myenv\Scripts\activate
   pip install -r requirements.txt
   ```

---

## 📋 Quick Reference

### Required Software
- ✅ Python 3.8 - 3.11 (you have 3.10.5 ✓)
- ✅ Microsoft Visual C++ Redistributable 2015-2022 (x64)
- ✅ TensorFlow-Intel 2.15.0

### Important Commands
```cmd
# Check Python version
python --version

# Activate virtual environment
myenv\Scripts\activate

# Check TensorFlow
python check_tensorflow.py

# Fix TensorFlow
fix_tensorflow.bat

# Start server
start.bat
```

### Download Links
- **VC++ Redistributable:** https://aka.ms/vs/17/release/vc_redist.x64.exe
- **Python 3.10:** https://www.python.org/downloads/release/python-31011/
- **TensorFlow Docs:** https://www.tensorflow.org/install/pip

---

## 🎯 Expected Timeline

- **Method 1 (Automatic):** 5-10 minutes
- **Method 2 (Manual):** 10-15 minutes
- **Method 3 (Alternative):** 15-20 minutes

Most users succeed with Method 1 after installing VC++ Redistributable and restarting.

---

## ✅ Success Checklist

After fixing, you should be able to:
- [ ] Import TensorFlow without errors
- [ ] Run `python check_tensorflow.py` successfully
- [ ] Start Flask server with `start.bat`
- [ ] Access http://localhost:5000/health
- [ ] Upload fingerprint image and get blood group prediction

---

## 📞 Need More Help?

If none of these solutions work:

1. **Check the diagnostic output:**
   ```cmd
   python check_tensorflow.py > tensorflow_diagnostic.txt
   ```
   Share the `tensorflow_diagnostic.txt` file

2. **Check Flask logs:**
   Look for error messages when starting the server

3. **System Information:**
   - Windows version: Windows 10/11
   - Python version: 3.10.5
   - TensorFlow version: 2.15.0
   - Virtual environment: Active/Inactive

---

**Last Updated:** February 6, 2026  
**Status:** Ready to Fix! 🔧
