# SecuGen Hamster Pro 20 - Complete Setup Guide

## What You Need

### Hardware
- ✅ SecuGen Hamster Pro 20 fingerprint scanner
- ✅ USB cable (comes with scanner)
- ✅ Computer with USB port

### Software (Need to Install)
- ⚠️ SecuGen device drivers
- ⚠️ SecuGen Web API service
- ✅ Your Next.js application (already done)

---

## Step-by-Step Setup

### Step 1: Download SecuGen Software

#### Official SecuGen Website
1. Go to: **https://www.secugen.com/download/**
2. Find **"Web API"** section
3. Download for your OS:
   - **Windows**: `SecuGen_Web_API_Setup.exe`
   - **Linux**: `SecuGen_Web_API_Linux.tar.gz`
   - **Mac**: `SecuGen_Web_API_Mac.dmg`

#### Alternative: Developer Portal
1. Go to: **https://www.secugen.com/developers/**
2. Register for developer account (free)
3. Download SDK + Web API bundle

---

### Step 2: Install Device Drivers

#### Windows Installation

1. **Plug in** SecuGen scanner to USB port

2. **Auto-Install** (Windows 10/11):
   - Windows will detect device
   - Drivers install automatically
   - Wait for "Device is ready" notification

3. **Manual Install** (if auto-install fails):
   - Download: `SecuGen_Driver_Setup.exe`
   - Run installer as Administrator
   - Follow wizard
   - Restart computer

4. **Verify Installation**:
   - Press `Win + X` → Device Manager
   - Expand **Biometric Devices**
   - Look for: **"SecuGen Hamster Pro 20"**
   - Status: "This device is working properly" ✅

#### Linux Installation

```bash
# 1. Download drivers
wget https://www.secugen.com/downloads/SecuGen_Linux_SDK.tar.gz

# 2. Extract
tar -xzf SecuGen_Linux_SDK.tar.gz
cd SecuGen_Linux_SDK

# 3. Install dependencies
sudo apt-get update
sudo apt-get install libusb-1.0-0-dev build-essential

# 4. Install driver
sudo ./install.sh

# 5. Add USB permissions
sudo cp 99-secugen.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules
sudo udevadm trigger

# 6. Add user to plugdev group
sudo usermod -a -G plugdev $USER

# 7. Restart
sudo reboot

# 8. Verify
lsusb | grep SecuGen
# Should show: Bus XXX Device XXX: ID 1162:XXXX SecuGen
```

#### Mac Installation

```bash
# 1. Download Mac drivers from SecuGen
# 2. Open .dmg file
# 3. Run installer
# 4. Grant permissions:
#    System Preferences → Security & Privacy → Allow
# 5. Restart Mac

# 6. Verify
system_profiler SPUSBDataType | grep SecuGen
```

---

### Step 3: Install SecuGen Web API Service

This is the LOCAL SERVICE that runs on the user's computer and allows the browser to communicate with the scanner.

#### Windows Installation

1. **Download**:
   - File: `SecuGen_Web_API_Setup.exe`
   - Size: ~50MB
   - From: https://www.secugen.com/download/

2. **Install**:
   - Run `SecuGen_Web_API_Setup.exe` as Administrator
   - Click "Next" through wizard
   - Installation folder: `C:\Program Files\SecuGen\WebAPI`
   - Click "Install"
   - Wait for completion

3. **Service Auto-Starts**:
   - Service starts automatically after install
   - Runs on: `http://localhost:8443`

4. **Manual Start** (if needed):
   - Press `Win + R` → type `services.msc` → Enter
   - Find "SecuGen Web API Service"
   - Right-click → Start
   - Set Startup Type: Automatic

5. **Verify Service**:
   ```
   Open browser: http://localhost:8443/sgwebapi/info
   ```
   - Should show JSON response ✅
   - If error, service not running ❌

#### Linux Installation

```bash
# 1. Download
wget https://www.secugen.com/downloads/SecuGen_WebAPI_Linux.tar.gz

# 2. Extract
tar -xzf SecuGen_WebAPI_Linux.tar.gz
cd SecuGen_WebAPI

# 3. Install
sudo ./install.sh

# 4. Start service
sudo systemctl start secugen-webapi

# 5. Enable auto-start on boot
sudo systemctl enable secugen-webapi

# 6. Check status
sudo systemctl status secugen-webapi
# Should show: Active (running) ✅

# 7. Test
curl http://localhost:8443/sgwebapi/info
# Should return JSON ✅
```

#### Mac Installation

```bash
# 1. Download Web API for Mac (.dmg)
# 2. Install from .dmg file
# 3. Start service
sudo launchctl load /Library/LaunchDaemons/com.secugen.webapi.plist

# 4. Test
curl http://localhost:8443/sgwebapi/info
```

---

### Step 4: Test SecuGen Scanner

