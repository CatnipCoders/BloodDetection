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

#### Option A: Official SecuGen Website
1. Go to: https://www.secugen.com/download/
2. Find **"Web API"** section
3. Download for your OS:
   - **Windows**: SecuGen_Web_API_Setup.exe
   - **Linux**: SecuGen_Web_API_Linux.tar.gz
   - **Mac**: SecuGen_Web_API_Mac.dmg

#### Option B: SecuGen Developer Portal
1. Go to: https://www.secugen.com/developers/
2. Register for developer account (free)
3. Download SDK + Web API bundle

---

### Step 2: Install Device Drivers

#### Windows Installation
1. **Plug in** SecuGen scanner to USB port
2. Windows will try to auto-install drivers
3. If auto-install fails:
   - Download drivers from SecuGen website
   - Run `SecuGen_Driver_Setup.exe`
   - Follow installation wizard
   - Restart computer

4. **Verify Installation**:
   - Open **Device Manager** (Win + X → Device Manager)
   - Look under **Biometric Devices**
   - You should see: "SecuGen Hamster Pro 20"
   - Status should be: "This device is working properly"

#### Linux Installation
```bash
# Download drivers
wget https://www.secugen.com/downloads/SecuGen_Linux_SDK.tar.gz

# Extract
tar -xzf SecuGen_Linux_SDK.tar.gz
cd SecuGen_Linux_SDK

# Install dependencies
sudo apt-get update
sudo apt-get install libusb-1.0-0-dev

# Install driver
sudo ./install.sh

# Add USB permissions
sudo cp 99-secugen.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules

# Restart
sudo reboot
```

#### Mac Installation
1. Download Mac drivers from SecuGen
2. Open `.dmg` file
3. Run installer
4. Grant permissions in **System Preferences** → **Security & Privacy**
5. Restart Mac

---

### Step 3: Install SecuGen Web API Service

#### Windows Installation

1. **Download Web API**:
   - File: `SecuGen_Web_API_Setup.exe`
   - Size: ~50MB

2. **Run Installer**:
   - Double-click `SecuGen_Web_API_Setup.exe`
   - Click "Next" through wizard
   - Choose installation folder (default: `C:\Program Files\SecuGen\WebAPI`)
   - Click "Install"

3. **Start Service**:
   - Service starts automatically after install
   - Or manually:
     - Open **Services** (Win + R → `services.msc`)
     - Find "SecuGen Web API Service"
     - Right-click → Start

4. **Verify Service is Running**:
   ```
   Open browser → http://localhost:8443/sgwebapi/info
   ```
   - Should show JSON with scanner info
   - If you see JSON, service is working! ✅

#### Linux Installation

```bash
# Download Web API
wget https://www.secugen.com/downloads/SecuGen_WebAPI_Linux.tar.gz

# Extract
tar -xzf SecuGen_WebAPI_Linux.tar.gz
cd SecuGen_WebAPI

# Install
sudo ./install.sh

# Start service
sudo systemctl start secugen-webapi
sudo systemctl enable secugen-webapi  # Auto-start on boot

# Check status
sudo systemctl status secugen-webapi

# Test
curl http://localhost:8443/sgwebapi/info
```

#### Mac Installation

```bash
# Download Web API for Mac
# Install from .dmg file

# Start service
sudo launchctl load /Library/LaunchDaemons/com.secugen.webapi.plist

# Test
curl http://localhost:8443/sgwebapi/info
```

---

### Step 4: Test SecuGen Scanner

#### Test 1: Check Device Connection

**Windows**:
1. Open **Device Manager**
2. Expand **Biometric Devices**
3. Look for "SecuGen Hamster Pro 20"
4. Status should be green (working)

**Linux**:
```bash
lsusb | grep SecuGen
# Should show: Bus XXX Device XXX: ID 1162:XXXX SecuGen
```

**Mac**:
```bash
system_profiler SPUSBDataType | grep SecuGen
```

#### Test 2: Check Web API Service

Open browser and go to:
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
      "id": 0,
      "width": 300,
      "height": 400
    }
  ]
}
```

If you see this, Web API is working! ✅

#### Test 3: Capture Test Fingerprint

1. Open: http://localhost:8443/sgwebapi/test
2. Click "Capture Fingerprint"
3. Place finger on scanner
4. LED should light up
5. Image should appear on screen

If image appears, scanner is fully working! ✅

---

### Step 5: Configure Your Application

#### Update .env File

<function_calls>
<invoke name="strReplace">
<parameter name="newStr">NEXT_PUBLIC_API_URL=https://backend-production-a970.up.railway.app/

NEXT_PUBLIC_ESP32_API_URL=http://192.168.1.100/api/vitals

# SecuGen Web API (runs locally on user's machine)
NEXT_PUBLIC_SECUGEN_API_URL=http://localhost:8443

NEXT_PUBLIC_DEBUG=false

NEXT_PUBLIC_DEFAULT_PATIENT_NAME=Patient

NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_SWHipVRDOOPlV9

NEXT_PUBLIC_REPORT_FEE=1