#### Test 1: Hardware Connection

**Windows - Device Manager**:
```
Win + X → Device Manager → Biometric Devices
Look for: "SecuGen Hamster Pro 20"
Status: Working properly ✅
```

**Linux - USB Check**:
```bash
lsusb | grep SecuGen
# Output: Bus 001 Device 005: ID 1162:0320 SecuGen Corp Hamster Pro 20
```

**Mac - System Profiler**:
```bash
system_profiler SPUSBDataType | grep -A 10 SecuGen
```

#### Test 2: Web API Service

**Open Browser**:
```
http://localhost:8443/sgwebapi/info
```

**Expected Response**:
```json
{
  "version": "1.0.0",
  "status": "running",
  "devices": [
    {
      "name": "Hamster Pro 20",
      "deviceID": 0,
      "width": 300,
      "height": 400,
      "dpi": 500
    }
  ]
}
```

If you see this JSON, Web API is working! ✅

#### Test 3: Capture Fingerprint

**Using Web API Test Page**:
```
http://localhost:8443/sgwebapi/test
```

1. Click "Capture Fingerprint" button
2. Place finger on scanner
3. LED lights up (green/blue)
4. Fingerprint image appears on screen

If image appears, scanner is fully working! ✅

**Using Command Line**:
```bash
# Test capture
curl -X POST http://localhost:8443/sgwebapi/capture
```

---

### Step 5: Configure Your Application

#### Update .env File

Edit `AApp_module/.env`:

```env
# Backend API
NEXT_PUBLIC_API_URL=https://backend-production-a970.up.railway.app/

# ESP32 Vitals Sensor
NEXT_PUBLIC_ESP32_API_URL=http://192.168.1.100/api/vitals

# SecuGen Web API (runs locally on user's machine)
NEXT_PUBLIC_SECUGEN_API_URL=http://localhost:8443

# Razorpay Payment
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_SWHipVRDOOPlV9

# Report Fee (in rupees)
NEXT_PUBLIC_REPORT_FEE=1

# Debug Mode
NEXT_PUBLIC_DEBUG=false
```

#### Restart Your Application

```bash
cd AApp_module

# Stop current server (Ctrl+C)

# Start fresh
npm run dev
```

---

### Step 6: Test in Your Application

1. **Open Application**:
   ```
   http://localhost:3000/scan
   ```

2. **Check Scanner Status**:
   - Should show: "SecuGen Hamster Pro 20 Connected" ✅
   - Device info: "Hamster Pro 20 (300x400)"

3. **Scan Fingerprint**:
   - Click "Start Scanning"
   - Place finger on scanner
   - LED lights up
   - Blood group detected
   - Confidence score shown

---

## Troubleshooting

### Issue 1: "SecuGen scanner not detected"

**Causes**:
- Scanner not plugged in
- Drivers not installed
- Web API service not running
- USB port issue

**Solutions**:
```bash
# 1. Check USB connection
# Unplug and replug scanner

# 2. Check Device Manager (Windows)
Win + X → Device Manager → Biometric Devices
# Should see "SecuGen Hamster Pro 20"

# 3. Check service
# Open: http://localhost:8443/sgwebapi/info
# Should return JSON

# 4. Restart service (Windows)
Win + R → services.msc
Find "SecuGen Web API Service" → Restart

# 5. Restart service (Linux)
sudo systemctl restart secugen-webapi
```

### Issue 2: "Failed to capture fingerprint"

**Causes**:
- Finger not placed properly
- Scanner dirty
- Timeout
- Permission issue

**Solutions**:
1. **Clean scanner**: Use soft cloth
2. **Clean finger**: Dry and clean
3. **Press firmly**: Ensure good contact
4. **Wait**: Give it 5-10 seconds
5. **Try different finger**: Index or thumb work best

### Issue 3: "Web API not responding"

**Check if service is running**:

**Windows**:
```
Win + R → services.msc
Look for: "SecuGen Web API Service"
Status should be: Running
```

**Linux**:
```bash
sudo systemctl status secugen-webapi
# Should show: Active (running)

# If not running:
sudo systemctl start secugen-webapi
```

**Test manually**:
```bash
curl http://localhost:8443/sgwebapi/info
```

### Issue 4: "ERR_CONNECTION_REFUSED"

**Cause**: Web API service not running

**Solution**:
```bash
# Windows
services.msc → Start "SecuGen Web API Service"

# Linux
sudo systemctl start secugen-webapi

# Mac
sudo launchctl load /Library/LaunchDaemons/com.secugen.webapi.plist
```

### Issue 5: "CORS Error" or "Mixed Content"

**Cause**: HTTPS site trying to access HTTP localhost

**Solution**: Already handled in your code with environment detection!
- Local mode: Scanner works
- Hosted mode: Upload image instead

---

## Production Deployment

### Important: Scanner Only Works Locally!

SecuGen scanner **CANNOT** work on hosted/production sites because:
1. Scanner is physically connected to user's computer
2. Web API runs on `localhost` (user's machine)
3. Hosted site cannot access user's localhost

### Solution: Hybrid Approach (Already Implemented)

Your code already handles this:

**Local Development** (localhost:3000):
- ✅ Scanner works
- ✅ Direct capture from device

**Production** (hosted site):
- ❌ Scanner disabled (expected)
- ✅ Image upload works
- ✅ Clear user guidance

### For End Users

**Option 1: Image Upload** (Works Everywhere)
1. Capture fingerprint using SecuGen software
2. Save as BMP/PNG image
3. Upload to website

**Option 2: Run Locally** (Scanner Works)
1. Clone your repository
2. Run: `npm run dev`
3. Access: `http://localhost:3000`
4. Scanner works directly

**Option 3: Desktop App** (Future Enhancement)
- Build Electron/Tauri app
- Package with SecuGen integration
- Distribute to users
- Scanner works in app

---

## ESP32 Connection (Bonus)

You also have ESP32 for vital signs. Here's how to connect:

### ESP32 Setup

1. **Upload Firmware**:
   ```
   Open: esp32 code/hospital_grade_esp32_max30102.ino
   Arduino IDE → Upload to ESP32
   ```

2. **Configure WiFi**:
   Edit `esp32 code/config.h`:
   ```cpp
   #define WIFI_SSID "YourWiFiName"
   #define WIFI_PASSWORD "YourPassword"
   ```

3. **Get IP Address**:
   - Open Serial Monitor (115200 baud)
   - ESP32 will print IP: `192.168.1.XXX`

4. **Update .env**:
   ```env
   NEXT_PUBLIC_ESP32_API_URL=http://192.168.1.XXX/api/vitals
   ```

5. **Test**:
   ```
   Open: http://192.168.1.XXX/api/vitals
   Should return: {"heartRate": 75, "spo2": 98, ...}
   ```

---

## Quick Reference

### URLs to Remember

| Service | URL | Purpose |
|---------|-----|---------|
| SecuGen Web API | http://localhost:8443 | Scanner service |
| SecuGen Info | http://localhost:8443/sgwebapi/info | Check status |
| SecuGen Test | http://localhost:8443/sgwebapi/test | Test capture |
| Your App | http://localhost:3000 | Next.js app |
| Scan Page | http://localhost:3000/scan | Fingerprint scan |
| ESP32 API | http://192.168.1.XXX/api/vitals | Vital signs |

### Service Commands

**Windows**:
```
services.msc → "SecuGen Web API Service" → Start/Stop/Restart
```

**Linux**:
```bash
sudo systemctl start secugen-webapi    # Start
sudo systemctl stop secugen-webapi     # Stop
sudo systemctl restart secugen-webapi  # Restart
sudo systemctl status secugen-webapi   # Check status
```

**Mac**:
```bash
sudo launchctl load /Library/LaunchDaemons/com.secugen.webapi.plist    # Start
sudo launchctl unload /Library/LaunchDaemons/com.secugen.webapi.plist  # Stop
```

---

## Summary

### What You Need to Do:

1. ✅ **Buy/Have**: SecuGen Hamster Pro 20 scanner
2. ⚠️ **Download**: SecuGen Web API from https://www.secugen.com/download/
3. ⚠️ **Install**: Drivers + Web API service
4. ⚠️ **Start**: Web API service (auto-starts after install)
5. ⚠️ **Test**: http://localhost:8443/sgwebapi/info
6. ✅ **Configure**: Update `.env` file (already done)
7. ✅ **Run**: `npm run dev` in AApp_module
8. ✅ **Scan**: Go to http://localhost:3000/scan

### Your Code is Ready!

Your application already has:
- ✅ SecuGen SDK integration (`lib/secugen-sdk.ts`)
- ✅ Scanner component (`components/fingerprint-scanner.tsx`)
- ✅ Scan page (`app/scan/page.tsx`)
- ✅ Environment detection (local vs hosted)
- ✅ Image upload fallback

You just need to install the SecuGen software!

---

## Need Help?

### SecuGen Support
- Website: https://www.secugen.com/
- Downloads: https://www.secugen.com/download/
- Developers: https://www.secugen.com/developers/
- Support: support@secugen.com

### Your Implementation
- Setup guide: `SECUGEN_SETUP_GUIDE.md`
- Integration: `SECUGEN_INTEGRATION_SUMMARY.md`
- Production fix: `SECUGEN_PRODUCTION_FIX.md`
- Issue resolved: `SECUGEN_ISSUE_RESOLVED.md`

---

**Status**: 📋 Setup guide complete
**Next Step**: Download and install SecuGen Web API
**Download Link**: https://www.secugen.com/download/
